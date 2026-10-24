import { EA_HEURISTICS, EaHeuristicsConfig, StrategyVerdict, VerdictStatus } from './heuristics';

export interface TradeLike {
  id?: string;
  ticket?: string | null;
  openedAt?: Date | string | null;
  closedAt?: Date | string | null;
  direction: string;
  lots: number;
  entry: number;
  sl?: number | null;
  tp?: number | null;
  exitPrice?: number | null;
  exitReason?: string | null;
  tag?: string | null;
  rMultiple?: number | null;
  profit?: number | null;
}

export interface RunLike {
  id?: string;
  strategyId?: string;
  versionId?: string;
  testedAt?: Date | string;
  symbol: string;
  timeframe?: string | null;
  periodFrom?: Date | string | null;
  periodTo?: Date | string | null;
  initialDeposit: number;
  currency?: string;
  leverage?: string | null;
  finalBalance: number;
  netProfit?: number;
  returnPct?: number;
  tradesCount?: number;
  winRate?: number;
  profitFactor?: number;
  avgR?: number;
  errorCount?: number;
  breakCount?: number;
  retestCount?: number;
  skipCounts?: Record<string, number> | any;
  inputsJson?: Record<string, any> | any;
  journal?: string | null;
  rawLog?: string;
  trades?: TradeLike[];
}

export interface TradeMetrics {
  tradesCount: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  winRate: number; // 0 - 100%
  netProfit: number;
  returnPct: number;
  totalR: number;
  avgR: number; // Expectancy in R
  profitFactor: number;
  avgWinR: number;
  avgLossR: number;
  bestTradeR: number;
  worstTradeR: number;
  maxConsecLosses: number;
  maxDrawdownR: number;
  exitSplit: {
    TP: number;
    SL: number;
    END_OF_TEST: number;
    OTHER: number;
  };
  cumulativeRCurve: {
    index: number;
    tradeId?: string;
    date?: string;
    rMultiple: number;
    cumulativeR: number;
    drawdown: number;
  }[];
}

export interface AggregatedMetrics extends TradeMetrics {
  totalRuns: number;
  skipBreakdown: Record<string, number>;
  totalErrors: number;
  totalBreaks: number;
  totalRetests: number;
  initialDeposit: number;
  finalBalance: number;
}

/**
 * Deterministically computes trading performance metrics for an array of trades.
 */
