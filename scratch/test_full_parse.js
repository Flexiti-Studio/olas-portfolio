const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import parseSingleRun from src/lib/ea-lab/parse-log
const { parseSingleRun } = require('../src/lib/ea-lab/parse-log');
const { calculateTradeMetrics } = require('../src/lib/ea-lab/metrics');

async function test() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true, initialDeposit: true, finalBalance: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const rawLog = latestRun.rawLog;

  console.log('Testing with current parseSingleRun...');
  const parsed = parseSingleRun(rawLog);
  console.log('Trades extracted:', parsed.trades.length);
  
  const tradesWithSL = parsed.trades.filter(t => t.sl != null);
  const tradesWithR = parsed.trades.filter(t => t.rMultiple != null);
  const closedTrades = parsed.trades.filter(t => t.closedAt != null);
  const openTrades = parsed.trades.filter(t => t.closedAt == null);

  console.log({
    total: parsed.trades.length,
    withSL: tradesWithSL.length,
    withR: tradesWithR.length,
    closed: closedTrades.length,
    open: openTrades.length,
  });

  const metrics = calculateTradeMetrics(parsed.trades, parsed.initialDeposit, parsed.finalBalance);
  console.log('Current Metrics:', {
    winRate: metrics.winRate,
    winCount: metrics.winCount,
    lossCount: metrics.lossCount,
    breakEvenCount: metrics.breakEvenCount,
    avgR: metrics.avgR,
    profitFactor: metrics.profitFactor,
    netProfit: metrics.netProfit,
  });
}

test().catch(console.error).finally(() => prisma.$disconnect());
