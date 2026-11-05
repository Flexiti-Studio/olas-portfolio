import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

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

    // Check for automatic new month transition if viewing active period without an explicit past periodId query
    if (activePeriodId && (!searchParams.get("periodId") || searchParams.get("periodId") === activePeriodId)) {
      const activePeriod = await prisma.period.findUnique({ where: { id: activePeriodId } });
      if (activePeriod) {
        const now = new Date();
        const start = new Date(activePeriod.startDate);
        const isNewMonth =
          now.getFullYear() > start.getFullYear() ||
          (now.getFullYear() === start.getFullYear() && now.getMonth() > start.getMonth());

        if (isNewMonth) {
          // Automatic rollover: snapshot active month, create new fresh unmarked month
          try {
            const prevGoals = await prisma.budgetGoal.findMany({ where: { periodId: activePeriod.id } });
            const prevUsed = await prisma.setting.findUnique({ where: { key: `budget_used_${activePeriod.id}` } });

            // 1. Snapshot previous month in DB
            await prisma.setting.upsert({
              where: { key: `budget_snapshot_${activePeriod.id}` },
              update: {
                value: {
                  periodId: activePeriod.id,
                  label: activePeriod.label,
                  archivedAt: new Date().toISOString(),
                  usedMap: prevUsed?.value || {},
                  isSnapshot: true,
                },
              },
              create: {
                key: `budget_snapshot_${activePeriod.id}`,
                value: {
                  periodId: activePeriod.id,
                  label: activePeriod.label,
                  archivedAt: new Date().toISOString(),
                  usedMap: prevUsed?.value || {},
                  isSnapshot: true,
                },
              },
            });

            // 2. Create new month period with starting rollover balances
            const banks = await prisma.bankAccount.findMany();
            const totalBankBalances = banks.reduce((sum, b) => sum + Number(b.balance), 0);

            const newPeriod = await prisma.period.create({
              data: {
                label: formatDateLabel(now),
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                rolloverAmount: totalBankBalances,
              },
            });

            // 3. Copy over goals from previous month
            if (prevGoals.length > 0) {
              await prisma.budgetGoal.createMany({
                data: prevGoals.map((g) => ({
                  subcategoryId: g.subcategoryId,
                  amount: g.amount,
                  periodId: newPeriod.id,
                })),
              });
            }

            // 4. Copy recurring incomes
            const recurringIncomes = await prisma.income.findMany({
              where: { isRecurring: true },
            });
            if (recurringIncomes.length > 0) {
              await prisma.income.createMany({
                data: recurringIncomes.map((inc) => ({
                  amount: inc.amount,
                  description: inc.description,
                  incomeCategoryId: inc.incomeCategoryId,
                  bankAccountId: null,
                  createdAt: newPeriod.startDate,
                  isRecurring: true,
                })),
              });
            }

            // 5. Copy strategy percentages
            const prevStrategy = await prisma.setting.findUnique({
              where: { key: `budget_strategy_${activePeriod.id}` },
            });
            if (prevStrategy?.value) {
              await prisma.setting.upsert({
                where: { key: `budget_strategy_${newPeriod.id}` },
                update: { value: prevStrategy.value },
                create: { key: `budget_strategy_${newPeriod.id}`, value: prevStrategy.value },
              });
            }

            // 6. REQUIREMENT: NEW MONTH STARTS AS FRESH UNMARKED COPY!
            await prisma.setting.upsert({
              where: { key: `budget_used_${newPeriod.id}` },
              update: { value: {} },
              create: { key: `budget_used_${newPeriod.id}`, value: {} },
            });

            // 7. Update AppConfig activePeriodId
            await prisma.appConfig.upsert({
              where: { id: "singleton" },
              update: { activePeriodId: newPeriod.id },
              create: { id: "singleton", activePeriodId: newPeriod.id },
            });

            // Switch to new period
            activePeriodId = newPeriod.id;
            periodId = newPeriod.id;
          } catch (autoErr) {
            console.error("Auto Month Rollover Error:", autoErr);
          }
        }
      }
    }

    const strategySetting = await prisma.setting.findUnique({
      where: { key: `budget_strategy_${periodId}` },
    });
    let strategy = strategySetting ? strategySetting.value : null;

    // Fallback to global strategy if period strategy doesn't exist
    if (!strategy) {
      const globalStrategySetting = await prisma.setting.findUnique({ where: { key: "budget_strategy" } });
      strategy = globalStrategySetting ? globalStrategySetting.value : { needs: 50, savings: 20, wants: 30 };
    }

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
      orderBy: { startDate: "asc" },
    });

    let endDate: Date;
    if (nextPeriod) {
      endDate = nextPeriod.startDate;
    } else {
      const d = new Date(period.startDate);
      d.setMonth(d.getMonth() + 1);
      endDate = d;
    }

    // Fetch Income specifically created for this period
    let periodIncomes = await prisma.income.findMany({
      where: {
        createdAt: {
          gte: period.startDate,
          lt: endDate,
        },
      },
      include: { incomeCategory: true },
    });

    // REQUIREMENT: Auto-transfer income for new months if not yet copied!
    if (periodIncomes.length === 0) {
      const prevPeriod = await prisma.period.findFirst({
        where: { startDate: { lt: period.startDate } },
        orderBy: { startDate: "desc" },
      });
      if (prevPeriod) {
        const prevNext = await prisma.period.findFirst({
          where: { startDate: { gt: prevPeriod.startDate } },
          orderBy: { startDate: "asc" },
        });
        const prevEnd = prevNext ? prevNext.startDate : period.startDate;
        const prevIncomes = await prisma.income.findMany({
          where: {
            createdAt: { gte: prevPeriod.startDate, lt: prevEnd },
          },
          include: { incomeCategory: true },
        });

        if (prevIncomes.length > 0) {
          for (const inc of prevIncomes) {
            await prisma.income.create({
              data: {
                amount: inc.amount,
                description: inc.description,
                incomeCategoryId: inc.incomeCategoryId,
                bankAccountId: inc.bankAccountId,
                isRecurring: true,
                createdAt: period.startDate,
              },
            });
          }
          // Refetch incomes for this period
          periodIncomes = await prisma.income.findMany({
            where: {
              createdAt: {
                gte: period.startDate,
                lt: endDate,
              },
            },
            include: { incomeCategory: true },
          });
        }
      }
    }

    let totalIncome = 0;
    for (const inc of periodIncomes) {
      const amt = Number(inc.amount);
      totalIncome += amt;
    }
    const incomes = periodIncomes.map((inc) => ({
      id: inc.id,
      name: inc.incomeCategory.name,
      amount: Number(inc.amount),
    }));

    // 2. Fetch Goals for this period
    const goals = await prisma.budgetGoal.findMany({
      where: { periodId },
      include: { subcategory: { include: { category: true } } },
    });

    // 3. Fetch Transactions within the period range
    const periodTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: period.startDate,
          lt: endDate,
        },
      },
      include: {
        subcategory: { include: { category: true } },
        bankAccount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Fetch the Saved Used Checkmarks for this period
    const usedSetting = await prisma.setting.findUnique({
      where: { key: `budget_used_${periodId}` },
    });
    const usedMap = (usedSetting?.value as Record<string, boolean>) || {};

    const groups = {
      NEEDS: { categories: [] as any[], totalGoal: 0, totalActual: 0, totalUsed: 0 },
      SAVINGS: { categories: [] as any[], totalGoal: 0, totalActual: 0, totalUsed: 0 },
      WANTS: { categories: [] as any[], totalGoal: 0, totalActual: 0, totalUsed: 0 },
    };

    const allCategories = await prisma.category.findMany({
      include: { subcategories: true },
    });

    // Fetch custom subcategory orders if stored
    const orderSettings = await prisma.setting.findMany({
      where: { key: { startsWith: "budget_subcat_order_" } },
    });
    const orderMap: Record<string, string[]> = {};
    for (const s of orderSettings) {
      const catId = s.key.replace("budget_subcat_order_", "");
      if (Array.isArray(s.value)) {
        orderMap[catId] = s.value as string[];
      }
    }

    let totalSubcategoriesCount = 0;
    let usedSubcategoriesCount = 0;
    let overallUsedAmount = 0;

    for (const cat of allCategories) {
      const groupKey = cat.group as "NEEDS" | "SAVINGS" | "WANTS";
      const catData = { id: cat.id, name: cat.name, subcategories: [] as any[], totalGoal: 0, totalActual: 0, totalUsed: 0 };

      // Sort subcategories by custom order if saved
      const customOrder = orderMap[cat.id];
      const sortedSubs = [...cat.subcategories].sort((a, b) => {
        if (!customOrder) return 0;
        const indexA = customOrder.indexOf(a.id);
        const indexB = customOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      for (const sub of sortedSubs) {
        const goal = goals.find((g) => g.subcategoryId === sub.id);
        const goalAmount = goal ? Number(goal.amount) : 0;
        const goalPercentage = goal?.percentage ? Number(goal.percentage) : null;

        const txs = periodTransactions.filter((t) => t.subcategoryId === sub.id);
        const actualAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
        const isUsed = !!usedMap[sub.id];

        // REQUIREMENT: When checked as used, reduce it from total balance!
        // An item that is marked as used is considered spent for its goal amount (or logged expenses if greater)
        const usedAmount = isUsed ? Math.max(goalAmount, actualAmount) : actualAmount;
        const remaining = isUsed ? 0 : Math.max(0, goalAmount - actualAmount);

        totalSubcategoriesCount++;
        if (isUsed) usedSubcategoriesCount++;
        overallUsedAmount += usedAmount;

        catData.subcategories.push({
          id: sub.id,
          name: sub.name,
          goal: goalAmount,
          percentage: goalPercentage,
          actual: actualAmount,
          usedAmount,
          remaining,
          isUsed, // <--- Checked status stored in DB!
        });
        catData.totalGoal += goalAmount;
        catData.totalActual += actualAmount;
        catData.totalUsed += usedAmount;
      }

      groups[groupKey].categories.push(catData);
      groups[groupKey].totalGoal += catData.totalGoal;
      groups[groupKey].totalActual += catData.totalActual;
      groups[groupKey].totalUsed += catData.totalUsed;
    }

    // REQUIREMENT: Total Balance = Total Income - Total Used (checked items + logged expenses)
    const totalBalance = totalIncome - overallUsedAmount;

    const formattedIncomesAsTxs = periodIncomes.map((inc) => ({
      id: inc.id,
      amount: inc.amount,
      rawText: inc.description || "Income Added",
      source: "income",
      subcategory: {
        name: inc.incomeCategory.name,
        category: { name: "INCOME" },
      },
      bankAccount: (inc as any).bankAccount,
      createdAt: inc.createdAt,
      type: "income",
    }));

    const formattedTxs = periodTransactions.map((t) => ({
      ...t,
      type: "expense",
    }));

    const allLedgerEntries = [...formattedIncomesAsTxs, ...formattedTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        periodLabel: period.label,
        activePeriodId,
        isSnapshot: periodId !== activePeriodId,
        incomes,
        totalIncome,
        totalUsed: overallUsedAmount,
        totalBalance,
        groups,
        strategy,
        usedCount: usedSubcategoriesCount,
        totalItemsCount: totalSubcategoriesCount,
        transactions: allLedgerEntries,
      },
    });
  } catch (error: any) {
    console.error("Strategy GET Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
