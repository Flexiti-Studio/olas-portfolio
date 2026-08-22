const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding financial history...');
  
  // Base starting values
  let currentNetWorth = 250000;
  let currentIncome = 120000;
  
  const historyData = [];
  const now = new Date();
  
  // Generate 12 months of historical data
  for (let i = 12; i >= 1; i--) {
    const date = new Date(now);
    date.setMonth(now.getMonth() - i);
    
    // Add some random growth/variation
    currentNetWorth += (Math.random() * 50000);
    if (i % 3 === 0) {
      currentIncome += (Math.random() * 20000); // Income bumps every quarter
    }
    
    historyData.push({
      netWorth: Math.round(currentNetWorth),
      monthlyIncome: Math.round(currentIncome),
      created_at: date,
    });
  }

  // Also add a very recent one (a few days ago)
  const recent = new Date(now);
  recent.setDate(now.getDate() - 5);
  historyData.push({
    netWorth: Math.round(currentNetWorth + 15000),
    monthlyIncome: Math.round(currentIncome),
    created_at: recent,
  });

  await prisma.financialHistory.createMany({
    data: historyData
  });

  console.log('Successfully seeded 13 history records.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
