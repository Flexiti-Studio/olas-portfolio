import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");
  // Setup Bank Account
  let account = await prisma.bankAccount.findFirst();
  if (!account) {
    account = await prisma.bankAccount.create({ data: { name: 'Main Account', balance: 0 } });
  }

  // Setup Income Categories
  const incomes = ['Day Job', 'Qefas Pallative', 'Myra'];
  for (const name of incomes) {
    await prisma.incomeCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // Setup Categories and Subcategories with Goals
  const needs = [
    { name: 'Rent / Mortgage', goal: 0 },
    { name: 'Groceries', goal: 20000 },
    { name: 'Insurance (health, home, car, etc.)', goal: 0 },
    { name: 'Car Payment', goal: 0 },
    { name: 'Gas / Transportation', goal: 20000 },
    { name: 'Minimum Debt Payments', goal: 65400 },
    { name: 'Phone Bill', goal: 0 },
    { name: 'Internet', goal: 16000 },
    { name: 'Electricity', goal: 0 },
    { name: 'Miscellaneous', goal: 5600 }
  ];

  const savings = [
    { name: 'Emergency Fund', goal: 15000 },
    { name: 'Investment accounts (stock conservative)', goal: 15000 },
    { name: 'Workplace retirement', goal: 0 },
    { name: 'Extra debt payments', goal: 10000 },
    { name: 'Downpayment', goal: 0 },
    { name: 'Crypto', goal: 0 },
    { name: 'Risk', goal: 0 },
    { name: 'stocks (individual)', goal: 0 }
  ];

  const wants = [
    { name: 'Clothing', goal: 0 },
    { name: 'Eating out', goal: 0 },
    { name: 'Travel', goal: 0 },
    { name: 'Personal Care', goal: 0 },
    { name: 'Subscriptions', goal: 0 },
    { name: 'Donations', goal: 0 },
    { name: 'Coffees', goal: 0 },
    { name: 'Gym', goal: 0 }
  ];

  // Helper to upsert category and subcategories
  async function seedGroup(groupName: string, dbGroup: 'NEEDS' | 'SAVINGS' | 'WANTS', items: {name: string, goal: number}[]) {
    let cat = await prisma.category.findFirst({ where: { group: dbGroup } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: groupName, group: dbGroup } });
    }
    const subcats = [];
    for (const item of items) {
      let subcat = await prisma.subcategory.findFirst({ where: { name: item.name, categoryId: cat.id } });
      if (!subcat) {
        subcat = await prisma.subcategory.create({ data: { name: item.name, categoryId: cat.id } });
      }
      subcats.push({ id: subcat.id, goal: item.goal });
    }
    return subcats;
  }

  const allNeeds = await seedGroup('Needs', 'NEEDS', needs);
  const allSavings = await seedGroup('Savings & Investments', 'SAVINGS', savings);
  const allWants = await seedGroup('Wants', 'WANTS', wants);

  // Create active period
  const period = await prisma.period.create({
    data: { label: 'July 2026' }
  });

  const allGoals = [...allNeeds, ...allSavings, ...allWants];
  await prisma.budgetGoal.createMany({
    data: allGoals.map(g => ({
      subcategoryId: g.id,
      amount: g.goal,
      periodId: period.id
    }))
  });

  // Seed initial income for the period to match the image
  const dayJobCat = await prisma.incomeCategory.findUnique({ where: { name: 'Day Job' } });
  const qefasCat = await prisma.incomeCategory.findUnique({ where: { name: 'Qefas Pallative' } });
  
  if (dayJobCat && qefasCat) {
    await prisma.income.create({
      data: { amount: 137000, incomeCategoryId: dayJobCat.id, bankAccountId: account.id, createdAt: period.startDate }
    });
    await prisma.income.create({
      data: { amount: 30000, incomeCategoryId: qefasCat.id, bankAccountId: account.id, createdAt: period.startDate }
    });
  }

  // Ensure Strategy is set to 50/20/30
  await prisma.setting.upsert({
    where: { key: "budget_strategy" },
    update: { value: { needs: 50, savings: 20, wants: 30 } },
    create: { key: "budget_strategy", value: { needs: 50, savings: 20, wants: 30 } }
  });

  // Set as Active Period
  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: { activePeriodId: period.id },
    create: { id: "singleton", activePeriodId: period.id }
  });

  console.log("Seeding complete! Period ID:", period.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
