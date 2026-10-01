const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const total = await p.mT5Trade.count();
  const liveCount = await p.mT5Trade.count({ where: { closeTime: null } });
  const live1970Count = await p.mT5Trade.count({ 
    where: { closeTime: { lt: new Date('1971-01-01') } } 
  });
  const sample = await p.mT5Trade.findMany({ take: 3, orderBy: { ingestedAt: 'desc' } });

  console.log('Total trades:', total);
  console.log('Live (closeTime = null):', liveCount);
  console.log('Live (closeTime in 1970):', live1970Count);
  console.log('Most recent trades:', JSON.stringify(sample, null, 2));
  
  await p.$disconnect();
}

main().catch(console.error);
