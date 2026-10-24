import { CompletedTrade, EquityPoint, SimulationStats, TradeSubsetStats, ICandle } from './types';

/**
  * Helper to compute detailed TradingView metrics for a specific subset of trades (All, Long, Short).
  */
function computeSubsetStats(
  trades: CompletedTrade[],
  startingCapital: number
): TradeSubsetStats {
  const count = trades.length;
  if (count === 0) {
    return {
      netProfit: 0,
      netProfitPercent: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      evenTrades: 0,
      winRate: 0,
      profitFactor: 0,
      avgTrade: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      avgBarsInTrade: 0,
      avgBarsInWin: 0,
      avgBarsInLoss: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      maxRunUp: 0,
      maxRunUpPercent: 0,
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let evenTrades = 0;
  let largestWin = 0;
  let largestLoss = 0;

  let totalBars = 0;
  let totalWinBars = 0;
  let totalLossBars = 0;

  let runningNet = 0;
  let peak = 0;
  let valley = 0;
  let maxDd = 0;
  let maxRunUp = 0;

  for (const t of trades) {
    const pnl = t.pnl;
    runningNet += pnl;

    if (runningNet > peak) peak = runningNet;
    if (runningNet < valley) valley = runningNet;

    const currentDd = peak - runningNet;
    if (currentDd > maxDd) maxDd = currentDd;

    const currentRunUp = runningNet - valley;
    if (currentRunUp > maxRunUp) maxRunUp = currentRunUp;

    const bars = t.barsInTrade ?? 1;
    totalBars += bars;

    if (pnl > 0) {
      winningTrades++;
      grossProfit += pnl;
      totalWinBars += bars;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
      totalLossBars += bars;
      if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
    } else {
      evenTrades++;
    }
  }

  const netProfit = Number((grossProfit - grossLoss).toFixed(2));
  const netProfitPercent = Number(((netProfit / startingCapital) * 100).toFixed(2));
  const winRate = Number(((winningTrades / count) * 100).toFixed(1));
  const profitFactor =
    grossLoss > 0
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
      ? 999.0
      : 0.0;

  const avgTrade = Number((netProfit / count).toFixed(2));
  const avgWin = winningTrades > 0 ? Number((grossProfit / winningTrades).toFixed(2)) : 0;
  const avgLoss = losingTrades > 0 ? Number((grossLoss / losingTrades).toFixed(2)) : 0;
  const winLossRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : avgWin > 0 ? 999.0 : 0;

  const avgBarsInTrade = Number((totalBars / count).toFixed(1));
  const avgBarsInWin = winningTrades > 0 ? Number((totalWinBars / winningTrades).toFixed(1)) : 0;
  const avgBarsInLoss = losingTrades > 0 ? Number((totalLossBars / losingTrades).toFixed(1)) : 0;

  const maxDrawdown = Number(maxDd.toFixed(2));
  const maxDrawdownPercent = Number(((maxDrawdown / (startingCapital + peak)) * 100).toFixed(2));
  const maxRunUpDollar = Number(maxRunUp.toFixed(2));
  const maxRunUpPercent = Number(((maxRunUpDollar / startingCapital) * 100).toFixed(2));

  return {
    netProfit,
    netProfitPercent,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    totalTrades: count,
    winningTrades,
    losingTrades,
    evenTrades,
    winRate,
    profitFactor,
    avgTrade,
    avgWin,
    avgLoss,
    winLossRatio,
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    avgBarsInTrade,
    avgBarsInWin,
    avgBarsInLoss,
    maxDrawdown,
    maxDrawdownPercent,
    maxRunUp: maxRunUpDollar,
    maxRunUpPercent,
  };
}

/**
 * Calculates complete TradingView Strategy Tester performance metrics
 * from simulated trades, starting balance, and optional candles dataset for Buy & Hold.
 */
export function calculateSimulationStats(
  trades: CompletedTrade[],
  startingCapital = 10000,
  candles?: ICandle[]
): { stats: SimulationStats; equityCurve: EquityPoint[] } {
  let runningEquity = startingCapital;
  let peakEquity = startingCapital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurve: EquityPoint[] = [
    {
      time: trades.length > 0 ? trades[0].entryTime : Date.now(),
      equity: startingCapital,
      drawdown: 0,
    },
  ];

  const returns: number[] = [];
  const downsideReturns: number[] = [];

  for (const t of trades) {
    runningEquity += t.pnl;
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }

    const currentDrawdown = peakEquity - runningEquity;
    const currentDrawdownPct = peakEquity > 0 ? (currentDrawdown / peakEquity) * 100 : 0;

    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }
    if (currentDrawdownPct > maxDrawdownPercent) {
      maxDrawdownPercent = currentDrawdownPct;
    }

    equityCurve.push({
      time: t.exitTime,
      equity: Number(runningEquity.toFixed(2)),
      drawdown: Number(currentDrawdown.toFixed(2)),
    });

    const ret = t.pnl / startingCapital;
    returns.push(ret);
    if (ret < 0) {
      downsideReturns.push(ret);
    }
  }

  // Subset breakdowns: All, Long, Short
  const allStats = computeSubsetStats(trades, startingCapital);
  const longTrades = trades.filter((t) => t.side === 'buy');
  const shortTrades = trades.filter((t) => t.side === 'sell');
  const longStats = computeSubsetStats(longTrades, startingCapital);
  const shortStats = computeSubsetStats(shortTrades, startingCapital);

  // Sharpe and Sortino Ratios (per trade annualized approx)
  let sharpeRatio = 0;
  let sortinoRatio = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Number(((mean / stdDev) * Math.sqrt(252)).toFixed(2));
    }

    if (downsideReturns.length > 0) {
      const downVariance =
        downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / downsideReturns.length;
      const downStdDev = Math.sqrt(downVariance);
      if (downStdDev > 0) {
        sortinoRatio = Number(((mean / downStdDev) * Math.sqrt(252)).toFixed(2));
      }
    }
  }

  // Buy & Hold Return benchmark
  let buyAndHoldReturn = 0;
  let buyAndHoldReturnPercent = 0;
  if (candles && candles.length >= 2) {
    const firstClose = candles[0].close;
    const lastClose = candles[candles.length - 1].close;
    if (firstClose > 0) {
      buyAndHoldReturnPercent = Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2));
      buyAndHoldReturn = Number(((startingCapital * buyAndHoldReturnPercent) / 100).toFixed(2));
    }
  }

  const expectancy =
    allStats.totalTrades > 0
      ? Number(
          (
            (allStats.winRate / 100) * allStats.avgWin -
            ((100 - allStats.winRate) / 100) * allStats.avgLoss
          ).toFixed(2)
        )
      : 0;

  return {
    stats: {
      totalTrades: allStats.totalTrades,
      wins: allStats.winningTrades,
      losses: allStats.losingTrades,
      winRate: allStats.winRate,
      profitFactor: allStats.profitFactor,
      netProfit: allStats.netProfit,
      netProfitPercent: allStats.netProfitPercent,
      maxDrawdown: allStats.maxDrawdown,
      maxDrawdownPercent: allStats.maxDrawdownPercent,
      averageWin: allStats.avgWin,
      averageLoss: allStats.avgLoss,
      expectancy,
      // Full TradingView breakdowns
      all: allStats,
      long: longStats,
      short: shortStats,
      buyAndHoldReturn,
      buyAndHoldReturnPercent,
      sharpeRatio,
      sortinoRatio,
    },
    equityCurve,
  };
}