export function calculateTradeMetrics(
  trades: TradeLike[],
  initialDeposit = 10000,
  finalBalance = 10000
): TradeMetrics {
  const tradesCount = trades.length;
  if (tradesCount === 0) {
    const netProfit = Number((finalBalance - initialDeposit).toFixed(2));
    const returnPct = initialDeposit > 0 ? Number(((netProfit / initialDeposit) * 100).toFixed(2)) : 0;
    return {
      tradesCount: 0,
      winCount: 0,
      lossCount: 0,
      breakEvenCount: 0,
      winRate: 0,
      netProfit,
      returnPct,
      totalR: 0,
      avgR: 0,
      profitFactor: 0,
      avgWinR: 0,
      avgLossR: 0,
      bestTradeR: 0,
      worstTradeR: 0,
      maxConsecLosses: 0,
      maxDrawdownR: 0,
      exitSplit: { TP: 0, SL: 0, END_OF_TEST: 0, OTHER: 0 },
      cumulativeRCurve: [],
    };
  }

  let winCount = 0;
  let lossCount = 0;
  let breakEvenCount = 0;
  let totalPositiveR = 0;
  let totalNegativeR = 0;
  let totalR = 0;

  let bestTradeR = -Infinity;
  let worstTradeR = Infinity;

  let currentConsecLosses = 0;
  let maxConsecLosses = 0;

  const exitSplit = {
    TP: 0,
    SL: 0,
    END_OF_TEST: 0,
    OTHER: 0,
  };

  const cumulativeRCurve: TradeMetrics['cumulativeRCurve'] = [];
  let runningR = 0;
  let peakR = 0;
  let maxDrawdownR = 0;

  // Baseline 1R risk estimation for fallback when explicit stop loss wasn't captured in MT5 log
  const lossProfits = trades
    .filter((t) => t.profit != null && t.profit < -0.01)
    .map((t) => Math.abs(t.profit!));
  let estimated1RRisk = initialDeposit * 0.01; // default 1%
  if (lossProfits.length > 0) {
    const sorted = [...lossProfits].sort((a, b) => a - b);
    const medianLoss = sorted[Math.floor(sorted.length / 2)];
    if (medianLoss > 0.01) {
      estimated1RRisk = medianLoss;
    }
  }

  trades.forEach((trade, idx) => {
    let r = trade.rMultiple;
    if (r == null || isNaN(r)) {
      if (trade.profit != null && !isNaN(trade.profit) && estimated1RRisk > 0) {
        r = Number((trade.profit / estimated1RRisk).toFixed(2));
      } else {
        r = 0;
      }
    }

    totalR += r;
    runningR = Number((runningR + r).toFixed(2));

    if (runningR > peakR) {
      peakR = runningR;
    }
    const currentDrawdown = Number((peakR - runningR).toFixed(2));
    if (currentDrawdown > maxDrawdownR) {
      maxDrawdownR = currentDrawdown;
    }

    cumulativeRCurve.push({
      index: idx + 1,
      tradeId: trade.id || trade.ticket || `trade-${idx + 1}`,
      date: trade.closedAt ? String(trade.closedAt) : trade.openedAt ? String(trade.openedAt) : undefined,
      rMultiple: r,
      cumulativeR: runningR,
      drawdown: currentDrawdown,
    });

    const hasProfit = trade.profit != null && !isNaN(trade.profit);
    const isWin = r > 0.0001 || (hasProfit && trade.profit! > 0.01);
    const isLoss = r < -0.0001 || (hasProfit && trade.profit! < -0.01);

    if (isWin) {
      winCount++;
      totalPositiveR += Math.max(r, 0);
      currentConsecLosses = 0;
    } else if (isLoss) {
      lossCount++;
      totalNegativeR += Math.abs(Math.min(r, 0));
      currentConsecLosses++;
      if (currentConsecLosses > maxConsecLosses) {
        maxConsecLosses = currentConsecLosses;
      }
    } else {
      breakEvenCount++;
      currentConsecLosses = 0;
    }

    if (r > bestTradeR) bestTradeR = r;
    if (r < worstTradeR) worstTradeR = r;

    // Exit reason split
    const reason = (trade.exitReason || 'OTHER').toUpperCase();
    if (reason === 'TP' || reason === 'TRAILING') exitSplit.TP++;
    else if (reason === 'SL') exitSplit.SL++;
    else if (reason === 'END_OF_TEST') exitSplit.END_OF_TEST++;
    else exitSplit.OTHER++;
  });

  if (bestTradeR === -Infinity) bestTradeR = 0;
  if (worstTradeR === Infinity) worstTradeR = 0;

  const winRate = Number(((winCount / tradesCount) * 100).toFixed(1));
  const avgR = Number((totalR / tradesCount).toFixed(2));
  const avgWinR = winCount > 0 ? Number((totalPositiveR / winCount).toFixed(2)) : 0;
  const avgLossR = lossCount > 0 ? Number((-totalNegativeR / lossCount).toFixed(2)) : 0;

  let profitFactor = 0;
  if (totalNegativeR > 0.0001) {
    profitFactor = Number((totalPositiveR / totalNegativeR).toFixed(2));
  } else if (totalPositiveR > 0.0001) {
    profitFactor = 99.99; // Cap for visual consistency
  }

  const netProfit = Number((finalBalance - initialDeposit).toFixed(2));
  const returnPct = initialDeposit > 0 ? Number(((netProfit / initialDeposit) * 100).toFixed(2)) : 0;

  return {
    tradesCount,
    winCount,
    lossCount,
    breakEvenCount,
    winRate,
    netProfit,
    returnPct,
    totalR: Number(totalR.toFixed(2)),
    avgR,
    profitFactor,
    avgWinR,
    avgLossR,
    bestTradeR: Number(bestTradeR.toFixed(2)),
    worstTradeR: Number(worstTradeR.toFixed(2)),
    maxConsecLosses,
    maxDrawdownR,
    exitSplit,
    cumulativeRCurve,
  };
}

/**
 * Aggregates a list of test runs (e.g. per strategy, per version, per day, per pair, or overall).
 */
export function aggregateRuns(runs: RunLike[]): AggregatedMetrics {
  const allTrades: TradeLike[] = [];
  let sumInitialDeposit = 0;
  let sumFinalBalance = 0;
  let totalErrors = 0;
  let totalBreaks = 0;
  let totalRetests = 0;
  const skipBreakdown: Record<string, number> = {};

  runs.forEach((run) => {
    sumInitialDeposit += run.initialDeposit || 10000;
    sumFinalBalance += run.finalBalance || 10000;
    totalErrors += run.errorCount || 0;
    totalBreaks += run.breakCount || 0;
    totalRetests += run.retestCount || 0;

    if (run.skipCounts) {
      const counts = typeof run.skipCounts === 'string' ? JSON.parse(run.skipCounts) : run.skipCounts;
      for (const [key, val] of Object.entries(counts)) {
        skipBreakdown[key] = (skipBreakdown[key] || 0) + (typeof val === 'number' ? val : 0);
      }
    }

    if (run.trades && run.trades.length > 0) {
      allTrades.push(...run.trades);
    }
  });

  const baseMetrics = calculateTradeMetrics(allTrades, sumInitialDeposit, sumFinalBalance);

  return {
    ...baseMetrics,
    totalRuns: runs.length,
    skipBreakdown,
    totalErrors,
    totalBreaks,
    totalRetests,
    initialDeposit: sumInitialDeposit,
    finalBalance: sumFinalBalance,
  };
}

/**
 * Evaluates strategy verdict and warnings against editable heuristics.
 */
