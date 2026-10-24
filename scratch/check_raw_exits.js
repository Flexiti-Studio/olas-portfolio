const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;

  const lines = latestRun.rawLog.split('\n');
  console.log('Total lines:', lines.length);

  // Find all lines containing "close" or "triggered" or "deal"
  const exitLines = lines.filter(l => 
    /stop loss|take profit|closed|trailing|modify|CTrade/i.test(l)
  ).slice(0, 50);

  console.log('--- Sample Exit / Order Lines ---');
  console.log(exitLines.slice(0, 40).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
