import { prisma } from '../src/lib/prisma';
import { parseTesterLog } from '../src/lib/ea-lab/parse-log';
import { calculateTradeMetrics } from '../src/lib/ea-lab/metrics';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, rawLog: true, initialDeposit: true, finalBalance: true },
  });

  if (!latestRun || !latestRun.rawLog) {
    console.log('No run found with rawLog');
    return;
  }

  console.log('Parsing rawLog for run:', latestRun.id);
  const parsedRuns = parseTesterLog(latestRun.rawLog);
  console.log('Parsed runs count:', parsedRuns.length);

  const run = parsedRuns[0];
  console.log('Symbol:', run.symbol);
  console.log('Initial Deposit:', run.initialDeposit);
  console.log('Final Balance:', run.finalBalance);
  console.log('Trades extracted:', run.trades.length);

  const metrics = calculateTradeMetrics(run.trades, run.initialDeposit, run.finalBalance);
  console.log('--- Recalculated Trade Metrics ---');
  console.log('Trades Count:', metrics.tradesCount);
  console.log('Win Count:', metrics.winCount);
  console.log('Loss Count:', metrics.lossCount);
  console.log('Breakeven Count:', metrics.breakEvenCount);
  console.log('Win Rate %:', metrics.winRate + '%');
  console.log('Avg R (Expectancy):', metrics.avgR + 'R');
  console.log('Profit Factor:', metrics.profitFactor);
  console.log('Net Profit:', metrics.netProfit);
  console.log('Return %:', metrics.returnPct + '%');
  console.log('Max Drawdown:', metrics.maxDrawdownR + 'R');
  console.log('Consecutive Losses:', metrics.maxConsecLosses);
  console.log('Exit Split:', metrics.exitSplit);
}

main().catch(console.error).finally(() => prisma.$disconnect());
