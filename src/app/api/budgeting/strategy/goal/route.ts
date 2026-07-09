import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateGoalSchema = z.object({
  subcategoryId: z.string().min(1),
  amount: z.number().min(0),
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

    const { subcategoryId, amount } = result.data;
    let { periodId } = result.data;

    if (!periodId) {
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      periodId = config?.activePeriodId;
    }

    if (!periodId) {
      return NextResponse.json({ success: false, error: { message: "No period ID provided and no active period found." } }, { status: 400 });
    }

    // Update or create the BudgetGoal for this subcategory and period
    const goal = await prisma.budgetGoal.findFirst({
      where: { subcategoryId, periodId }
    });

    let updatedGoal;
    if (goal) {
      updatedGoal = await prisma.budgetGoal.update({
        where: { id: goal.id },
        data: { amount }
      });
    } else {
      updatedGoal = await prisma.budgetGoal.create({
        data: {
          subcategoryId,
          periodId,
          amount
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
