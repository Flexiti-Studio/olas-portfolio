import { parseTesterLog, computeRMultiple, splitLogIntoRuns } from './parse-log';

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

console.log('--- Running parse-log.test.ts ---');

// Test 1: computeRMultiple unit calculations
{
  console.log('Testing computeRMultiple...');
  // BUY: Entry 100, SL 90, TP 120 -> Risk = 10
  // TP Exit at 120 -> +2R
  const buyWin = computeRMultiple('buy', 100, 90, 120);
  assertEqual(buyWin, 2.0, 'Buy TP should be +2.0R');

  // SL Exit at 90 -> -1R
  const buyLoss = computeRMultiple('buy', 100, 90, 90);
  assertEqual(buyLoss, -1.0, 'Buy SL should be -1.0R');

  // SELL: Entry 4942.21, SL 5069.28, Exit 5069.28 -> Risk = 127.07
  const sellLoss = computeRMultiple('sell', 4942.21, 5069.28, 5069.28);
  assertEqual(sellLoss, -1.0, 'Sell SL should be -1.0R');

  // SELL: Exit 4688.08 -> Profit = 254.13, Risk = 127.07 -> +2.0R
  const sellWin = computeRMultiple('sell', 4942.21, 5069.28, 4688.08);
  assertEqual(sellWin, 2.0, 'Sell TP should be +2.0R');
}

