import { prisma } from '../src/lib/prisma';
import { parseTesterLog } from '../src/lib/ea-lab/parse-log';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;

  const parsedRuns = parseTesterLog(latestRun.rawLog);
  const run = parsedRuns[0];

  console.log('Top 10 Wins by Profit:');
  const wins = run.trades.filter(t => (t.profit || 0) > 0).sort((a, b) => (b.profit || 0) - (a.profit || 0));
  console.log(wins.slice(0, 10).map(t => ({
    ticket: t.ticket,
    lots: t.lots,
    entry: t.entry,
    sl: t.sl,
    exit: t.exitPrice,
    r: t.rMultiple,
    profit: t.profit,
  })));

  console.log('\nTop 10 Losses:');
  const losses = run.trades.filter(t => (t.profit || 0) < 0).sort((a, b) => (a.profit || 0) - (b.profit || 0));
  console.log(losses.slice(0, 10).map(t => ({
    ticket: t.ticket,
    lots: t.lots,
    entry: t.entry,
    sl: t.sl,
    exit: t.exitPrice,
    r: t.rMultiple,
    profit: t.profit,
  })));

  let sumWinProfit = wins.reduce((acc, t) => acc + (t.profit || 0), 0);
  let sumLossProfit = losses.reduce((acc, t) => acc + (t.profit || 0), 0);
  console.log('\nSum Win Profit:', sumWinProfit);
  console.log('Sum Loss Profit:', sumLossProfit);
  console.log('Net Sum:', sumWinProfit + sumLossProfit);
}

main().catch(console.error).finally(() => prisma.$disconnect());
