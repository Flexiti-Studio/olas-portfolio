import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const confirmSchema = z.object({
  proposedChanges: z.array(z.object({
    subcategoryId: z.string(),
    proposedGoal: z.number()
  }))
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = confirmSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { proposedChanges } = result.data;

    // 1. Fetch current active goals to serve as the base
    const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
    if (!config || !config.activePeriodId) {
      return NextResponse.json({ success: false, error: { message: "No active period found to reallocate from." } }, { status: 400 });
    }

    const activeGoals = await prisma.budgetGoal.findMany({
      where: { periodId: config.activePeriodId }
    });

    const sourceGoals = activeGoals.map(g => ({
      subcategoryId: g.subcategoryId,
      amount: Number(g.amount)
    }));

    // 2. Merge proposed changes
    for (const change of proposedChanges) {
      const existing = sourceGoals.find(g => g.subcategoryId === change.subcategoryId);
      if (existing) {
        existing.amount = change.proposedGoal;
      } else {
        sourceGoals.push({ subcategoryId: change.subcategoryId, amount: change.proposedGoal });
      }
    }

    // 3. Call strategy/period via internal fetch or directly 
    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    
    const res = await fetch(`${protocol}://${host}/api/budgeting/strategy/period`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceGoals,
        triggeredBy: "ai_advisor"
      })
    });

    const json = await res.json();
    return NextResponse.json(json);

  } catch (error: any) {
    console.error("Advisor Confirm Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