// Test 2: Complete Single Run parsing with all sample lines
{
  console.log('Testing parseSingleRun with sample lines...');
  const sampleLog = [
    '2026.10.11 08:00:00.100\t00:00:00\texpert file added: Experts\\OlasBreakout.ex5',
    '2026.10.11 08:00:00.105\t00:00:00\tinitial deposit 10000.00 USD, leverage 1:100',
    '2026.10.11 08:00:00.110\t00:00:00\tVolatility 75 (1s) Index,H1: testing of Experts\\OlasBreakout.ex5 from 2026.10.01 00:00 to 2026.10.10 00:00 started with inputs:',
    '2026.10.11 08:00:00.115\t00:00:00\t  InpRiskPercent=1.0',
    '2026.10.11 08:00:00.120\t00:00:00\t  InpMagicNumber=778899',
    '2026.10.11 08:00:01.000\t2026.10.02 09:00:00\tBREAK detected at 4980.50',
    '2026.10.11 08:00:01.500\t2026.10.02 10:00:00\tRETEST confirmed',
    '2026.10.11 08:00:02.000\t2026.10.02 10:15:00\tSignal skipped: Spread too high',
    '2026.10.11 08:00:02.500\t2026.10.02 11:00:00\tRetest skipped: Out of session',
    '2026.10.11 08:00:03.000\t2026.10.02 12:00:00\tOrderSend failed: 10016 - Invalid stops',
    '2026.10.11 08:00:03.500\t2026.10.02 13:00:00\tOrder failed: market closed',
    // Duplicate Alert line that should be ignored
    '2026.10.11 08:00:04.000\t2026.10.03 04:00:00\tSELL 0.79 lots @ 4942.21 | SL 5069.28 | TP 4688.08 (RetestBO)',
    '2026.10.11 08:00:04.001\t2026.10.03 04:00:00\tAlert: SELL 0.79 lots @ 4942.21 | SL 5069.28 | TP 4688.08 (RetestBO)',
    '2026.10.11 08:00:04.050\t2026.10.03 04:00:00\tCTrade::OrderSend: market sell 0.79 Volatility 75 (1s) Index sl: 5069.28 tp: 4688.08 [done at 4942.21]',
    '2026.10.11 08:00:04.060\t2026.10.03 04:00:00\tdeal #2 sell 0.79 Volatility 75 (1s) Index at 4942.21 done (based on order #2)',
    '2026.10.11 08:00:05.000\t2026.10.03 08:30:00\tstop loss triggered #2 sell 0.79 at 5069.28 [#3 buy 0.79 at 5069.28]',
    // Trade 2: Take profit
    '2026.10.11 08:00:06.000\t2026.10.04 09:00:00\tBUY 0.50 lots @ 4900.00 | SL 4850.00 | TP 5000.00 (TrendFollow)',
    '2026.10.11 08:00:06.010\t2026.10.04 09:00:00\tCTrade::OrderSend: market buy 0.50 Volatility 75 (1s) Index sl: 4850.00 tp: 5000.00 [done at 4900.00]',
    '2026.10.11 08:00:06.020\t2026.10.04 09:00:00\tdeal #6 buy 0.50 Volatility 75 (1s) Index at 4900.00 done',
    '2026.10.11 08:00:07.000\t2026.10.04 15:00:00\ttake profit triggered #6 buy 0.50 at 5000.00 [#7 sell 0.50 at 5000.00]',
    // Trade 3: End of test
    '2026.10.11 08:00:08.000\t2026.10.09 10:00:00\tCTrade::OrderSend: market sell 0.40 Volatility 75 (1s) Index sl: 4900.00 tp: 4500.00 [done at 4800.00]',
    '2026.10.11 08:00:08.010\t2026.10.09 10:00:00\tdeal #14 sell 0.40 Volatility 75 (1s) Index at 4800.00 done',
    '2026.10.11 08:00:09.000\t2026.10.10 00:00:00\tposition closed due end of test at 4780.31 [#15 buy 0.40 at 4780.31]',
    '2026.10.11 08:00:10.000\t00:00:00\tfinal balance 10295.87 USD',
  ].join('\n');

  const runs = parseTesterLog(sampleLog);
  assertEqual(runs.length, 1, 'Should parse exactly 1 run');
  const run = runs[0];

  assertEqual(run.eaFile, 'OlasBreakout.ex5', 'EA file name should be extracted');
  assertEqual(run.symbol, 'Volatility 75 (1s) Index', 'Symbol should match');
  assertEqual(run.timeframe, 'H1', 'Timeframe should match');
  assertEqual(run.periodFrom, '2026.10.01 00:00', 'Period from should match');
  assertEqual(run.periodTo, '2026.10.10 00:00', 'Period to should match');
  assertEqual(run.initialDeposit, 10000.0, 'Initial deposit should be 10000');
  assertEqual(run.currency, 'USD', 'Currency should be USD');
  assertEqual(run.leverage, '1:100', 'Leverage should be 1:100');
  assertEqual(run.finalBalance, 10295.87, 'Final balance should be 10295.87');
  assertEqual(run.netProfit, 295.87, 'Net profit should be 295.87');
  assertEqual(run.inputsJson['InpRiskPercent'], '1.0', 'Input InpRiskPercent should be 1.0');
  assertEqual(run.inputsJson['InpMagicNumber'], '778899', 'Input InpMagicNumber should be 778899');

  assertEqual(run.breakCount, 1, 'Break count should be 1');
  assertEqual(run.retestCount, 1, 'Retest count should be 1');
  assertEqual(run.errorCount, 2, 'Error count should be 2 (Invalid stops & Order failed)');
  assertEqual(run.skipCounts['Signal skipped: Spread too high'], 1, 'Signal skip should be counted');
  assertEqual(run.skipCounts['Retest skipped: Out of session'], 1, 'Retest skip should be counted');

  // Verify trades
  assertEqual(run.trades.length, 3, 'Should have parsed 3 trades');

  // Trade 1: SL
  const t1 = run.trades[0];
  assertEqual(t1.direction, 'sell', 'T1 direction');
  assertEqual(t1.lots, 0.79, 'T1 lots');
  assertEqual(t1.entry, 4942.21, 'T1 entry');
  assertEqual(t1.sl, 5069.28, 'T1 sl');
  assertEqual(t1.tp, 4688.08, 'T1 tp');
  assertEqual(t1.tag, 'RetestBO', 'T1 tag extracted from comment');
  assertEqual(t1.ticket, '2', 'T1 ticket');
  assertEqual(t1.exitPrice, 5069.28, 'T1 exit price');
  assertEqual(t1.exitReason, 'SL', 'T1 exit reason');
  assertEqual(t1.rMultiple, -1.0, 'T1 rMultiple');

  // Trade 2: TP
  const t2 = run.trades[1];
  assertEqual(t2.direction, 'buy', 'T2 direction');
  assertEqual(t2.entry, 4900.0, 'T2 entry');
  assertEqual(t2.sl, 4850.0, 'T2 sl');
  assertEqual(t2.tp, 5000.0, 'T2 tp');
  assertEqual(t2.tag, 'TrendFollow', 'T2 tag');
  assertEqual(t2.ticket, '6', 'T2 ticket');
  assertEqual(t2.exitPrice, 5000.0, 'T2 exit price');
  assertEqual(t2.exitReason, 'TP', 'T2 exit reason');
  assertEqual(t2.rMultiple, 2.0, 'T2 rMultiple');

  // Trade 3: END_OF_TEST
  const t3 = run.trades[2];
  assertEqual(t3.direction, 'sell', 'T3 direction');
  assertEqual(t3.entry, 4800.0, 'T3 entry');
  assertEqual(t3.sl, 4900.0, 'T3 sl');
  assertEqual(t3.exitPrice, 4780.31, 'T3 exit price');
  assertEqual(t3.exitReason, 'END_OF_TEST', 'T3 exit reason');
  // SELL: entry 4800, sl 4900 (risk = 100), exit 4780.31 -> (4800 - 4780.31)/100 = 0.20R
  assertEqual(t3.rMultiple, 0.2, 'T3 rMultiple');
}

