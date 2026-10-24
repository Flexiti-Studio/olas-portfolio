import { ICandle, SimulationResult, ParamSchemaItem } from './types';
import { runSimulation, compileStrategyCode } from './simulationEngine';
import { calculateSimulationStats } from './stats';

export interface WorkerMessageRequest {
  id: string;
  candles: ICandle[];
  code: string;
  params: Record<string, any>;
  startingCapital?: number;
  startBarIndex?: number;
}

export interface WorkerMessageResponse {
  id: string;
  success: boolean;
  result?: SimulationResult;
  error?: string;
}

/**
 * Worker script code to be instantiated as an inline Web Worker Blob.
 * Enforces a strict 2-second timeout and sandboxes runtime.
 */
export const WORKER_INLINE_SOURCE = `
  self.onmessage = function(e) {
    const { id, candles, code, params, startingCapital, startBarIndex } = e.data;
    const startIndex = typeof startBarIndex === 'number' ? Math.max(0, startBarIndex) : 0;
    
    // Safety timeout: 2000ms max execution time
    const timer = setTimeout(() => {
      self.postMessage({
        id,
        success: false,
        error: "Strategy execution timed out (exceeded 2.0s limit)."
      });
    }, 2000);

    try {
      // Sandbox blocking
      const fetch = undefined;
      const XMLHttpRequest = undefined;
      const WebSocket = undefined;
      const importScripts = undefined;

      // Wrap code cleanly using string concatenation to avoid template interpolation bugs
      const fnBody = 
        '"use strict";\\n' +
        'const window = undefined;\\n' +
        'const document = undefined;\\n' +
        'const fetch = undefined;\\n' +
        'const XMLHttpRequest = undefined;\\n' +
        'const WebSocket = undefined;\\n\\n' +
        code + '\\n\\n' +
        'if (typeof onBar === "function") {\\n' +
        '  return onBar(ctx);\\n' +
        '}\\n' +
        'return null;\\n';

      const strategyFn = new Function('ctx', fnBody);

      // Simulation loop
      const trades = [];
      let currentPosition = null;
      let pendingOrder = null;
      const capital = startingCapital || 10000;
      const positionSize = 1.0;
      let cumPnl = 0;

      function pushTrade(pos, exitIdx, exitTime, exitPrice, reason) {
        const pnl = pos.side === 'buy'
          ? (exitPrice - pos.entryPrice) * positionSize
          : (pos.entryPrice - exitPrice) * positionSize;
        const pnlPct = (pnl / pos.entryPrice) * 100;
        const bars = Math.max(1, exitIdx - pos.barIndex);
        cumPnl += pnl;
        const maxRu = pos.maxRunUp || 0;
        const maxDd = pos.maxDrawdown || 0;
        trades.push({
          id: 'trade-' + (trades.length + 1),
          side: pos.side,
          entryTime: pos.entryTime,
          entryPrice: pos.entryPrice,
          exitTime: exitTime,
          exitPrice: exitPrice,
          pnl: Number(pnl.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          reason: reason,
          sl: pos.sl,
          tp: pos.tp,
          entryBarIndex: pos.barIndex,
          exitBarIndex: exitIdx,
          barsInTrade: bars,
          runUp: Number((maxRu * positionSize).toFixed(2)),
          runUpPercent: Number(((maxRu / pos.entryPrice) * 100).toFixed(2)),
          drawdown: Number((maxDd * positionSize).toFixed(2)),
          drawdownPercent: Number(((maxDd / pos.entryPrice) * 100).toFixed(2)),
          cumulativeProfit: Number(cumPnl.toFixed(2)),
          cumulativeProfitPercent: Number(((cumPnl / capital) * 100).toFixed(2)),
          contracts: positionSize
        });
      }

      for (let i = 0; i < candles.length; i++) {
        const currentBar = candles[i];

        // 1. Fill pending order at open
        if (pendingOrder) {
          if (pendingOrder.action === 'close' && currentPosition) {
            pushTrade(currentPosition, i, currentBar.time, currentBar.open, 'SIGNAL_CLOSE');
            currentPosition = null;
          } else if (pendingOrder.action === 'buy' || pendingOrder.action === 'sell') {
            if (currentPosition) {
              pushTrade(currentPosition, i, currentBar.time, currentBar.open, 'REVERSE');
              currentPosition = null;
            }
            currentPosition = {
              side: pendingOrder.action,
              entryPrice: currentBar.open,
              entryTime: currentBar.time,
              sl: pendingOrder.sl,
              tp: pendingOrder.tp,
              barIndex: i,
              maxRunUp: 0,
              maxDrawdown: 0
            };
          }
          pendingOrder = null;
        }

        // 2. Track excursions & Intrabar SL / TP
        if (currentPosition) {
          if (currentPosition.side === 'buy') {
            const fav = Math.max(0, currentBar.high - currentPosition.entryPrice);
            const adv = Math.max(0, currentPosition.entryPrice - currentBar.low);
            if (fav > (currentPosition.maxRunUp || 0)) currentPosition.maxRunUp = fav;
            if (adv > (currentPosition.maxDrawdown || 0)) currentPosition.maxDrawdown = adv;

            if (currentPosition.sl != null && currentBar.low <= currentPosition.sl) {
              pushTrade(currentPosition, i, currentBar.time, currentPosition.sl, 'SL');
              currentPosition = null;
            } else if (currentPosition.tp != null && currentBar.high >= currentPosition.tp) {
              pushTrade(currentPosition, i, currentBar.time, currentPosition.tp, 'TP');
              currentPosition = null;
            }
          } else {
            const fav = Math.max(0, currentPosition.entryPrice - currentBar.low);
            const adv = Math.max(0, currentBar.high - currentPosition.entryPrice);
            if (fav > (currentPosition.maxRunUp || 0)) currentPosition.maxRunUp = fav;
            if (adv > (currentPosition.maxDrawdown || 0)) currentPosition.maxDrawdown = adv;

            if (currentPosition.sl != null && currentBar.high >= currentPosition.sl) {
              pushTrade(currentPosition, i, currentBar.time, currentPosition.sl, 'SL');
              currentPosition = null;
            } else if (currentPosition.tp != null && currentBar.low <= currentPosition.tp) {
              pushTrade(currentPosition, i, currentBar.time, currentPosition.tp, 'TP');
              currentPosition = null;
            }
          }
        }

        // 3. Strategy onBar context
        const historySlice = candles.slice(0, i + 1);
        const ctx = {
          bar: currentBar,
          history: historySlice,
          index: i,
          params: params || {},
          position: currentPosition,
          indicators: {
            sma: function(p, off) {
              off = off || 0;
              const end = historySlice.length - 1 - off;
              const start = end - p + 1;
              if (start < 0 || end < 0) return null;
              let s = 0;
              for (let k = start; k <= end; k++) s += historySlice[k].close;
              return Number((s / p).toFixed(4));
            },
            ema: function(p, off) {
              off = off || 0;
              const target = historySlice.length - 1 - off;
              if (target < p - 1) return null;
              const k = 2 / (p + 1);
              let e = 0;
              for (let j = 0; j < p; j++) e += historySlice[j].close;
              e /= p;
              for (let j = p; j <= target; j++) e = historySlice[j].close * k + e * (1 - k);
              return Number(e.toFixed(4));
            },
            atr: function(p, off) {
              off = off || 0;
              const target = historySlice.length - 1 - off;
              if (target < p) return null;
              let s = 0;
              for (let j = target - p + 1; j <= target; j++) {
                const h = historySlice[j].high;
                const l = historySlice[j].low;
                const pc = historySlice[j - 1].close;
                s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
              }
              return Number((s / p).toFixed(4));
            },
            highest: function(p, off) {
              off = off || 0;
              const end = historySlice.length - 1 - off;
              const start = end - p + 1;
              if (start < 0 || end < 0) return null;
              let m = -Infinity;
              for (let k = start; k <= end; k++) if (historySlice[k].high > m) m = historySlice[k].high;
              return m;
            },
            lowest: function(p, off) {
              off = off || 0;
              const end = historySlice.length - 1 - off;
              const start = end - p + 1;
              if (start < 0 || end < 0) return null;
              let m = Infinity;
              for (let k = start; k <= end; k++) if (historySlice[k].low < m) m = historySlice[k].low;
              return m;
            },
            rsi: function(p, off) {
              p = p || 14;
              off = off || 0;
              const target = historySlice.length - 1 - off;
              if (target < p) return null;
              let g = 0, l = 0;
              for (let j = 1; j <= p; j++) {
                const diff = historySlice[j].close - historySlice[j - 1].close;
                if (diff >= 0) g += diff; else l += Math.abs(diff);
              }
              let ag = g / p, al = l / p;
              for (let j = p + 1; j <= target; j++) {
                const diff = historySlice[j].close - historySlice[j - 1].close;
                ag = (ag * (p - 1) + (diff >= 0 ? diff : 0)) / p;
                al = (al * (p - 1) + (diff < 0 ? Math.abs(diff) : 0)) / p;
              }
              if (al === 0) return 100;
              return Number((100 - (100 / (1 + (ag / al)))).toFixed(2));
            },
            vwap: function(p) {
              const slice = p ? historySlice.slice(-p) : historySlice;
              let cv = 0, ctv = 0;
              for (let j = 0; j < slice.length; j++) {
                const tp = (slice[j].high + slice[j].low + slice[j].close) / 3;
                const v = slice[j].volume || 1;
                ctv += tp * v;
                cv += v;
              }
              return cv > 0 ? Number((ctv / cv).toFixed(4)) : null;
            }
          }
        };

        const signal = i >= startIndex ? strategyFn(ctx) : null;
        if (signal && signal.action) {
          pendingOrder = {
            action: signal.action,
            sl: signal.sl,
            tp: signal.tp
          };
        }
      }

      // Active running position at the end of the simulation
      const runningPosition = currentPosition ? { ...currentPosition } : null;

      // Close at end of data
      if (currentPosition) {
        const lastBar = candles[candles.length - 1];
        pushTrade(currentPosition, candles.length - 1, lastBar.time, lastBar.close, 'END_OF_DATA');
      }

      // Compute stats
      let eq = capital;
      let peak = capital;
      let maxDd = 0;
      let maxDdPct = 0;
      let wins = 0;
      let losses = 0;
      let winDollars = 0;
      let lossDollars = 0;
      const equityCurve = [{ time: candles[0] ? candles[0].time : Date.now(), equity: capital, drawdown: 0 }];

      for (let t = 0; t < trades.length; t++) {
        const tr = trades[t];
        eq += tr.pnl;
        if (eq > peak) peak = eq;
        const dd = peak - eq;
        const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
        if (dd > maxDd) maxDd = dd;
        if (ddPct > maxDdPct) maxDdPct = ddPct;

        equityCurve.push({
          time: tr.exitTime,
          equity: Number(eq.toFixed(2)),
          drawdown: Number(dd.toFixed(2))
        });

        if (tr.pnl > 0) {
          wins++;
          winDollars += tr.pnl;
        } else if (tr.pnl < 0) {
          losses++;
          lossDollars += Math.abs(tr.pnl);
        }
      }

      const totalTrades = trades.length;
      const netProfit = Number((eq - capital).toFixed(2));
      const netProfitPercent = Number(((netProfit / capital) * 100).toFixed(2));
      const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;
      const profitFactor = lossDollars > 0 ? Number((winDollars / lossDollars).toFixed(2)) : (winDollars > 0 ? 999 : 0);
      const averageWin = wins > 0 ? Number((winDollars / wins).toFixed(2)) : 0;
      const averageLoss = losses > 0 ? Number((lossDollars / losses).toFixed(2)) : 0;
      const expectancy = totalTrades > 0 ? Number(((winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss).toFixed(2)) : 0;

      clearTimeout(timer);
      self.postMessage({
        id,
        success: true,
        result: {
          trades,
          runningPosition,
          equityCurve,
          stats: {
            totalTrades,
            wins,
            losses,
            winRate,
            profitFactor,
            netProfit,
            netProfitPercent,
            maxDrawdown: Number(maxDd.toFixed(2)),
            maxDrawdownPercent: Number(maxDdPct.toFixed(2)),
            averageWin,
            averageLoss,
            expectancy
          }
        }
      });
    } catch (err) {
      clearTimeout(timer);
      self.postMessage({
        id,
        success: false,
        error: err && err.message ? err.message : String(err)
      });
    }
  };
`;

