const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const inc = await prisma.income.findMany();
  const incCat = await prisma.incomeCategory.findMany();
  const settings = await prisma.setting.findMany();
  const accounts = await prisma.bankAccount.findMany();
  console.log({
    incomes: inc,
    incomeCategories: incCat,
    settings: settings.filter(s => s.key.includes('income') || s.key.includes('tx')),
    accounts
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
