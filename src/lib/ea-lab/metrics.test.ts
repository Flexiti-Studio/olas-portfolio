import {
  calculateTradeMetrics,
  aggregateRuns,
  evaluateStrategyVerdict,
  compareVersions,
  TradeLike,
  RunLike,
} from './metrics';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

console.log('--- Running metrics.test.ts ---');

// Test 1: calculateTradeMetrics calculation correctness
{
  console.log('Testing calculateTradeMetrics...');
  const trades: TradeLike[] = [
    { direction: 'buy', lots: 1.0, entry: 100, rMultiple: 2.0, exitReason: 'TP' },
    { direction: 'sell', lots: 1.0, entry: 100, rMultiple: -1.0, exitReason: 'SL' },
    { direction: 'buy', lots: 1.0, entry: 100, rMultiple: -1.0, exitReason: 'SL' },
    { direction: 'buy', lots: 1.0, entry: 100, rMultiple: 3.0, exitReason: 'TP' },
    { direction: 'sell', lots: 1.0, entry: 100, rMultiple: -0.5, exitReason: 'END_OF_TEST' },
  ];

  const m = calculateTradeMetrics(trades, 10000, 10250);

  assertEqual(m.tradesCount, 5, 'Trades count should be 5');
  assertEqual(m.winCount, 2, 'Win count should be 2');
  assertEqual(m.lossCount, 3, 'Loss count should be 3');
  assertEqual(m.winRate, 40.0, 'Win rate should be 40.0%');
  // Total R: 2 - 1 - 1 + 3 - 0.5 = 2.5R
  assertEqual(m.totalR, 2.5, 'Total R should be 2.5');
  // Avg R: 2.5 / 5 = 0.5R
  assertEqual(m.avgR, 0.5, 'Avg R should be 0.5R');
  // Total Pos R = 5.0, Total Neg R = 2.5 -> PF = 5.0 / 2.5 = 2.0
  assertEqual(m.profitFactor, 2.0, 'Profit factor should be 2.0');
  // Max consecutive losses: indices 1 and 2 = 2 losses in a row
  assertEqual(m.maxConsecLosses, 2, 'Max consecutive losses should be 2');
  // Peak R at index 0 = 2.0, then drops to 1.0 then 0.0 (drawdown = 2.0)
  // then jumps to 3.0 (peak = 3.0), then drops to 2.5 (drawdown = 0.5)
  // Max drawdown = 2.0R
  assertEqual(m.maxDrawdownR, 2.0, 'Max drawdown R should be 2.0R');
  assertEqual(m.bestTradeR, 3.0, 'Best trade R should be 3.0');
  assertEqual(m.worstTradeR, -1.0, 'Worst trade R should be -1.0');
  assertEqual(m.exitSplit.TP, 2, 'TP count should be 2');
  assertEqual(m.exitSplit.SL, 2, 'SL count should be 2');
  assertEqual(m.exitSplit.END_OF_TEST, 1, 'END_OF_TEST count should be 1');
}