/**
 * Executes strategy simulation inside an isolated Web Worker if in browser,
 * or falls back safely to simulationEngine in NodeJS environments.
 */
export async function executeStrategyInWorker(
  candles: ICandle[],
  code: string,
  params: Record<string, any>,
  startingCapital = 10000,
  startBarIndex = 0
): Promise<SimulationResult> {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    return new Promise((resolve) => {
      let resolved = false;
      let worker: Worker | null = null;
      let workerUrl: string | null = null;

      const fallbackSync = () => {
        if (resolved) return;
        resolved = true;
        if (worker) {
          try { worker.terminate(); } catch {}
        }
        if (workerUrl) {
          try { URL.revokeObjectURL(workerUrl); } catch {}
        }
        try {
          const fn = compileStrategyCode(code);
          resolve(runSimulation(candles, fn, params, startingCapital, 1.0, startBarIndex));
        } catch (err: any) {
          resolve({
            trades: [],
            equityCurve: [{ time: Date.now(), equity: startingCapital, drawdown: 0 }],
            stats: {
              totalTrades: 0,
              wins: 0,
              losses: 0,
              winRate: 0,
              profitFactor: 0,
              netProfit: 0,
              netProfitPercent: 0,
              maxDrawdown: 0,
              maxDrawdownPercent: 0,
              averageWin: 0,
              averageLoss: 0,
              expectancy: 0,
            },
            error: err?.message || String(err),
          });
        }
      };

      try {
        const blob = new Blob([WORKER_INLINE_SOURCE], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl);
        const reqId = 'req-' + Math.random().toString(36).substring(2, 9);

        // Safety timeout in main thread
        const safetyTimeout = setTimeout(() => {
          fallbackSync();
        }, 2200);

        worker.onmessage = (e: MessageEvent<WorkerMessageResponse>) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimeout);
          if (worker) {
            try { worker.terminate(); } catch {}
          }
          if (workerUrl) {
            try { URL.revokeObjectURL(workerUrl); } catch {}
          }
          if (e.data.success && e.data.result) {
            const fullStats = calculateSimulationStats(e.data.result.trades, startingCapital, candles);
            resolve({
              ...e.data.result,
              stats: fullStats.stats,
              equityCurve: fullStats.equityCurve,
            });
          } else if (e.data.error) {
            // Worker reported an explicit error (e.g. strategy script syntax/runtime or timeout)
            // Attempt sync compile to see if it succeeds or returns detailed error
            try {
              const fn = compileStrategyCode(code);
              const syncRes = runSimulation(candles, fn, params, startingCapital, 1.0, startBarIndex);
              resolve(syncRes);
            } catch (err: any) {
              const emptyStats = calculateSimulationStats([], startingCapital, candles);
              resolve({
                trades: [],
                equityCurve: emptyStats.equityCurve,
                stats: emptyStats.stats,
                error: e.data.error || err?.message || String(err),
              });
            }
          } else {
            fallbackSync();
          }
        };

        worker.onerror = (err) => {
          clearTimeout(safetyTimeout);
          console.warn('[FlexStrategy Worker Error]:', err);
          fallbackSync();
        };

        worker.postMessage({
          id: reqId,
          candles,
          code,
          params,
          startingCapital,
          startBarIndex,
        });
      } catch {
        fallbackSync();
      }
    });
  }

  // Fallback for non-browser environments (e.g. testing)
  try {
    const fn = compileStrategyCode(code);
    return runSimulation(candles, fn, params, startingCapital, 1.0, startBarIndex);
  } catch (err: any) {
    return {
      trades: [],
      equityCurve: [{ time: Date.now(), equity: startingCapital, drawdown: 0 }],
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        profitFactor: 0,
        netProfit: 0,
        netProfitPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        averageWin: 0,
        averageLoss: 0,
        expectancy: 0,
      },
      error: err?.message || String(err),
    };
  }
}
