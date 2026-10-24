import { prisma } from '../src/lib/prisma';

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const lines = latestRun.rawLog.split('\n');

  // Find all deal performed lines:
  const dealPerformed = lines.filter(l => l.includes('deal performed'));
  console.log('Total deal performed lines:', dealPerformed.length);
  console.log('Sample 10 deal performed:');
  console.log(dealPerformed.slice(0, 10).join('\n'));

  // Also check if MT5 logs profit on deal lines!
  const profitLines = lines.filter(l => /profit|balance/i.test(l)).slice(0, 20);
  console.log('\nSample profit/balance lines:');
  console.log(profitLines.join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
