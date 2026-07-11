import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let periodId = searchParams.get("periodId");

    let activePeriodId = "";
    const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
    if (config?.activePeriodId) {
      activePeriodId = config.activePeriodId;
    }

    if (!periodId) {
      periodId = activePeriodId;
    }

    const strategySetting = await prisma.setting.findUnique({ where: { key: "budget_strategy" } });
    const strategy = strategySetting ? strategySetting.value : { needs: 50, savings: 20, wants: 30 };

    if (!periodId) {
      return NextResponse.json({ success: true, data: { strategy }, message: "No active period" });
    }

    // 1. Fetch the Period
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) {
      return NextResponse.json({ success: false, error: { message: "Period not found" } }, { status: 404 });
    }

    // Find the next period to determine the end date
    const nextPeriod = await prisma.period.findFirst({
      where: { startDate: { gt: period.startDate } },
      orderBy: { startDate: 'asc' }
    });

    const endDate = nextPeriod ? nextPeriod.startDate : new Date('2100-01-01');

    // Fetch Income for the period date range
    const periodIncomes = await prisma.income.findMany({
      where: {
        createdAt: {
          gte: period.startDate,
          lt: endDate
        }
      },
      include: { incomeCategory: true }
    });
    
    const incomeCategoriesMap = new Map();
    let totalIncome = Number(period.rolloverAmount) || 0;
    
    for (const inc of periodIncomes) {
      const catName = inc.incomeCategory.name;
      const amt = Number(inc.amount);
      totalIncome += amt;
      
      if (!incomeCategoriesMap.has(catName)) {
        incomeCategoriesMap.set(catName, { id: inc.incomeCategory.id, name: catName, total: 0 });
      }
      incomeCategoriesMap.get(catName).total += amt;
    }
    const incomes = Array.from(incomeCategoriesMap.values());

    // 2. Fetch Goals for this period
    const goals = await prisma.budgetGoal.findMany({
      where: { periodId },
      include: { subcategory: { include: { category: true } } }
    });

    // 3. Fetch Transactions within the period range
    const periodTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: period.startDate,
          lt: endDate
        }
      },
      include: {
        subcategory: { include: { category: true } },
        bankAccount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const groups = {
      NEEDS: { categories: [] as any[], totalGoal: 0, totalActual: 0 },
      SAVINGS: { categories: [] as any[], totalGoal: 0, totalActual: 0 },
      WANTS: { categories: [] as any[], totalGoal: 0, totalActual: 0 }
    };

    const allCategories = await prisma.category.findMany({
      include: { subcategories: true }
    });

    for (const cat of allCategories) {
      const groupKey = cat.group as "NEEDS" | "SAVINGS" | "WANTS";
      const catData = { id: cat.id, name: cat.name, subcategories: [] as any[], totalGoal: 0, totalActual: 0 };

      for (const sub of cat.subcategories) {
        const goal = goals.find(g => g.subcategoryId === sub.id);
        const goalAmount = goal ? Number(goal.amount) : 0;
        
        const txs = periodTransactions.filter(t => t.subcategoryId === sub.id);
        const actualAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        const remaining = goalAmount - actualAmount;

        catData.subcategories.push({ id: sub.id, name: sub.name, goal: goalAmount, actual: actualAmount, remaining });
        catData.totalGoal += goalAmount;
        catData.totalActual += actualAmount;
      }

      groups[groupKey].categories.push(catData);
      groups[groupKey].totalGoal += catData.totalGoal;
      groups[groupKey].totalActual += catData.totalActual;
    }

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        periodLabel: period.label,
        activePeriodId,
        incomes,
        totalIncome,
        groups,
        strategy,
        transactions: periodTransactions
      }
    });
  } catch (error: any) {
    console.error("Strategy GET Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
