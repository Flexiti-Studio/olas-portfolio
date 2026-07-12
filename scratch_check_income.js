const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const inc = await prisma.income.findMany({ include: { incomeCategory: true } });
  console.log(JSON.stringify(inc, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
