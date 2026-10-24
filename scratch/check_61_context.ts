import { prisma } from '../src/lib/prisma';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const lines = latestRun.rawLog.split('\n');
  const idx = lines.findIndex(l => l.includes('deal #61 sell'));
  console.log('--- Context around deal #61 ---');
  console.log(lines.slice(Math.max(0, idx - 10), idx + 15).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
