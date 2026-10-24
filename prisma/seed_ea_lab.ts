import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { parseTesterLog } from '../src/lib/ea-lab/parse-log';
import { calculateTradeMetrics } from '../src/lib/ea-lab/metrics';
import { getLagosDateKey } from '../src/lib/ea-lab/timezone';

const prisma = new PrismaClient();

const SAMPLE_LOG_LINES = [
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
  '2026.10.11 08:00:08.000\t2026.10.09 10:00:00\tSELL 0.40 lots @ 4800.00 | SL 4900.00 | TP 4500.00 (MomentumCont)',
  '2026.10.11 08:00:08.010\t2026.10.09 10:00:00\tCTrade::OrderSend: market sell 0.40 Volatility 75 (1s) Index sl: 4900.00 tp: 4500.00 [done at 4800.00]',
  '2026.10.11 08:00:08.020\t2026.10.09 10:00:00\tdeal #14 sell 0.40 Volatility 75 (1s) Index at 4800.00 done',
  '2026.10.11 08:00:09.000\t2026.10.10 00:00:00\tposition closed due end of test at 4780.31 [#15 buy 0.40 at 4780.31]',
  '2026.10.11 08:00:10.000\t00:00:00\tfinal balance 10295.87 USD',
].join('\n');

const SAMPLE_MQL5_CODE = `//+------------------------------------------------------------------+
//|                                                 OlasBreakout.mq5 |
//|                                  Copyright 2026, Flexiti Studio  |
//+------------------------------------------------------------------+
#property copyright "Flexiti Studio"
#property link      "https://github.com/flexiti-studio"
#property version   "1.00"
#include <Trade\\Trade.mqh>

input double InpRiskPercent = 1.0;      // Risk percent per trade
input ulong  InpMagicNumber = 778899;   // Magic Number
input int    InpAtrPeriod   = 14;       // ATR Period for Stop Loss

CTrade trade;

int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   Print("OlasBreakout EA Initialized successfully.");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   Print("OlasBreakout EA Deinitialized.");
}

void OnTick()
{
   // Core breakout and retest logic
}
`;