// Test 2: Heuristics & Verdict rules
{
  console.log('Testing evaluateStrategyVerdict...');

  // Case A: Under 30 trades -> "Not enough data"
  const fewTrades: TradeLike[] = Array.from({ length: 15 }, () => ({
    direction: 'buy',
    lots: 1,
    entry: 100,
    rMultiple: 1.5,
  }));
  const runFew: RunLike = {
    symbol: 'Volatility 75 Index',
    initialDeposit: 10000,
    finalBalance: 11000,
    periodFrom: '2026.01.01 00:00',
    periodTo: '2026.01.10 00:00',
    trades: fewTrades,
  };
  const mFew = aggregateRuns([runFew]);
  const verdictFew = evaluateStrategyVerdict(mFew, [runFew]);
  assertEqual(verdictFew.verdict, 'Not enough data', 'Under 30 trades must be Not enough data');
  assert(verdictFew.warnings.some((w) => w.includes('Small sample size')), 'Must have small sample warning');
  assert(verdictFew.warnings.some((w) => w.includes('Tested on one pair only')), 'Must have one pair warning');
  assert(verdictFew.warnings.some((w) => w.includes('Single date range tested')), 'Must have single date range warning');

  // Case B: >= 30 trades, avgR > 0, PF >= 1.3 -> "Promising"
  // 20 wins of +2R, 15 losses of -1R = 35 trades.
  // totalPos = 40, totalNeg = 15. PF = 40/15 = 2.67. totalR = 25. avgR = 25/35 = +0.71R
  const promisingTrades: TradeLike[] = [
    ...Array.from({ length: 20 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: 2.0, exitReason: 'TP' })),
    ...Array.from({ length: 15 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: -1.0, exitReason: 'SL' })),
  ];
  const runMultiPairs: RunLike[] = [
    {
      symbol: 'Volatility 75 Index',
      initialDeposit: 10000,
      finalBalance: 10500,
      periodFrom: '2026.01.01 00:00',
      periodTo: '2026.01.10 00:00',
      trades: promisingTrades.slice(0, 20),
    },
    {
      symbol: 'Crash 1000 Index',
      initialDeposit: 10000,
      finalBalance: 10300,
      periodFrom: '2026.02.01 00:00',
      periodTo: '2026.02.15 00:00',
      trades: promisingTrades.slice(20),
      errorCount: 1, // trigger Invalid-stops warning
    },
  ];
  const mPromising = aggregateRuns(runMultiPairs);
  const verdictPromising = evaluateStrategyVerdict(mPromising, runMultiPairs);
  assertEqual(verdictPromising.verdict, 'Promising', '35 trades with PF > 1.3 and avgR > 0 must be Promising');
  assert(verdictPromising.warnings.some((w) => w.includes('Invalid-stops')), 'Must warn on Invalid-stops error');

  // Case C: >= 30 trades, negative expectancy -> "Needs work"
  const losingTrades: TradeLike[] = [
    ...Array.from({ length: 10 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: 1.0 })),
    ...Array.from({ length: 25 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: -1.0 })),
  ];
  const runLosing: RunLike = {
    symbol: 'Step Index',
    initialDeposit: 10000,
    finalBalance: 8500,
    trades: losingTrades,
  };
  const mLosing = aggregateRuns([runLosing]);
  const verdictLosing = evaluateStrategyVerdict(mLosing, [runLosing]);
  assertEqual(verdictLosing.verdict, 'Needs work', 'Negative expectancy must be Needs work');
}

// Test 3: Version Comparison (v1 vs v2)
{
  console.log('Testing compareVersions...');
  const v1Runs: RunLike[] = [
    {
      symbol: 'Volatility 75 Index',
      initialDeposit: 10000,
      finalBalance: 10200,
      trades: Array.from({ length: 30 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: 0.1 })),
    },
  ];
  const v2Runs: RunLike[] = [
    {
      symbol: 'Volatility 75 Index',
      initialDeposit: 10000,
      finalBalance: 10800,
      trades: Array.from({ length: 35 }, () => ({ direction: 'buy', lots: 1, entry: 100, rMultiple: 0.8 })),
    },
  ];

  const comparison = compareVersions([
    { id: 'v1', label: 'v1', createdAt: new Date('2026-10-01'), testRuns: v1Runs },
    { id: 'v2', label: 'v2', createdAt: new Date('2026-10-05'), testRuns: v2Runs },
  ]);

  assertEqual(comparison.length, 2, 'Should compare 2 versions');
  assertEqual(comparison[0].label, 'v1', 'First is v1');
  assertEqual(comparison[1].label, 'v2', 'Second is v2');
  assertEqual(comparison[1].deltaNetProfit, 600, 'v2 deltaNetProfit should be 600');
  assert(comparison[1].deltaAvgR! > 0, 'v2 deltaAvgR should be positive');
}

console.log('--- All metrics tests passed successfully! ---');
