import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function formatDateLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("list") === "true") {
      const periods = await prisma.period.findMany({
        orderBy: { startDate: 'desc' }
      });
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      return NextResponse.json({ success: true, data: { periods, activePeriodId: config?.activePeriodId } });
    }

    // single period preview handled via strategy/route.ts mostly, but if requested here:
    const periodId = searchParams.get("periodId");
    if (periodId) {
      const host = req.headers.get("host");
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      const res = await fetch(`${protocol}://${host}/api/budgeting/strategy?periodId=${periodId}`);
      const json = await res.json();
      return NextResponse.json(json);
    }
    
    return NextResponse.json({ success: false, error: { message: "Invalid query" } }, { status: 400 });
  } catch (error: any) {
    console.error("Strategy Period GET Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}

const createPeriodSchema = z.object({
  sourceGoals: z.array(z.object({
    subcategoryId: z.string(),
    amount: z.number()
  })).optional(),
  label: z.string().optional(),
  triggeredBy: z.enum(["manual", "ai_advisor", "restore"]),
  restoredFromPeriodId: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = createPeriodSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    let { sourceGoals, label, triggeredBy, restoredFromPeriodId } = result.data;

    // If no sourceGoals and manual, copy from current active period
    if (!sourceGoals && triggeredBy === "manual") {
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      if (config?.activePeriodId) {
        const activeGoals = await prisma.budgetGoal.findMany({ where: { periodId: config.activePeriodId } });
        sourceGoals = activeGoals.map(g => ({ subcategoryId: g.subcategoryId, amount: Number(g.amount) }));
      } else {
        // Fallback to empty if no active period ever existed
        sourceGoals = [];
      }
    } else if (!sourceGoals && triggeredBy === "restore" && restoredFromPeriodId) {
      const oldGoals = await prisma.budgetGoal.findMany({ where: { periodId: restoredFromPeriodId } });
      sourceGoals = oldGoals.map(g => ({ subcategoryId: g.subcategoryId, amount: Number(g.amount) }));
    }

    if (!sourceGoals) {
      sourceGoals = [];
    }

    // Filter out deleted subcategories
    const allSubcats = await prisma.subcategory.findMany({ select: { id: true } });
    const subcatIds = new Set(allSubcats.map(s => s.id));
    const validGoals = sourceGoals.filter(g => subcatIds.has(g.subcategoryId));
    const skippedCount = sourceGoals.length - validGoals.length;

    const newPeriod = await prisma.$transaction(async (tx) => {
      const period = await tx.period.create({
        data: { label: label ?? formatDateLabel(new Date()) },
      });
      
      if (validGoals.length > 0) {
        await tx.budgetGoal.createMany({
          data: validGoals.map((g) => ({
            subcategoryId: g.subcategoryId,
            amount: g.amount,
            periodId: period.id,
          })),
        });
      }
      
      await tx.appConfig.upsert({
        where: { id: "singleton" },
        update: { activePeriodId: period.id },
        create: { id: "singleton", activePeriodId: period.id }
      });
      return period;
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        period: newPeriod,
        skippedCount 
      } 
    });
  } catch (error: any) {
    console.error("Strategy Period POST Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
