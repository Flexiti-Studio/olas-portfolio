const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      trades: {
        take: 10,
      },
    },
  });

  if (!latestRun) {
    console.log('No test runs found.');
    return;
  }

  console.log('Latest Run ID:', latestRun.id);
  console.log('Symbol:', latestRun.symbol);
  console.log('Initial Deposit:', latestRun.initialDeposit);
  console.log('Final Balance:', latestRun.finalBalance);
  console.log('Net Profit:', latestRun.netProfit);
  console.log('Trades Count in Run record:', latestRun.tradesCount);
  console.log('Trades in DB:', await prisma.eaTrade.count({ where: { testRunId: latestRun.id } }));
  console.log('Sample Trades (first 5):');
  console.log(JSON.stringify(latestRun.trades.slice(0, 5), null, 2));

  // Check how many trades have null rMultiple or null profit or null exitPrice
  const trades = await prisma.eaTrade.findMany({
    where: { testRunId: latestRun.id },
    select: {
      direction: true,
      entry: true,
      exitPrice: true,
      sl: true,
      tp: true,
      profit: true,
      rMultiple: true,
      exitReason: true,
    },
  });

  let nullR = 0;
  let zeroR = 0;
  let nullProfit = 0;
  let positiveProfit = 0;
  let negativeProfit = 0;
  let nullExit = 0;
  let nullSl = 0;

  for (const t of trades) {
    if (t.rMultiple == null) nullR++;
    else if (t.rMultiple === 0) zeroR++;
    if (t.profit == null) nullProfit++;
    else if (t.profit > 0) positiveProfit++;
    else if (t.profit < 0) negativeProfit++;
    if (t.exitPrice == null) nullExit++;
    if (t.sl == null) nullSl++;
  }

  console.log({
    totalTrades: trades.length,
    nullR,
    zeroR,
    nullProfit,
    positiveProfit,
    negativeProfit,
    nullExit,
    nullSl,
  });

  if (latestRun.rawLog) {
    console.log('\n--- First 30 lines of rawLog ---');
    console.log(latestRun.rawLog.split('\n').slice(0, 30).join('\n'));
    console.log('\n--- Sample deal / order lines from rawLog ---');
    const orderLines = latestRun.rawLog.split('\n').filter(l => /deal|order|market|stop loss|take profit/i.test(l)).slice(0, 20);
    console.log(orderLines.join('\n'));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
