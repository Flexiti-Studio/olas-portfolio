import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("list") === "true") {
      const periods = await prisma.period.findMany({
        orderBy: { startDate: "desc" },
      });
      const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      return NextResponse.json({
        success: true,
        data: { periods, activePeriodId: config?.activePeriodId },
      });
    }

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
  sourceGoals: z
    .array(
      z.object({
        subcategoryId: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
  label: z.string().optional(),
  triggeredBy: z.enum(["manual", "ai_advisor", "restore", "auto_rollover"]),
  restoredFromPeriodId: z.string().optional(),
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
    const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
    const currentActivePeriodId = config?.activePeriodId;

    // 1. If manual or auto_rollover, copy goals from current active period
    if (!sourceGoals && (triggeredBy === "manual" || triggeredBy === "auto_rollover")) {
      if (currentActivePeriodId) {
        const activeGoals = await prisma.budgetGoal.findMany({
          where: { periodId: currentActivePeriodId },
        });
        sourceGoals = activeGoals.map((g) => ({
          subcategoryId: g.subcategoryId,
          amount: Number(g.amount),
        }));
      } else {
        sourceGoals = [];
      }
    } else if (!sourceGoals && triggeredBy === "restore" && restoredFromPeriodId) {
      const oldGoals = await prisma.budgetGoal.findMany({
        where: { periodId: restoredFromPeriodId },
      });
      sourceGoals = oldGoals.map((g) => ({
        subcategoryId: g.subcategoryId,
        amount: Number(g.amount),
      }));
    }

    if (!sourceGoals) {
      sourceGoals = [];
    }

    // 2. Fetch recurring/active incomes to copy over to the new period
    let sourceIncomes: any[] = [];
    if (triggeredBy === "manual" || triggeredBy === "auto_rollover") {
      if (currentActivePeriodId) {
        const activePeriod = await prisma.period.findUnique({
          where: { id: currentActivePeriodId },
        });
        if (activePeriod) {
          const nextPeriod = await prisma.period.findFirst({
            where: { startDate: { gt: activePeriod.startDate } },
            orderBy: { startDate: "asc" },
          });
          const endDate = nextPeriod
            ? nextPeriod.startDate
            : new Date(new Date(activePeriod.startDate).setMonth(activePeriod.startDate.getMonth() + 1));

          sourceIncomes = await prisma.income.findMany({
            where: {
              createdAt: { gte: activePeriod.startDate, lt: endDate },
            },
          });

          // Fallback if activePeriod had no incomes recorded yet: grab from previous period
          if (sourceIncomes.length === 0) {
            const pastPeriod = await prisma.period.findFirst({
              where: { startDate: { lt: activePeriod.startDate } },
              orderBy: { startDate: "desc" },
            });
            if (pastPeriod) {
              sourceIncomes = await prisma.income.findMany({
                where: {
                  createdAt: { gte: pastPeriod.startDate, lt: activePeriod.startDate },
                },
              });
            }
          }
        }
      }
    }

    // Filter out any deleted subcategories
    const allSubcats = await prisma.subcategory.findMany({ select: { id: true } });
    const subcatIds = new Set(allSubcats.map((s) => s.id));
    const validGoals = sourceGoals.filter((g) => subcatIds.has(g.subcategoryId));
    const skippedCount = sourceGoals.length - validGoals.length;

    // 3. Database Transaction: Snapshot previous month & create fresh unmarked new month
    const newPeriod = await prisma.$transaction(async (tx) => {
      // Step A: Snapshot and archive the previous active period in DB
      if (currentActivePeriodId) {
        const prevPeriodRecord = await tx.period.findUnique({
          where: { id: currentActivePeriodId },
        });
        const prevUsedSetting = await tx.setting.findUnique({
          where: { key: `budget_used_${currentActivePeriodId}` },
        });

        // Store complete snapshot record in Setting
        await tx.setting.upsert({
          where: { key: `budget_snapshot_${currentActivePeriodId}` },
          update: {
            value: {
              periodId: currentActivePeriodId,
              label: prevPeriodRecord?.label,
              archivedAt: new Date().toISOString(),
              usedMap: prevUsedSetting?.value || {},
              isSnapshot: true,
            },
          },
          create: {
            key: `budget_snapshot_${currentActivePeriodId}`,
            value: {
              periodId: currentActivePeriodId,
              label: prevPeriodRecord?.label,
              archivedAt: new Date().toISOString(),
              usedMap: prevUsedSetting?.value || {},
              isSnapshot: true,
            },
          },
        });
      }

      // Step B: Calculate bank rollover pool
      const banks = await tx.bankAccount.findMany();
      const totalBankBalances = banks.reduce((sum, b) => sum + Number(b.balance), 0);

      // Step C: Create the new period
      const period = await tx.period.create({
        data: {
          label: label ?? formatDateLabel(new Date()),
          rolloverAmount: totalBankBalances,
        },
      });

      // Step D: Create copies of the goals for the new period
      if (validGoals.length > 0) {
        await tx.budgetGoal.createMany({
          data: validGoals.map((g) => ({
            subcategoryId: g.subcategoryId,
            amount: g.amount,
            periodId: period.id,
          })),
        });
      }

      // Step E: Create copies of the incomes
      if (sourceIncomes.length > 0) {
        await tx.income.createMany({
          data: sourceIncomes.map((inc) => ({
            amount: inc.amount,
            description: inc.description,
            incomeCategoryId: inc.incomeCategoryId,
            bankAccountId: null,
            createdAt: period.startDate,
            isRecurring: inc.isRecurring,
          })),
        });
      }

      // Step F: Copy strategy percentages if available
      if (currentActivePeriodId) {
        const prevStrategy = await tx.setting.findUnique({
          where: { key: `budget_strategy_${currentActivePeriodId}` },
        });
        if (prevStrategy?.value) {
          await tx.setting.upsert({
            where: { key: `budget_strategy_${period.id}` },
            update: { value: prevStrategy.value },
            create: { key: `budget_strategy_${period.id}`, value: prevStrategy.value },
          });
        }
      }

      // Step G: REQUIREMENT: THE NEW MONTH MUST BE A FRESH UNMARKED COPY!
      // Initialize budget_used for the new period as empty {}
      await tx.setting.upsert({
        where: { key: `budget_used_${period.id}` },
        update: { value: {} },
        create: { key: `budget_used_${period.id}`, value: {} },
      });

      // Step H: Set as the active period in AppConfig
      await tx.appConfig.upsert({
        where: { id: "singleton" },
        update: { activePeriodId: period.id },
        create: { id: "singleton", activePeriodId: period.id },
      });

      return period;
    });

    return NextResponse.json({
      success: true,
      data: {
        period: newPeriod,
        skippedCount,
      },
    });
  } catch (error: any) {
    console.error("Strategy Period POST Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
