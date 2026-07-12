import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateGoalSchema = z.object({
  subcategoryId: z.string().min(1),
  amount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional().nullable(),
  periodId: z.string().optional()
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const result = updateGoalSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { subcategoryId, amount, percentage } = result.data;
    let { periodId } = result.data;

    if (!periodId) {
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      periodId = config?.activePeriodId;
    }

    if (!periodId) {
      return NextResponse.json({ success: false, error: { message: "No period ID provided and no active period found." } }, { status: 400 });
    }

    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period) {
      return NextResponse.json({ success: false, error: { message: "Period not found" } }, { status: 404 });
    }

    let finalAmount = amount !== undefined ? amount : 0;

    if (percentage !== undefined && percentage !== null) {
      // Compute total income
      const nextPeriod = await prisma.period.findFirst({
        where: { startDate: { gt: period.startDate } },
        orderBy: { startDate: 'asc' }
      });
      const endDate = nextPeriod ? nextPeriod.startDate : new Date('2100-01-01');
      const periodIncomes = await prisma.income.findMany({
        where: {
          OR: [
            { createdAt: { gte: period.startDate, lt: endDate } },
            { isRecurring: true, createdAt: { lt: endDate } }
          ]
        }
      });
      const totalIncome = Number(period.rolloverAmount) + periodIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
      
      finalAmount = totalIncome * (percentage / 100);
    }

    // Update or create the BudgetGoal for this subcategory and period
    const goal = await prisma.budgetGoal.findFirst({
      where: { subcategoryId, periodId }
    });

    let updatedGoal;
    if (goal) {
      updatedGoal = await prisma.budgetGoal.update({
        where: { id: goal.id },
        data: { amount: finalAmount, percentage: percentage ?? null }
      });
    } else {
      updatedGoal = await prisma.budgetGoal.create({
        data: {
          subcategoryId,
          periodId,
          amount: finalAmount,
          percentage: percentage ?? null
        }
      });
    }

    return NextResponse.json({ success: true, data: updatedGoal });

  } catch (error: any) {
    console.error("Strategy Goal PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