// Test 3: Multiple runs pasted together
{
  console.log('Testing splitLogIntoRuns with multiple pasted runs...');
  const multiRunLog = [
    'initial deposit 10000.00 USD, leverage 1:100',
    'Volatility 75 (1s) Index,H1: testing of Experts\\EA1.ex5 from 2026.10.01 00:00 to 2026.10.05 00:00 started with inputs:',
    '  Param=1',
    'final balance 10100.00 USD',
    'initial deposit 10000.00 USD, leverage 1:100',
    'Crash 1000 Index,M15: testing of Experts\\EA2.ex5 from 2026.10.05 00:00 to 2026.10.10 00:00 started with inputs:',
    '  Param=2',
    'final balance 9800.00 USD',
  ].join('\n');

  const splitChunks = splitLogIntoRuns(multiRunLog);
  assertEqual(splitChunks.length, 2, 'Should split into 2 runs');
}

// Test 4: Multi-run parsing with Two Backtests (Rangebreakoutea2 & RangeBreakoutEA-h1)
{
  console.log('Testing multi-run log with Test 1 (Rangebreakoutea2) and Test 2 (RangeBreakoutEA-h1)...');
  const multiRunLog = [
    // ==========================================
    // TEST 1: Rangebreakoutea2 (7 trades, 4 wins, 3 losses, final balance 10295.87)
    // ==========================================
    '2026.10.11 10:50:33.570\texpert file added: Experts\\Rangebreakoutea2.ex5. 77894 bytes loaded',
    '2026.10.11 10:50:33.591\tinitial deposit 10000.00 USD, leverage 1:100',
    '2026.10.11 10:50:33.763\tVolatility 75 (1s) Index,H1: testing of Experts\\Rangebreakoutea2.ex5 from 2026.10.01 00:00 to 2026.10.10 00:00 started with inputs:',
    '2026.10.11 10:50:33.763\t  InpRiskPct=1.0',
    '2026.10.11 10:50:33.763\t  InpRR=2.0',
    // Trade 1 (Loss): Oct 1 01:30 sell 0.79 entry 4942.21 sl 5069.28 tp 4688.08 -> exit 5069.46 (diff = -127.25 * 0.79 = -100.53)
    '2026.10.11 10:50:45.553\t2026.10.01 01:30:00   market sell 0.79 Volatility 75 (1s) Index sl: 5069.28 tp: 4688.08 (4942.21 / 4943.84 / 4942.21)',
    '2026.10.11 10:50:45.553\t2026.10.01 01:30:00   deal #2 sell 0.79 Volatility 75 (1s) Index at 4942.21 done (based on order #2)',
    '2026.10.11 10:50:45.555\t2026.10.01 01:30:00   SELL 0.79 lots @ 4942.21 | SL 5069.28 | TP 4688.08 (RetestBO)',
    '2026.10.11 10:51:04.403\t2026.10.01 03:55:38   stop loss triggered #2 sell 0.79 Volatility 75 (1s) Index 4942.21 sl: 5069.28 tp: 4688.08 [#3 buy 0.79 Volatility 75 (1s) Index at 5069.46]',
    // Trade 2 (Loss): Oct 1 05:00 sell 0.70 entry 5037.55 sl 5179.28 tp 4754.09 -> exit 5179.40 (diff = -141.85 * 0.70 = -99.30)
    '2026.10.11 10:51:12.974\t2026.10.01 05:00:00   market sell 0.70 Volatility 75 (1s) Index sl: 5179.28 tp: 4754.09 (5037.55 / 5039.18 / 5037.55)',
    '2026.10.11 10:51:12.974\t2026.10.01 05:00:00   deal #4 sell 0.7 Volatility 75 (1s) Index at 5037.55 done (based on order #4)',
    '2026.10.11 10:51:12.976\t2026.10.01 05:00:00   SELL 0.70 lots @ 5037.55 | SL 5179.28 | TP 4754.09 (RetestBO)',
    '2026.10.11 10:51:51.428\t2026.10.01 10:15:13   stop loss triggered #4 sell 0.7 Volatility 75 (1s) Index 5037.55 sl: 5179.28 tp: 4754.09 [#5 buy 0.7 Volatility 75 (1s) Index at 5179.40]',
    // Trade 3 (Win): Oct 2 03:00 sell 0.74 entry 5188.83 sl 5322.03 tp 4922.42 -> exit 4922.39 (diff = +266.44 * 0.74 = +197.17)
    '2026.10.11 10:53:09.017\t2026.10.02 03:00:00   market sell 0.74 Volatility 75 (1s) Index sl: 5322.03 tp: 4922.42 (5188.83 / 5190.46 / 5188.83)',
    '2026.10.11 10:53:09.017\t2026.10.02 03:00:00   deal #6 sell 0.74 Volatility 75 (1s) Index at 5188.83 done (based on order #6)',
    '2026.10.11 10:53:09.017\t2026.10.02 03:00:00   SELL 0.74 lots @ 5188.83 | SL 5322.03 | TP 4922.42 (RetestBO)',
    '2026.10.11 10:54:03.643\t2026.10.04 12:53:03   take profit triggered #6 sell 0.74 Volatility 75 (1s) Index 5188.83 sl: 5322.03 tp: 4922.42 [#7 buy 0.74 Volatility 75 (1s) Index at 4922.39]',
    // Trade 4 (Loss): Oct 4 12:55 sell 0.39 entry 4916.53 sl 5175.64 tp 4398.31 -> exit 5176.22 (diff = -259.69 * 0.39 = -101.28)
    '2026.10.11 10:54:03.678\t2026.10.04 12:55:00   market sell 0.39 Volatility 75 (1s) Index sl: 5175.64 tp: 4398.31 (4916.53 / 4918.16 / 4916.53)',
    '2026.10.11 10:54:03.678\t2026.10.04 12:55:00   deal #8 sell 0.39 Volatility 75 (1s) Index at 4916.53 done (based on order #8)',
    '2026.10.11 10:54:03.678\t2026.10.04 12:55:00   SELL 0.39 lots @ 4916.53 | SL 5175.64 | TP 4398.31 (RangeBO)',
    '2026.10.11 10:55:10.100\t2026.10.06 01:20:00   stop loss triggered #8 sell 0.39 Volatility 75 (1s) Index 4916.53 sl: 5175.64 tp: 4398.31 [#9 buy 0.39 Volatility 75 (1s) Index at 5176.22]',
    // Trade 5 (Win): Oct 8 23:15 sell 0.97 entry 4800.00 sl 4903.00 tp 4596.00 -> exit 4595.95 (diff = +204.05 * 0.97 = +197.93)
    '2026.10.11 10:56:00.000\t2026.10.08 23:15:00   market sell 0.97 Volatility 75 (1s) Index sl: 4903.00 tp: 4596.00 (4800.00 / 4801.00 / 4800.00)',
    '2026.10.11 10:56:00.010\t2026.10.08 23:15:00   deal #10 sell 0.97 Volatility 75 (1s) Index at 4800.00 done (based on order #10)',
    '2026.10.11 10:56:00.020\t2026.10.08 23:15:00   SELL 0.97 lots @ 4800.00 | SL 4903.00 | TP 4596.00 (RetestBO)',
    '2026.10.11 10:56:30.000\t2026.10.09 02:00:00   take profit triggered #10 sell 0.97 Volatility 75 (1s) Index 4800.00 sl: 4903.00 tp: 4596.00 [#11 buy 0.97 Volatility 75 (1s) Index at 4595.95]',
    // Trade 6 (Win): Oct 9 06:30 sell 0.93 entry 4700.00 sl 4808.00 tp 4482.00 -> exit 4482.12 (diff = +217.88 * 0.93 = +202.63)
    '2026.10.11 10:57:00.000\t2026.10.09 06:30:00   market sell 0.93 Volatility 75 (1s) Index sl: 4808.00 tp: 4482.00 (4700.00 / 4701.00 / 4700.00)',
    '2026.10.11 10:57:00.010\t2026.10.09 06:30:00   deal #12 sell 0.93 Volatility 75 (1s) Index at 4700.00 done (based on order #12)',
    '2026.10.11 10:57:00.020\t2026.10.09 06:30:00   SELL 0.93 lots @ 4700.00 | SL 4808.00 | TP 4482.00 (RetestBO)',
    '2026.10.11 10:57:40.000\t2026.10.09 11:15:00   take profit triggered #12 sell 0.93 Volatility 75 (1s) Index 4700.00 sl: 4808.00 tp: 4482.00 [#13 buy 0.93 Volatility 75 (1s) Index at 4482.12]',
    // Trade 7 (Win/End of test): Oct 9 13:25 sell 0.21 entry 4600.00 sl 4800.00 tp 4200.00 -> closed end of test at 4589.05 (diff = +10.95 * 0.21 = +2.30)
    '2026.10.11 10:58:00.000\t2026.10.09 13:25:00   market sell 0.21 Volatility 75 (1s) Index sl: 4800.00 tp: 4200.00 (4600.00 / 4601.00 / 4600.00)',
    '2026.10.11 10:58:00.010\t2026.10.09 13:25:00   deal #14 sell 0.21 Volatility 75 (1s) Index at 4600.00 done (based on order #14)',
    '2026.10.11 10:58:00.020\t2026.10.09 13:25:00   SELL 0.21 lots @ 4600.00 | SL 4800.00 | TP 4200.00 (RangeBO)',
    '2026.10.11 10:59:00.000\t2026.10.10 00:00:00   position closed due end of test at 4589.05 [#14 sell 0.21]',
    '2026.10.11 10:59:00.100\t00:00:00\tfinal balance 10295.87 USD',

    // ==========================================
    // TEST 2: RangeBreakoutEA-h1 (11 trades, 7 wins, 4 losses, final balance 11037.59)
    // ==========================================
    '2026.10.11 11:30:00.000\texpert file added: Experts\\RangeBreakoutEA-h1.ex5. 81200 bytes loaded',
    '2026.10.11 11:30:00.010\tinitial deposit 10000.00 USD, leverage 1:100',
    '2026.10.11 11:30:00.020\tVolatility 75 (1s) Index,H1: testing of Experts\\RangeBreakoutEA-h1.ex5 from 2026.10.01 00:00 to 2026.10.10 00:00 started with inputs:',
    '2026.10.11 11:30:00.025\t  InpRiskPct=1.0',
    // 1. Oct 1 03:45 Buy 1.93 @ 4900.00 -> TP @ 5004.00 (+200.72)
    '2026.10.11 11:31:00.000\t2026.10.01 03:45:00   market buy 1.93 Volatility 75 (1s) Index sl: 4848.00 tp: 5004.00',
    '2026.10.11 11:31:00.010\t2026.10.01 03:45:00   deal #20 buy 1.93 Volatility 75 (1s) Index at 4900.00 done',
    '2026.10.11 11:31:30.000\t2026.10.01 06:00:00   take profit triggered #20 buy 1.93 at 5004.00 [#21 sell 1.93 at 5004.00]',
    // 2. Oct 1 08:00 Buy 2.49 @ 4950.00 -> TP @ 5032.00 (+204.18)
    '2026.10.11 11:32:00.000\t2026.10.01 08:00:00   deal #22 buy 2.49 Volatility 75 (1s) Index at 4950.00 done',
    '2026.10.11 11:32:30.000\t2026.10.01 12:00:00   take profit triggered #22 buy 2.49 at 5032.00 [#23 sell 2.49 at 5032.01]',
    // 3. Oct 2 21:15 Sell 2.63 @ 5100.00 -> TP @ 5020.95 (+207.90)
    '2026.10.11 11:33:00.000\t2026.10.02 21:15:00   deal #24 sell 2.63 Volatility 75 (1s) Index at 5100.00 done',
    '2026.10.11 11:33:30.000\t2026.10.03 01:00:00   take profit triggered #24 sell 2.63 at 5021.00 [#25 buy 2.63 at 5020.95]',
    // 4. Oct 4 11:45 Sell 3.90 @ 5050.00 -> SL @ 5077.46 (-107.09)
    '2026.10.11 11:34:00.000\t2026.10.04 11:45:00   deal #26 sell 3.90 Volatility 75 (1s) Index at 5050.00 done',
    '2026.10.11 11:34:30.000\t2026.10.04 14:00:00   stop loss triggered #26 sell 3.90 at 5077.00 [#27 buy 3.90 at 5077.46]',
    // 5. Oct 5 02:15 Sell 2.35 @ 4980.00 -> SL @ 5025.28 (-106.41)
    '2026.10.11 11:35:00.000\t2026.10.05 02:15:00   deal #28 sell 2.35 Volatility 75 (1s) Index at 4980.00 done',
    '2026.10.11 11:35:30.000\t2026.10.05 06:00:00   stop loss triggered #28 sell 2.35 at 5025.00 [#29 buy 2.35 at 5025.28]',
    // 6. Oct 6 01:15 Buy 4.20 @ 4850.00 -> TP @ 4899.93 (+209.71)
    '2026.10.11 11:36:00.000\t2026.10.06 01:15:00   deal #30 buy 4.20 Volatility 75 (1s) Index at 4850.00 done',
    '2026.10.11 11:36:30.000\t2026.10.06 05:00:00   take profit triggered #30 buy 4.20 at 4900.00 [#31 sell 4.20 at 4899.93]',
    // 7. Oct 6 13:15 Buy 3.10 @ 4920.00 -> TP @ 4988.90 (+213.59)
    '2026.10.11 11:37:00.000\t2026.10.06 13:15:00   deal #32 buy 3.10 Volatility 75 (1s) Index at 4920.00 done',
    '2026.10.11 11:37:30.000\t2026.10.06 17:00:00   take profit triggered #32 buy 3.10 at 4989.00 [#33 sell 3.10 at 4988.90]',
    // 8. Oct 6 20:15 Sell 2.06 @ 5120.00 -> SL @ 5173.06 (-109.30)
    '2026.10.11 11:38:00.000\t2026.10.06 20:15:00   deal #34 sell 2.06 Volatility 75 (1s) Index at 5120.00 done',
    '2026.10.11 11:38:30.000\t2026.10.06 23:00:00   stop loss triggered #34 sell 2.06 at 5173.00 [#35 buy 2.06 at 5173.06]',
    // 9. Oct 7 07:15 Buy 5.14 @ 4880.00 -> TP @ 4922.35 (+217.68)
    '2026.10.11 11:39:00.000\t2026.10.07 07:15:00   deal #36 buy 5.14 Volatility 75 (1s) Index at 4880.00 done',
    '2026.10.11 11:39:30.000\t2026.10.07 10:00:00   take profit triggered #36 buy 5.14 at 4922.00 [#37 sell 5.14 at 4922.35]',
    // 10. Oct 9 02:45 Buy 2.00 @ 4910.00 -> SL @ 4855.30 (-109.40)
    '2026.10.11 11:40:00.000\t2026.10.09 02:45:00   deal #38 buy 2.00 Volatility 75 (1s) Index at 4910.00 done',
    '2026.10.11 11:40:30.000\t2026.10.09 05:00:00   stop loss triggered #38 buy 2.00 at 4855.00 [#39 sell 2.00 at 4855.30]',
    // 11. Oct 9 14:00 Buy 3.00 @ 4930.00 -> TP @ 5001.9967 (+215.99)
    '2026.10.11 11:41:00.000\t2026.10.09 14:00:00   deal #40 buy 3.00 Volatility 75 (1s) Index at 4930.00 done',
    '2026.10.11 11:41:30.000\t2026.10.09 18:00:00   take profit triggered #40 buy 3.00 at 5002.00 [#41 sell 3.00 at 5001.9967]',
    '2026.10.11 11:42:00.000\t00:00:00\tfinal balance 11037.59 USD',
  ].join('\n');

  const runs = parseTesterLog(multiRunLog);
  assertEqual(runs.length, 2, 'Should parse exactly 2 distinct test runs');

  // Verify TEST 1
  const run1 = runs[0];
  assertEqual(run1.eaFile, 'Rangebreakoutea2.ex5', 'Test 1 EA');
  assertEqual(run1.trades.length, 7, 'Test 1 trade count');
  const wins1 = run1.trades.filter((t) => (t.profit ?? 0) > 0).length;
  const losses1 = run1.trades.filter((t) => (t.profit ?? 0) < 0).length;
  assertEqual(wins1, 4, 'Test 1 wins');
  assertEqual(losses1, 3, 'Test 1 losses');
  assertEqual(run1.initialDeposit, 10000.0, 'Test 1 Initial deposit');
  assertEqual(run1.finalBalance, 10295.87, 'Test 1 Final balance');
  assertEqual(run1.netProfit, 295.87, 'Test 1 Net profit');
  // Reconciliation difference is ~$2.93 (-$2.93 between broker balance and trade sum)
  assert(Math.abs(run1.reconciliationDiff) < 5.0, `Test 1 reconciliation diff should be ~2.93, got ${run1.reconciliationDiff}`);

  // Verify TEST 2
  const run2 = runs[1];
  assertEqual(run2.eaFile, 'RangeBreakoutEA-h1.ex5', 'Test 2 EA');
  assertEqual(run2.trades.length, 11, 'Test 2 trade count');
  const wins2 = run2.trades.filter((t) => (t.profit ?? 0) > 0).length;
  const losses2 = run2.trades.filter((t) => (t.profit ?? 0) < 0).length;
  assertEqual(wins2, 7, 'Test 2 wins');
  assertEqual(losses2, 4, 'Test 2 losses');
  assertEqual(run2.initialDeposit, 10000.0, 'Test 2 Initial deposit');
  assertEqual(run2.finalBalance, 11037.59, 'Test 2 Final balance');
  assertEqual(run2.netProfit, 1037.59, 'Test 2 Net profit');
  assertEqual(run2.tradeProfitSum, 1037.59, 'Test 2 tradeProfitSum should exactly equal 1037.59');
  assertEqual(run2.reconciliationDiff, 0.0, 'Test 2 reconciliation diff should be exactly 0.0');
}

console.log('--- All parse-log tests passed successfully! ---');


