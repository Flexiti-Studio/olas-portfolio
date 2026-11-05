"use server";

import { prisma } from "@/lib/prisma";

export async function getBudgetSettings(userId: string) {
  let settings = await prisma.budgetSettings.findUnique({
    where: { userId }
  });

  if (!settings) {
    settings = await prisma.budgetSettings.create({
      data: {
        userId,
        incomeSources: ["Salary"],
        categories: ["Housing", "Food", "Transport", "Data and utilities", "Family and giving", "Loan", "Other"],
        savePercent: 20,
        investPercent: 30,
        annualReturn: 10,
        years: 5
      }
    });
  }

  // Also fetch starred items and checked items from settings table if available
  let starredItems: string[] = [];
  let checkedItemsByMonth: Record<string, string[]> = {};
  try {
    const starredSetting = await prisma.setting.findUnique({
      where: { key: `lifestyle_starred_${userId}` }
    });
    if (starredSetting?.value && Array.isArray(starredSetting.value)) {
      starredItems = starredSetting.value as string[];
    }

    const checkedSetting = await prisma.setting.findUnique({
      where: { key: `lifestyle_checked_by_month_${userId}` }
    });
    if (checkedSetting?.value && typeof checkedSetting.value === "object" && !Array.isArray(checkedSetting.value)) {
      checkedItemsByMonth = checkedSetting.value as Record<string, string[]>;
    }
  } catch (err) {
    console.error("Failed to load lifestyle priority settings:", err);
  }

  return {
    ...settings,
    annualReturn: settings.annualReturn.toNumber(),
    starredItems,
    checkedItemsByMonth
  };
}

export async function savePriorityList(userId: string, data: { starredItems?: string[]; monthKey?: string; checkedItems?: string[] }) {
  try {
    if (data.starredItems !== undefined) {
      await prisma.setting.upsert({
        where: { key: `lifestyle_starred_${userId}` },
        update: { value: data.starredItems },
        create: { key: `lifestyle_starred_${userId}`, value: data.starredItems }
      });
    }
    if (data.monthKey && data.checkedItems !== undefined) {
      // Get existing month map
      const existing = await prisma.setting.findUnique({
        where: { key: `lifestyle_checked_by_month_${userId}` }
      });
      const currentMap: Record<string, string[]> = (existing?.value && typeof existing.value === "object" && !Array.isArray(existing.value))
        ? (existing.value as Record<string, string[]>)
        : {};
      currentMap[data.monthKey] = data.checkedItems;

      await prisma.setting.upsert({
        where: { key: `lifestyle_checked_by_month_${userId}` },
        update: { value: currentMap },
        create: { key: `lifestyle_checked_by_month_${userId}`, value: currentMap }
      });
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to save priority list:", err);
    return { success: false, error: String(err) };
  }
}

export async function saveBudgetSettings(userId: string, data: {
  categories?: string[];
  incomeSources?: string[];
  savePercent?: number;
  investPercent?: number;
  annualReturn?: number;
  years?: number;
}) {
  const updateData: any = { ...data };
  if (data.annualReturn !== undefined) {
    updateData.annualReturn = Number(data.annualReturn);
  }
  if (data.years !== undefined) {
    updateData.years = Math.round(Number(data.years));
  }

  const result = await prisma.budgetSettings.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      incomeSources: data.incomeSources || ["Salary"],
      categories: data.categories || ["Housing", "Food", "Transport", "Data and utilities", "Family and giving", "Loan", "Other"],
      savePercent: data.savePercent ?? 20,
      investPercent: data.investPercent ?? 30,
      annualReturn: data.annualReturn ?? 10,
      years: data.years ? Math.round(Number(data.years)) : 5
    }
  });

  return {
    ...result,
    annualReturn: typeof result.annualReturn?.toNumber === 'function' ? result.annualReturn.toNumber() : Number(result.annualReturn)
  };
}

export async function getMonthlyBudgets(userId: string, year: number) {
  const budgets = await prisma.monthlyBudget.findMany({
    where: { userId, year },
    include: { incomes: true, expenses: true },
    orderBy: { month: "asc" }
  });

  return budgets.map(b => ({
    ...b,
    incomes: b.incomes.map(i => ({
      ...i,
      amount: i.amount.toNumber()
    })),
    expenses: b.expenses.map(e => ({
      ...e,
      amount: e.amount.toNumber()
    }))
  }));
}

export async function saveMonthlyBudget(userId: string, year: number, month: number, data: {
  incomes: { source: string; amount: number }[];
  expenses: { category: string; amount: number }[];
  savePercent?: number;
  investPercent?: number;
}) {
  const budget = await prisma.monthlyBudget.upsert({
    where: {
      userId_year_month: { userId, year, month }
    },
    update: {
      savePercent: data.savePercent,
      investPercent: data.investPercent
    },
    create: {
      userId,
      year,
      month,
      savePercent: data.savePercent,
      investPercent: data.investPercent
    }
  });

  await prisma.incomeEntry.deleteMany({
    where: { budgetId: budget.id }
  });

  await prisma.expenseEntry.deleteMany({
    where: { budgetId: budget.id }
  });

  if (data.incomes && data.incomes.length > 0) {
    await prisma.incomeEntry.createMany({
      data: data.incomes.map(i => ({
        budgetId: budget.id,
        source: i.source,
        amount: i.amount
      }))
    });
  }

  if (data.expenses && data.expenses.length > 0) {
    await prisma.expenseEntry.createMany({
      data: data.expenses.map(e => ({
        budgetId: budget.id,
        category: e.category,
        amount: e.amount
      }))
    });
  }

  return true;
}
