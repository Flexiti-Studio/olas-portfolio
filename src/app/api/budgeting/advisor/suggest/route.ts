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

    if (allPeriods.length < 1) {
      return NextResponse.json({
        success: false,
        error: { message: "You don't have any budget periods set up yet. Log some income or expenses first so I have data to analyze!" }
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

    const strategySetting = await prisma.setting.findUnique({ where: { key: "budget_strategy" } });
    const globalStrategy = strategySetting ? (strategySetting.value as any) : { needs: 50, savings: 20, wants: 30 };

    let userMessage = "";
    try {
      const body = await req.json();
      if (body.userMessage) userMessage = body.userMessage;
    } catch(e) {}

    let prompt = `You are a budgeting advisor. Given the user's subcategory allocations (goals), their spending history, and their global strategy (Needs: ${globalStrategy.needs}%, Savings/Investments: ${globalStrategy.savings}%, Wants: ${globalStrategy.wants}%), identify:
1. Are their current allocations (goals) reasonable? Call out if a goal seems dangerously low or disproportionately high.
2. Subcategories that consistently come in UNDER their goal (candidates to shift budget away from, BUT ONLY if it's safe to do so).
3. Subcategories that consistently come in OVER their goal (need either more budget or flag as a behavior concern).
4. Do NOT arbitrarily reduce essential goals (like Rent, Internet, Gas, Groceries) to zero just because their actual spend is currently zero. The user may simply not have paid that bill yet this month!
5. If the user asks to achieve a specific financial goal (like clearing a 65k debt), FIRST check if their current goals already satisfy that amount. If they already have enough allocated, tell them they are already on track and do NOT aggressively strip money from essential categories.

Data: ${JSON.stringify(histories)}
Total periods analyzed: ${allPeriods.length}

Propose a new goal amount for each subcategory that needs to change (omit ones that should stay the same). Keep the total allocation within the user's global strategy split (Needs/Wants/Savings) unless you have a clear reason to recommend shifting the global split itself.

Return ONLY valid JSON:
{
  "reasoning": [ "short bullet explaining pattern 1", "short bullet explaining pattern 2" ],
  "proposedChanges": [
    { "subcategoryId": "string", "name": "string", "currentGoal": 0, "proposedGoal": 0, "reason": "string" }
  ],
  "proposedStrategy": { "needs": 50, "savings": 20, "wants": 30 },
  "summary": "one or two sentence plain-language takeaway"
}

Keep reasoning and reason fields short and specific. Do NOT propose reducing a goal to zero unless it's genuinely a non-essential 'Want'.`;

    if (userMessage) {
      prompt += `\n\nCRITICAL INSTRUCTION: The user also sent a specific message/request for you to address when reallocating: "${userMessage}". You MUST prioritize and incorporate this request into your reasoning, proposed changes, and summary.`;
    }

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
