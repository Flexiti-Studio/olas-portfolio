// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.activePeriodId) {
    console.error("No active period");
    return;
  }
  const periodId = config.activePeriodId;

  // Clear existing incomes
  await prisma.income.deleteMany({});
  
  // Create Incomes
  const incomes = [
    { name: "Day Job", amount: 137000 },
    { name: "Qefas Pallative", amount: 30000 },
    { name: "Myra", amount: 0 }
  ];

  let unallocatedBank = await prisma.bankAccount.findFirst({ where: { name: "Cash / Default" } });
  if (!unallocatedBank) {
    unallocatedBank = await prisma.bankAccount.create({ data: { name: "Cash / Default", balance: 0 } });
  }

  for (const inc of incomes) {
    if (inc.amount === 0) continue;
    let cat = await prisma.incomeCategory.findFirst({ where: { name: inc.name } });
    if (!cat) cat = await prisma.incomeCategory.create({ data: { name: inc.name } });
    
    await prisma.income.create({
      data: {
        amount: inc.amount,
        incomeCategoryId: cat.id,
        bankAccountId: unallocatedBank.id
      }
    });
  }

  // Update balances
  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  await prisma.bankAccount.update({
    where: { id: unallocatedBank.id },
    data: { balance: { increment: totalInc } }
  });

  // Data to populate subcategories and goals
  const subcatGoals = [
    // NEEDS
    { group: "NEEDS", name: "Rent / Mortgage", goal: 0 },
    { group: "NEEDS", name: "Groceries", goal: 20000 },
    { group: "NEEDS", name: "Insurance", goal: 0 },
    { group: "NEEDS", name: "Car Payment", goal: 0 },
    { group: "NEEDS", name: "Gas / Transportation", goal: 20000 },
    { group: "NEEDS", name: "Minimum Debt Payments", goal: 65400 },
    { group: "NEEDS", name: "Phone Bill", goal: 0 },
    { group: "NEEDS", name: "Internet", goal: 16000 },
    { group: "NEEDS", name: "Electricity", goal: 0 },
    { group: "NEEDS", name: "Miscellaneous", goal: 5600 },

    // SAVINGS
    { group: "SAVINGS", name: "Emergency Fund", goal: 15000 },
    { group: "SAVINGS", name: "Investment accounts (stock conservative)", goal: 15000 },
    { group: "SAVINGS", name: "Workplace retirement", goal: 0 },
    { group: "SAVINGS", name: "Extra debt payments", goal: 10000 },
    { group: "SAVINGS", name: "Downpayment", goal: 0 },
    { group: "SAVINGS", name: "Crypto", goal: 0 },
    { group: "SAVINGS", name: "Risk", goal: 0 },
    { group: "SAVINGS", name: "stocks (individual)", goal: 0 },

    // WANTS
    { group: "WANTS", name: "Clothing", goal: 0 },
    { group: "WANTS", name: "Eating out", goal: 0 },
    { group: "WANTS", name: "Travel", goal: 0 },
    { group: "WANTS", name: "Personal Care", goal: 0 },
    { group: "WANTS", name: "Subscriptions", goal: 0 },
    { group: "WANTS", name: "Donations", goal: 0 },
    { group: "WANTS", name: "Coffees", goal: 0 },
    { group: "WANTS", name: "Miscellaneous Wants", goal: 0 },
    { group: "WANTS", name: "Gym", goal: 0 },
  ];

  // Get or Create categories for the groups
  const groupCatMap: any = {};
  for (const g of ["NEEDS", "SAVINGS", "WANTS"]) {
    let cat = await prisma.category.findFirst({ where: { group: g } });
    if (!cat) cat = await prisma.category.create({ data: { name: g, group: g } });
    groupCatMap[g] = cat.id;
  }

  for (const item of subcatGoals) {
    const categoryId = groupCatMap[item.group];
    
    // Find or create subcategory
    let sub = await prisma.subcategory.findFirst({ where: { name: item.name } });
    if (!sub) {
      sub = await prisma.subcategory.create({ data: { name: item.name, categoryId } });
    } else {
       // Make sure it's in the right category
       await prisma.subcategory.update({ where: { id: sub.id }, data: { categoryId } });
    }

    // Set Goal
    const existingGoal = await prisma.budgetGoal.findFirst({ where: { subcategoryId: sub.id, periodId } });
    if (existingGoal) {
      await prisma.budgetGoal.update({ where: { id: existingGoal.id }, data: { amount: item.goal, percentage: null } });
    } else {
      await prisma.budgetGoal.create({ data: { subcategoryId: sub.id, periodId, amount: item.goal, percentage: null } });
    }
  }

  console.log("Done seeding!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
