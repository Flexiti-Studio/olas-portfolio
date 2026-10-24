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

  return {
    ...settings,
    annualReturn: settings.annualReturn.toNumber()
  };
}

export async function saveBudgetSettings(userId: string, data: {
  categories?: string[];
  incomeSources?: string[];
  savePercent?: number;
  investPercent?: number;
  annualReturn?: number;
  years?: number;
}) {
  return prisma.budgetSettings.update({
    where: { userId },
    data: {
      ...data,
      ...(data.annualReturn !== undefined && { annualReturn: data.annualReturn })
    }
  });
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