async function main() {
  console.log('Seeding EA Lab with sample MT5 Strategy Tester backtest data...');

  // 1. Create or upsert strategy
  let strategy = await prisma.eaStrategy.findFirst({
    where: { name: 'Olas Breakout EA' },
  });

  if (!strategy) {
    strategy = await prisma.eaStrategy.create({
      data: {
        name: 'Olas Breakout EA',
        description:
          'High-probability breakout and retest Expert Advisor for synthetic indices and forex pairs. Trades London and NY momentum with dynamic ATR stop loss.',
      },
    });
    console.log(`Created strategy: ${strategy.name} (${strategy.id})`);
  } else {
    console.log(`Found existing strategy: ${strategy.name} (${strategy.id})`);
  }

  // 2. Create or upsert version v1
  const codeHash = crypto.createHash('sha256').update(SAMPLE_MQL5_CODE).digest('hex');
  let version = await prisma.eaVersion.findFirst({
    where: {
      strategyId: strategy.id,
      label: 'v1',
    },
  });

  if (!version) {
    version = await prisma.eaVersion.create({
      data: {
        strategyId: strategy.id,
        label: 'v1',
        code: SAMPLE_MQL5_CODE,
        codeHash,
        changeNotes: 'Initial release: Breakout + retest structure detection with fixed 2R target and ATR stop loss.',
      },
    });
    console.log(`Created version: ${version.label} (${version.id})`);
  } else {
    console.log(`Found existing version: ${version.label} (${version.id})`);
  }

  // 3. Parse the sample log
  const parsedRuns = parseTesterLog(SAMPLE_LOG_LINES);
  if (parsedRuns.length === 0) {
    throw new Error('Failed to parse sample log lines');
  }

  const parsed = parsedRuns[0];
  const testedAt = new Date(); // current time in Lagos local zone
  const metrics = calculateTradeMetrics(parsed.trades, parsed.initialDeposit, parsed.finalBalance);

  // 4. Save test run and trades inside a transaction
  const testRun = await prisma.$transaction(async (tx) => {
    const run = await tx.eaTestRun.create({
      data: {
        strategyId: strategy.id,
        versionId: version.id,
        testedAt,
        symbol: parsed.symbol,
        timeframe: parsed.timeframe,
        periodFrom: parsed.periodFrom ? new Date(parsed.periodFrom.replace(/\./g, '-')) : null,
        periodTo: parsed.periodTo ? new Date(parsed.periodTo.replace(/\./g, '-')) : null,
        initialDeposit: parsed.initialDeposit,
        currency: parsed.currency,
        leverage: parsed.leverage,
        finalBalance: parsed.finalBalance,
        inputsJson: parsed.inputsJson,
        rawLog: SAMPLE_LOG_LINES,
        journal:
          'Sample Run 1: Verified retest entry on Volatility 75 (1s) Index. Trade #2 hit SL due to early wick spike (-1.0R). Trade #6 hit clean 2R take profit (+2.0R). Trade #14 closed at tester end with +0.2R profit.',
        netProfit: metrics.netProfit,
        returnPct: metrics.returnPct,
        tradesCount: metrics.tradesCount,
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        avgR: metrics.avgR,
        maxDrawdownR: metrics.maxDrawdownR,
        maxConsecLosses: metrics.maxConsecLosses,
        tpCount: metrics.exitSplit.TP,
        slCount: metrics.exitSplit.SL,
        errorCount: parsed.errorCount,
        breakCount: parsed.breakCount,
        retestCount: parsed.retestCount,
        skipCounts: parsed.skipCounts,
      },
    });

    if (parsed.trades.length > 0) {
      await tx.eaTrade.createMany({
        data: parsed.trades.map((t) => ({
          testRunId: run.id,
          ticket: t.ticket || null,
          openedAt: t.openedAt ? new Date(t.openedAt.replace(/\./g, '-')) : null,
          closedAt: t.closedAt ? new Date(t.closedAt.replace(/\./g, '-')) : null,
          direction: t.direction,
          lots: t.lots,
          entry: t.entry,
          sl: t.sl,
          tp: t.tp,
          exitPrice: t.exitPrice,
          exitReason: t.exitReason,
          tag: t.tag,
          rMultiple: t.rMultiple,
          profit: t.rMultiple != null ? Number((t.rMultiple * 100).toFixed(2)) : null,
        })),
      });
    }

    return run;
  });

  console.log(`Saved test run: ${testRun.id} on ${testRun.symbol} with ${parsed.trades.length} trades.`);

  // 5. Add Day Journal
  const dateKey = getLagosDateKey(testedAt);
  await prisma.eaDayJournal.upsert({
    where: {
      strategyId_date: {
        strategyId: strategy.id,
        date: dateKey,
      },
    },
    update: {},
    create: {
      strategyId: strategy.id,
      date: dateKey,
      notes:
        'Ran baseline backtests on Volatility 75 (1s) Index H1. Confirmed that the retest confirmation filter successfully avoided 2 false breaks, though one stop-loss error was logged due to broker minimum stop distances.',
    },
  });
  console.log(`Upserted day journal for date ${dateKey}`);

  // 6. Add Pair Note
  await prisma.eaPairNote.upsert({
    where: {
      strategyId_symbol: {
        strategyId: strategy.id,
        symbol: parsed.symbol,
      },
    },
    update: {},
    create: {
      strategyId: strategy.id,
      symbol: parsed.symbol,
      notes:
        'Stops level: 25.0 points. Average spread: 18-24 points. Minimum lot: 0.05. Quirks: High slippage during midnight rollover; recommend expanding stop buffer by 1.2x to prevent 10016 Invalid stops errors.',
    },
  });
  console.log(`Upserted pair note for ${parsed.symbol}`);

  console.log('EA Lab database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