export function evaluateStrategyVerdict(
  metrics: AggregatedMetrics,
  runs: RunLike[],
  heuristics: EaHeuristicsConfig = EA_HEURISTICS
): StrategyVerdict {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let verdict: VerdictStatus = 'Needs work';

  // 1. Verdict check
  if (metrics.tradesCount < heuristics.minTradesForVerdict) {
    verdict = 'Not enough data';
    reasons.push(
      `Only ${metrics.tradesCount} trades recorded (minimum ${heuristics.minTradesForVerdict} trades required for evaluation).`
    );
  } else if (
    metrics.avgR > heuristics.promisingExpectancyMin &&
    metrics.profitFactor >= heuristics.promisingProfitFactorMin
  ) {
    verdict = 'Promising';
    reasons.push(`Positive expectancy of +${metrics.avgR}R per trade.`);
    reasons.push(
      `Profit Factor is ${metrics.profitFactor} (exceeds the ${heuristics.promisingProfitFactorMin} threshold).`
    );
    reasons.push(`Solid statistical base with ${metrics.tradesCount} completed trades.`);
  } else {
    verdict = 'Needs work';
    if (metrics.avgR <= heuristics.promisingExpectancyMin) {
      reasons.push(`Expectancy is non-positive (${metrics.avgR}R per trade).`);
    }
    if (metrics.profitFactor < heuristics.promisingProfitFactorMin) {
      reasons.push(
        `Profit Factor (${metrics.profitFactor}) is below the required ${heuristics.promisingProfitFactorMin} benchmark.`
      );
    }
  }

  // 2. Mandatory warnings
  // Warning: small sample
  if (metrics.tradesCount < heuristics.smallSampleWarningThreshold) {
    warnings.push(
      `Small sample size: Backtest has only ${metrics.tradesCount} trades (< ${heuristics.smallSampleWarningThreshold}). Results may not be statistically significant.`
    );
  }

  // Warning: only one date range tested
  if (runs.length > 0) {
    const dateRanges = new Set(
      runs
        .map((r) => {
          const from = r.periodFrom ? String(r.periodFrom).slice(0, 10) : '';
          const to = r.periodTo ? String(r.periodTo).slice(0, 10) : '';
          return `${from} to ${to}`;
        })
        .filter((s) => s.length > 6)
    );
    if (dateRanges.size === 1) {
      const singleRange = Array.from(dateRanges)[0];
      warnings.push(
        `Single date range tested (${singleRange}). High risk of curve-fitting to a single market regime.`
      );
    }
  }

  // Warning: results from one pair only
  const uniqueSymbols = new Set(runs.map((r) => r.symbol).filter(Boolean));
  if (uniqueSymbols.size === 1) {
    const singlePair = Array.from(uniqueSymbols)[0];
    warnings.push(
      `Tested on one pair only (${singlePair}). The EA setup has not been validated across diverse asset volatility regimes.`
    );
  }

  // Warning: Invalid-stops errors present
  if (metrics.totalErrors > 0) {
    warnings.push(
      `Invalid-stops / execution errors present (${metrics.totalErrors} errors detected). Check broker minimum stop levels and spread buffers.`
    );
  }

  return {
    verdict,
    reasons,
    warnings,
  };
}

export interface VersionComparisonRow {
  versionId: string;
  label: string;
  createdAt: Date | string;
  runsCount: number;
  tradesCount: number;
  winRate: number;
  avgR: number;
  profitFactor: number;
  netProfit: number;
  returnPct: number;
  maxDrawdownR: number;
  verdict: VerdictStatus;
  // Differences compared to baseline/previous
  deltaWinRate?: number;
  deltaAvgR?: number;
  deltaProfitFactor?: number;
  deltaNetProfit?: number;
}

/**
 * Builds version comparison table (e.g. v1 vs v2).
 */
export function compareVersions(
  versionsWithRuns: {
    id: string;
    label: string;
    createdAt: Date | string;
    testRuns: RunLike[];
  }[]
): VersionComparisonRow[] {
  // Sort versions by creation date asc
  const sorted = [...versionsWithRuns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const rows: VersionComparisonRow[] = [];

  sorted.forEach((v, idx) => {
    const metrics = aggregateRuns(v.testRuns);
    const { verdict } = evaluateStrategyVerdict(metrics, v.testRuns);

    const prevRow = idx > 0 ? rows[idx - 1] : null;

    rows.push({
      versionId: v.id,
      label: v.label,
      createdAt: v.createdAt,
      runsCount: v.testRuns.length,
      tradesCount: metrics.tradesCount,
      winRate: metrics.winRate,
      avgR: metrics.avgR,
      profitFactor: metrics.profitFactor,
      netProfit: metrics.netProfit,
      returnPct: metrics.returnPct,
      maxDrawdownR: metrics.maxDrawdownR,
      verdict,
      deltaWinRate: prevRow ? Number((metrics.winRate - prevRow.winRate).toFixed(1)) : undefined,
      deltaAvgR: prevRow ? Number((metrics.avgR - prevRow.avgR).toFixed(2)) : undefined,
      deltaProfitFactor: prevRow ? Number((metrics.profitFactor - prevRow.profitFactor).toFixed(2)) : undefined,
      deltaNetProfit: prevRow ? Number((metrics.netProfit - prevRow.netProfit).toFixed(2)) : undefined,
    });
  });

  return rows;
}
