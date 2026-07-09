import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

type SubcategoryHistory = {
  subcategoryId: string;
  name: string;
  categoryGroup: "NEEDS" | "WANTS" | "SAVINGS";
  periods: Array<{
    label: string;
    goal: number;
    actual: number;
    variancePercent: number; // (actual - goal) / goal
  }>;
  avgVariancePercent: number;
  trend: "increasing" | "decreasing" | "flat"; // simple slope over the period sequence
};

export async function POST(req: Request) {
  try {
    const allPeriods = await prisma.period.findMany({
      orderBy: { startDate: 'desc' },
      take: 6,
      include: {
        goals: { include: { subcategory: { include: { category: true } } } }
      }
    });

    if (allPeriods.length < 2) {
      return NextResponse.json({
        success: false,
        error: { message: "Not enough history yet to spot real patterns — once you've got a couple of full periods logged, this'll get more useful." }
      }, { status: 400 });
    }

    // Sort periods chronologically for trend analysis
    allPeriods.reverse();

    // Map subcategories
    const allSubcats = await prisma.subcategory.findMany({ include: { category: true } });
    const subcatMap = new Map<string, SubcategoryHistory>();

    for (const sub of allSubcats) {
      subcatMap.set(sub.id, {
        subcategoryId: sub.id,
        name: sub.name,
        categoryGroup: sub.category.group as "NEEDS" | "WANTS" | "SAVINGS",
        periods: [],
        avgVariancePercent: 0,
        trend: "flat"
      });
    }

    // Compute actuals for each period
    for (let i = 0; i < allPeriods.length; i++) {
      const p = allPeriods[i];
      const nextP = allPeriods[i + 1];
      const endDate = nextP ? nextP.startDate : new Date();

      const txs = await prisma.transaction.groupBy({
        by: ['subcategoryId'],
        where: {
          createdAt: {
            gte: p.startDate,
            lt: endDate
          }
        },
        _sum: { amount: true }
      });

      const txMap = new Map(txs.map(t => [t.subcategoryId, Number(t._sum.amount)]));

      for (const goal of p.goals) {
        const historyNode = subcatMap.get(goal.subcategoryId);
        if (historyNode) {
          const actual = txMap.get(goal.subcategoryId) || 0;
          const goalAmount = Number(goal.amount);
          let variancePercent = 0;
          if (goalAmount > 0) {
            variancePercent = (actual - goalAmount) / goalAmount;
          }

          historyNode.periods.push({
            label: p.label,
            goal: goalAmount,
            actual,
            variancePercent
          });
        }
      }
    }

    // Finalize trends
    const histories: SubcategoryHistory[] = [];
    for (const history of subcatMap.values()) {
      if (history.periods.length === 0) continue;
      
      const sumVariance = history.periods.reduce((sum, p) => sum + p.variancePercent, 0);
      history.avgVariancePercent = sumVariance / history.periods.length;

      // compute trend
      if (history.periods.length >= 2) {
        const mid = Math.floor(history.periods.length / 2);
        const firstHalf = history.periods.slice(0, mid);
        const secondHalf = history.periods.slice(mid);
        const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.actual, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.actual, 0) / secondHalf.length;

        if (secondHalfAvg > firstHalfAvg * 1.1) history.trend = "increasing";
        else if (secondHalfAvg < firstHalfAvg * 0.9) history.trend = "decreasing";
        else history.trend = "flat";
      }

      histories.push(history);
    }

    const prompt = `You are a budgeting advisor. Given this subcategory spending history, identify:
1. Subcategories that consistently come in UNDER their goal (candidates to shift budget away from).
2. Subcategories that consistently come in OVER their goal (need either more budget or flag as a behavior concern — say which, based on how far over and how consistent).
3. Any subcategory with zero or near-zero recorded spend across all periods despite having a goal — likely unlogged spending hiding elsewhere (e.g. dumped into Miscellaneous), worth calling out explicitly rather than treated as "under goal."

History: ${JSON.stringify(histories)}
Total periods analyzed: ${allPeriods.length}

Propose a new goal amount for each subcategory that needs to change (omit ones that should stay the same). Keep the total allocation within the same NEEDS/WANTS/SAVINGS group totals unless you have a clear reason to recommend shifting the group split itself — if you do, call that out explicitly and explain why, rather than silently changing it.

Return ONLY valid JSON:
{
  "reasoning": [ "short bullet explaining pattern 1", "short bullet explaining pattern 2" ],
  "proposedChanges": [
    { "subcategoryId": "string", "name": "string", "currentGoal": 0, "proposedGoal": 0, "reason": "string" }
  ],
  "summary": "one or two sentence plain-language takeaway"
}

Keep reasoning and reason fields short and specific — cite the actual numbers ("under goal by ~30% for 4 straight periods"), not vague statements like "spending seems fine."`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const proposal = JSON.parse(completion.choices[0].message.content || "{}");

    // Validate subcategory IDs
    const validSubcatIds = new Set(allSubcats.map(s => s.id));
    if (proposal.proposedChanges) {
      proposal.proposedChanges = proposal.proposedChanges.filter((c: any) => validSubcatIds.has(c.subcategoryId));
    }

    return NextResponse.json({ success: true, data: proposal });

  } catch (error: any) {
    console.error("Advisor Suggest Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
