import { prisma } from "@/lib/prisma";

export async function autoBalanceCurrentPeriod() {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  const activePeriodId = config?.activePeriodId;
  
  if (!activePeriodId) return false;

  const period = await prisma.period.findUnique({ where: { id: activePeriodId } });
  if (!period) return false;

  const nextPeriod = await prisma.period.findFirst({
    where: { startDate: { gt: period.startDate } },
    orderBy: { startDate: 'asc' }
  });
  const endDate = nextPeriod ? nextPeriod.startDate : new Date('2100-01-01');

  // Calculate total income
  const periodIncomes = await prisma.income.findMany({
    where: { createdAt: { gte: period.startDate, lt: endDate } }
  });
  
  let totalIncome = Number(period.rolloverAmount) || 0;
  for (const inc of periodIncomes) {
    totalIncome += Number(inc.amount);
  }

  // Get strategy
  const strategySetting = await prisma.setting.findUnique({ where: { key: "budget_strategy" } });
  const strategy = strategySetting ? (strategySetting.value as any) : { needs: 50, savings: 20, wants: 30 };

  const idealAmounts = {
    NEEDS: totalIncome * (strategy.needs / 100),
    SAVINGS: totalIncome * (strategy.savings / 100),
    WANTS: totalIncome * (strategy.wants / 100)
  };

  const allCategories = await prisma.category.findMany({ include: { subcategories: true } });
  const currentGoals = await prisma.budgetGoal.findMany({ where: { periodId: activePeriodId } });

  await prisma.$transaction(async (tx) => {
    for (const groupKey of ["NEEDS", "SAVINGS", "WANTS"] as const) {
      const groupCategories = allCategories.filter(c => c.group === groupKey);
      const subcatIds = groupCategories.flatMap(c => c.subcategories.map(s => s.id));
      
      const groupGoals = currentGoals.filter(g => subcatIds.includes(g.subcategoryId));
      const currentGroupTotal = groupGoals.reduce((sum, g) => sum + Number(g.amount), 0);
      
      const idealForGroup = idealAmounts[groupKey];

      if (groupGoals.length === 0) {
        if (subcatIds.length > 0) {
          const equalShare = idealForGroup / subcatIds.length;
          await tx.budgetGoal.createMany({
            data: subcatIds.map(id => ({
              periodId: activePeriodId,
              subcategoryId: id,
              amount: equalShare
            }))
          });
        }
      } else {
        for (const goal of groupGoals) {
          const currentAmount = Number(goal.amount);
          let newAmount = 0;
          
          if (currentGroupTotal === 0) {
             newAmount = idealForGroup / groupGoals.length;
          } else {
             const proportion = currentAmount / currentGroupTotal;
             newAmount = idealForGroup * proportion;
          }

          await tx.budgetGoal.update({
            where: { id: goal.id },
            data: { amount: newAmount }
          });
        }
      }
    }
  });

  return true;
}
