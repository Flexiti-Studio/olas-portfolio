import { prisma } from '../src/lib/prisma';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const lines = latestRun.rawLog.split('\n');
  const pos59Lines = lines.filter(l => l.includes('#59') || l.includes(' 59 '));
  console.log('--- Lines mentioning #59 ---');
  console.log(pos59Lines.join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
