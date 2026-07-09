import { Resend } from "resend";
import { BudgetDigest, WeeklySlice } from "@/components/emails/BudgetDigest";
import openai from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { differenceInDays, subDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDigest(host: string, protocol: string, periodId?: string) {
  try {
    const url = new URL(`${protocol}://${host}/api/budgeting/strategy`);
    if (periodId) {
      url.searchParams.set("periodId", periodId);
    }
    
    const strategyRes = await fetch(url.toString(), { cache: "no-store" });
    const strategyJson = await strategyRes.json();

    if (!strategyJson.success || !strategyJson.data) {
      throw new Error("Failed to fetch strategy data");
    }

    const aggregation = strategyJson.data;
    const totalSpent = aggregation.groups.NEEDS.totalActual + aggregation.groups.SAVINGS.totalActual + aggregation.groups.WANTS.totalActual;

    // Calculate WeeklySlice
    // Last 7 days window
    const now = new Date();
    const lastWeek = subDays(now, 7);
    
    // Find active period for dates
    const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
    const targetPeriodId = periodId || config?.activePeriodId;
    if (!targetPeriodId) {
      throw new Error("No active period found");
    }
    
    const period = await prisma.period.findUnique({ 
      where: { id: targetPeriodId },
      include: { goals: { include: { subcategory: { include: { category: true } } } } }
    });

    if (!period) throw new Error("Period not found");

    // How many days in the month? For pace, let's assume 30 days if it's the active period, or actual difference if past.
    let nextPeriod = await prisma.period.findFirst({
      where: { startDate: { gt: period.startDate } },
      orderBy: { startDate: 'asc' }
    });
    
    const periodEnd = nextPeriod ? nextPeriod.startDate : new Date(period.startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysInPeriod = differenceInDays(periodEnd, period.startDate) || 30; // fallback to 30

    // Fetch transactions in the last 7 days for this period
    const txs = await prisma.transaction.groupBy({
      by: ['subcategoryId'],
      where: {
        createdAt: {
          gte: lastWeek > period.startDate ? lastWeek : period.startDate,
          lte: now
        }
      },
      _sum: { amount: true }
    });

    const txMap = new Map(txs.map(t => [t.subcategoryId, Number(t._sum.amount)]));
    const weeklySlices: WeeklySlice[] = [];

    let weeklySpendTotal = 0;

    for (const goal of period.goals) {
      const subcat = goal.subcategory;
      const weekSpend = txMap.get(subcat.id) || 0;
      weeklySpendTotal += weekSpend;

      // weekly pace: goal / (daysInPeriod / 7)
      const weeklyPace = Number(goal.amount) / (daysInPeriod / 7);

      if (weekSpend > 0 || weeklyPace > 0) {
        weeklySlices.push({
          subcategoryId: subcat.id,
          name: subcat.name,
          categoryGroup: subcat.category.group as "NEEDS" | "WANTS" | "SAVINGS",
          weekSpend,
          weeklyPace
        });
      }
    }

    let aiSummary = "No spending logged this week.";
    
    if (weeklySpendTotal > 0) {
      const prompt = `Given this week's spending by subcategory (with each subcategory's expected weekly pace based on its monthly goal) and the period-to-date totals, write a short summary for someone checking in on a weekend. Cover, in plain prose, no bullet points:

1. Which 1-2 subcategories ran hottest relative to their weekly pace this week, by how much, in Naira.
2. One concrete, specific thing to do differently next week — not generic advice like "spend less," but something tied to the actual numbers (e.g. "cut eating out to twice this week instead of most days" or "the debt payment pace means you're on track, nothing to change there").
3. One line on whether the month overall is still on track given how the weeks have gone so far.

Data: ${JSON.stringify({
  periodToDateSpent: totalSpent,
  periodToDateAllocated: aggregation.totalIncome,
  weeklySlices: weeklySlices
})}

Keep this to 4-6 sentences — a weekend check-in should be quick to read, not a report.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      aiSummary = completion.choices[0].message.content?.trim() || aiSummary;
    }

    const emailHtml = BudgetDigest({
      periodLabel: aggregation.periodLabel,
      aiSummary,
      totalIncome: aggregation.totalIncome,
      groups: aggregation.groups,
      weeklySlices
    });

    const { data, error } = await resend.emails.send({
      from: process.env.DIGEST_FROM_EMAIL || "budget@resend.dev",
      to: process.env.DIGEST_TO_EMAIL!,
      subject: `Budget Digest — ${aggregation.periodLabel}`,
      react: emailHtml
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("sendDigest Error:", error);
    return { success: false, error: { message: error.message } };
  }
}
