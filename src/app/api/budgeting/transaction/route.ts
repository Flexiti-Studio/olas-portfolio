import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const transactionSchema = z.object({
  subcategoryId: z.string().min(1),
  amount: z.number().positive(),
  rawText: z.string().optional(),
  source: z.string().default("telegram"),
  bankName: z.string().nullable().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = transactionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { subcategoryId, amount, rawText, source, bankName } = result.data;

    let appConfig = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
    const activePeriodId = appConfig?.activePeriodId;

    if (!activePeriodId) {
      // Create a default period if none exists (fallback for first run)
      const fallbackPeriod = await prisma.period.create({
        data: { label: `${new Date().getMonth() + 1}/${new Date().getFullYear()}` }
      });
      appConfig = await prisma.appConfig.upsert({
        where: { id: "singleton" },
        update: { activePeriodId: fallbackPeriod.id },
        create: { id: "singleton", activePeriodId: fallbackPeriod.id }
      });
    }

    const activePeriod = await prisma.period.findUnique({ where: { id: appConfig!.activePeriodId } });
    if (!activePeriod) throw new Error("Active period not found");

    const nextPeriod = await prisma.period.findFirst({
      where: { startDate: { gt: activePeriod.startDate } },
      orderBy: { startDate: 'asc' }
    });
    let endDate;
    if (nextPeriod) {
      endDate = nextPeriod.startDate;
    } else {
      const d = new Date(activePeriod.startDate);
      d.setMonth(d.getMonth() + 1);
      endDate = d;
    }

    // Start transaction
    const txResult = await prisma.$transaction(async (tx) => {
      const subcategory = await tx.subcategory.findUnique({
        where: { id: subcategoryId },
        include: { category: true }
      });

      if (!subcategory) {
        throw new Error("Subcategory not found");
      }

      let bankAccountId = subcategory.bankAccountId;
      
      // If user specified a bank name, try to find it
      if (bankName) {
        const banks = await tx.bankAccount.findMany();
        // naive case-insensitive match
        const matched = banks.find(b => b.name.toLowerCase().includes(bankName.toLowerCase()) || bankName.toLowerCase().includes(b.name.toLowerCase()));
        if (matched) {
          bankAccountId = matched.id;
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          subcategoryId,
          amount,
          rawText,
          source,
          bankAccountId: bankAccountId || null
        }
      });

      if (bankAccountId) {
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { decrement: amount } }
        });
      }

      // Compute Subcategory spending & goal
      const subcatGoal = await tx.budgetGoal.findFirst({
        where: { subcategoryId, periodId: activePeriod.id }
      });
      
      const subcatTransactions = await tx.transaction.aggregate({
        where: { 
          subcategoryId, 
          createdAt: {
            gte: activePeriod.startDate,
            lt: endDate
          }
        },
        _sum: { amount: true }
      });
      const spentSubcategory = Number(subcatTransactions._sum.amount || 0);
      const goalSubcategory = subcatGoal ? Number(subcatGoal.amount) : 0;

      // Compute Category spending & goal
      const allSubcats = await tx.subcategory.findMany({
        where: { categoryId: subcategory.categoryId }
      });
      const subcatIds = allSubcats.map(s => s.id);

      const catGoals = await tx.budgetGoal.aggregate({
        where: { subcategoryId: { in: subcatIds }, periodId: activePeriod.id },
        _sum: { amount: true }
      });
      const catTransactions = await tx.transaction.aggregate({
        where: { 
          subcategoryId: { in: subcatIds },
          createdAt: {
            gte: activePeriod.startDate,
            lt: endDate
          }
        },
        _sum: { amount: true }
      });

      const spentCategory = Number(catTransactions._sum.amount || 0);
      const goalCategory = Number(catGoals._sum.amount || 0);

      return {
        transaction,
        subcategory,
        bankAccountId,
        spentSubcategory,
        goalSubcategory,
        spentCategory,
        goalCategory,
        activePeriodLabel: activePeriod.label
      };
    }, {
      maxWait: 15000,
      timeout: 15000
    });

    let advice = null;
    let remainingSubcategory = 0;
    let remainingCategory = 0;

    if (txResult.goalSubcategory > 0) {
      remainingSubcategory = txResult.goalSubcategory - txResult.spentSubcategory;
      remainingCategory = txResult.goalCategory - txResult.spentCategory;

      const percent_used_subcategory = txResult.spentSubcategory / txResult.goalSubcategory;
      
      let days_left_in_period = 15;
      let days_elapsed = 15;
      let total_days_in_period = 30;

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        days_elapsed = now.getDate();
        days_left_in_period = lastDay - days_elapsed;
        total_days_in_period = lastDay;
      } catch (e) {}

      const expected_percent_by_now = days_elapsed / total_days_in_period;

      if (percent_used_subcategory >= 1.0) {
        advice = `You've fully used your ${txResult.subcategory.name} budget for this period.`;
      } else if (percent_used_subcategory >= 0.8) {
        advice = `Heads up \u2014 ${txResult.subcategory.name} is at ${Math.round(percent_used_subcategory * 100)}% with ${days_left_in_period} days left.`;
      } else if (percent_used_subcategory > expected_percent_by_now + 0.15) {
        const projected_overage = (txResult.spentSubcategory / days_elapsed) * total_days_in_period - txResult.goalSubcategory;
        advice = `You're spending ${txResult.subcategory.name} faster than the days suggest \u2014 on pace to overshoot by roughly \u20A6${Math.round(projected_overage).toLocaleString()}.`;
      }
    } else {
      advice = "No goal set for this yet.";
    }

    if (!txResult.bankAccountId) {
      console.warn(`Subcategory ${txResult.subcategory.name} has no linked bank account. Skipped balance deduction.`);
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction: txResult.transaction,
        amount,
        subcategoryName: txResult.subcategory.name,
        categoryName: txResult.subcategory.category.name,
        remainingSubcategory,
        remainingCategory,
        advice,
        hasGoal: txResult.goalSubcategory > 0,
        linkedAccount: txResult.bankAccountId !== null
      }
    });

  } catch (error: any) {
    console.error("Transaction POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}
