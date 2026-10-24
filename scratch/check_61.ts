import { prisma } from '../src/lib/prisma';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const lines = latestRun.rawLog.split('\n');
  const pos61Lines = lines.filter(l => l.includes('#61'));
  console.log('--- Lines mentioning #61 ---');
  console.log(pos61Lines.join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
