const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;

  const lines = latestRun.rawLog.split('\n');
  const pos8Lines = lines.filter(l => l.includes('#8') || l.includes('position #8'));
  console.log('--- Lines mentioning #8 ---');
  console.log(pos8Lines.join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
