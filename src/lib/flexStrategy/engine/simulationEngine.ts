import {
  ICandle,
  ActivePosition,
  CompletedTrade,
  SimulationResult,
  StrategyContext,
  TradeOrderSignal,
} from './types';
import {
  calculateSma,
  calculateEma,
  calculateAtr,
  calculateRsi,
  calculateHighest,
  calculateLowest,
  calculateVwap,
} from './indicators';
import { calculateSimulationStats } from './stats';

/**
 * Runs a strategy bar-by-bar against a candle sequence.
 * - Fills orders at next bar open (TradingView standard).
 * - Tracks intra-trade Run-up (MFE) and Drawdown (MAE).
 * - Handles intrabar SL and TP evaluation against bar High/Low.
 * - Records bars in trade, cumulative profit, and aggregates full TradingView statistics.
 */
export function runSimulation(
  candles: ICandle[],
  strategyFn: (ctx: StrategyContext) => TradeOrderSignal | null,
  params: Record<string, any> = {},
  startingCapital = 10000,
  positionSize = 1.0, // e.g. 1 lot or 1 contract
  startBarIndex = 0
): SimulationResult {
  if (!candles || candles.length < 2) {
    const { stats, equityCurve } = calculateSimulationStats([], startingCapital, candles);
    return {
      trades: [],
      equityCurve,
      stats,
    };
  }

  const trades: CompletedTrade[] = [];
  let currentPosition: ActivePosition | null = null;
  let pendingOrder: {
    action: 'buy' | 'sell' | 'close';
    sl?: number | null;
    tp?: number | null;
  } | null = null;

  let cumulativePnl = 0;

  const pushCompletedTrade = (
    pos: ActivePosition,
    exitBarIndex: number,
    exitTime: number,
    exitPrice: number,
    reason: CompletedTrade['reason']
  ) => {
    const pnl =
      pos.side === 'buy'
        ? (exitPrice - pos.entryPrice) * positionSize
        : (pos.entryPrice - exitPrice) * positionSize;
    const pnlPct = (pnl / pos.entryPrice) * 100;
    const barsInTrade = Math.max(1, exitBarIndex - pos.barIndex);

    cumulativePnl += pnl;
    const cumulativeProfit = Number(cumulativePnl.toFixed(2));
    const cumulativeProfitPercent = Number(((cumulativePnl / startingCapital) * 100).toFixed(2));

    const maxRunUp = pos.maxRunUp ?? 0;
    const maxDrawdown = pos.maxDrawdown ?? 0;

    trades.push({
      id: `trade-${trades.length + 1}`,
      side: pos.side,
      entryTime: pos.entryTime,
      entryPrice: pos.entryPrice,
      exitTime,
      exitPrice,
      sl: pos.sl,
      tp: pos.tp,
      pnl: Number(pnl.toFixed(2)),
      pnlPercent: Number(pnlPct.toFixed(2)),
      reason,
      entryBarIndex: pos.barIndex,
      exitBarIndex,
      barsInTrade,
      runUp: Number((maxRunUp * positionSize).toFixed(2)),
      runUpPercent: Number(((maxRunUp / pos.entryPrice) * 100).toFixed(2)),
      drawdown: Number((maxDrawdown * positionSize).toFixed(2)),
      drawdownPercent: Number(((maxDrawdown / pos.entryPrice) * 100).toFixed(2)),
      cumulativeProfit,
      cumulativeProfitPercent,
      contracts: positionSize,
    });
  };

  for (let i = 0; i < candles.length; i++) {
    const currentBar = candles[i];

    // 1. If we have a pending order from previous bar's onBar signal, fill it at currentBar.open
    if (pendingOrder) {
      if (pendingOrder.action === 'close' && currentPosition) {
        // Close position at open
        pushCompletedTrade(currentPosition, i, currentBar.time, currentBar.open, 'SIGNAL_CLOSE');
        currentPosition = null;
      } else if (pendingOrder.action === 'buy' || pendingOrder.action === 'sell') {
        // If already in opposite position, close it first at open
        if (currentPosition) {
          pushCompletedTrade(currentPosition, i, currentBar.time, currentBar.open, 'REVERSE');
          currentPosition = null;
        }

        // Open new position
        currentPosition = {
          side: pendingOrder.action,
          entryPrice: currentBar.open,
          entryTime: currentBar.time,
          sl: pendingOrder.sl,
          tp: pendingOrder.tp,
          barIndex: i,
          maxRunUp: 0,
          maxDrawdown: 0,
        };
      }
      pendingOrder = null;
    }

    // 2. Track excursions (MFE and MAE) and check Intrabar SL / TP for active position
    if (currentPosition) {
      if (currentPosition.side === 'buy') {
        const favorable = Math.max(0, currentBar.high - currentPosition.entryPrice);
        const adverse = Math.max(0, currentPosition.entryPrice - currentBar.low);
        if (favorable > (currentPosition.maxRunUp ?? 0)) currentPosition.maxRunUp = favorable;
        if (adverse > (currentPosition.maxDrawdown ?? 0)) currentPosition.maxDrawdown = adverse;

        // Buy SL hit?
        if (currentPosition.sl != null && currentBar.low <= currentPosition.sl) {
          pushCompletedTrade(currentPosition, i, currentBar.time, currentPosition.sl, 'SL');
          currentPosition = null;
        }
        // Buy TP hit?
        else if (currentPosition.tp != null && currentBar.high >= currentPosition.tp) {
          pushCompletedTrade(currentPosition, i, currentBar.time, currentPosition.tp, 'TP');
          currentPosition = null;
        }
      } else {
        const favorable = Math.max(0, currentPosition.entryPrice - currentBar.low);
        const adverse = Math.max(0, currentBar.high - currentPosition.entryPrice);
        if (favorable > (currentPosition.maxRunUp ?? 0)) currentPosition.maxRunUp = favorable;
        if (adverse > (currentPosition.maxDrawdown ?? 0)) currentPosition.maxDrawdown = adverse;

        // Sell SL hit?
        if (currentPosition.sl != null && currentBar.high >= currentPosition.sl) {
          pushCompletedTrade(currentPosition, i, currentBar.time, currentPosition.sl, 'SL');
          currentPosition = null;
        }
        // Sell TP hit?
        else if (currentPosition.tp != null && currentBar.low <= currentPosition.tp) {
          pushCompletedTrade(currentPosition, i, currentBar.time, currentPosition.tp, 'TP');
          currentPosition = null;
        }
      }
    }

    // 3. Prepare strategy context and execute onBar for the completed current bar
    const historySlice = candles.slice(0, i + 1);
    const ctx: StrategyContext = {
      bar: currentBar,
      history: historySlice,
      index: i,
      params,
      position: currentPosition,
      indicators: {
        sma: (period: number, offset = 0) => calculateSma(historySlice, period, offset),
        ema: (period: number, offset = 0) => calculateEma(historySlice, period, offset),
        atr: (period: number, offset = 0) => calculateAtr(historySlice, period, offset),
        rsi: (period = 14, offset = 0) => calculateRsi(historySlice, period, offset),
        highest: (period: number, offset = 0) => calculateHighest(historySlice, period, offset),
        lowest: (period: number, offset = 0) => calculateLowest(historySlice, period, offset),
        vwap: (period?: number) => calculateVwap(historySlice, period),
      },
    };

    let signal: TradeOrderSignal | null = null;
    // Only invoke strategy signals once warmup reached startBarIndex
    if (i >= startBarIndex) {
      try {
        signal = strategyFn(ctx);
      } catch (err: any) {
        return {
          trades,
          equityCurve: [],
          stats: calculateSimulationStats(trades, startingCapital, candles).stats,
          error: `Strategy runtime error on bar ${i}: ${err?.message || String(err)}`,
        };
      }
    }

    // Queue signal for execution on the next bar open
    if (signal && signal.action) {
      pendingOrder = {
        action: signal.action,
        sl: signal.sl,
        tp: signal.tp,
      };
    }
  }

  // Active running position at the end of the simulation
  const runningPosition = currentPosition ? { ...currentPosition } : null;

  // 4. Close any open position at the final candle's close for stats
  if (currentPosition) {
    const lastBar = candles[candles.length - 1];
    pushCompletedTrade(
      currentPosition,
      candles.length - 1,
      lastBar.time,
      lastBar.close,
      'END_OF_DATA'
    );
  }

  const { stats, equityCurve } = calculateSimulationStats(trades, startingCapital, candles);
  return {
    trades,
    equityCurve,
    stats,
    runningPosition,
  };
}

/**
 * Compiles a raw string JavaScript function into a callable onBar function.
 * Restricts access to dangerous globals via strict arguments isolation.
 */
export function compileStrategyCode(
  codeString: string
): (ctx: StrategyContext) => TradeOrderSignal | null {
  // Wrap in an IIFE returning the onBar function
  const cleanCode = codeString.trim();
  const functionBody = `
    "use strict";
    const window = undefined;
    const document = undefined;
    const fetch = undefined;
    const XMLHttpRequest = undefined;
    const WebSocket = undefined;
    const localStorage = undefined;
    const sessionStorage = undefined;

    ${cleanCode}

    if (typeof onBar === 'function') {
      return onBar(ctx);
    }
    return null;
  `;

  const runner = new Function('ctx', functionBody);
  return (ctx: StrategyContext) => {
    return runner(ctx);
  };
}
