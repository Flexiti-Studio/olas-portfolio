import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

const suggestSchema = z.object({
  prompt: z.string().min(1),
  targetAmount: z.number().optional(),
  deadline: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = suggestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { prompt, targetAmount, deadline } = result.data;

    // Pull recent data (last 30 days roughly, or just limit to latest 100 for context)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [bankAccounts, incomes, transactions] = await Promise.all([
      prisma.bankAccount.findMany({ select: { name: true, balance: true } }),
      prisma.income.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { incomeCategory: true }
      }),
      prisma.transaction.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { subcategory: true }
      })
    ]);

    const contextData = {
      bankAccounts: bankAccounts.map(a => ({ name: a.name, balance: Number(a.balance) })),
      recentIncome: incomes.map(i => ({ amount: Number(i.amount), category: i.incomeCategory.name, date: i.createdAt })),
      recentExpenses: transactions.map(t => ({ amount: Number(t.amount), subcategory: t.subcategory.name, date: t.createdAt })),
    };

    const systemPrompt = `You are a financial advisor AI. The user wants to set a financial goal based on their prompt.
User prompt: "${prompt}"
${targetAmount ? `Target Amount Hint: ${targetAmount}` : ''}
${deadline ? `Deadline Hint: ${deadline}` : ''}

Here is their current financial context (balances, recent income, recent expenses):
${JSON.stringify(contextData, null, 2)}

Propose 1 to 3 realistic Budget Goal candidates. Base the amounts and deadlines on their ACTUAL income and spending patterns. Do not invent arbitrary numbers if you have data.
Output MUST be valid JSON with this exact schema:
{
  "candidates": [
    {
      "title": "string",
      "targetAmount": number,
      "deadline": "YYYY-MM-DD",
      "reasoning": "string explaining why this is a good goal based on their data"
    }
  ]
}
Return ONLY the JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse || "{}");
    } catch (e) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("Invalid response from AI");
    }

    return NextResponse.json({ success: true, data: parsedResponse.candidates || [] });

  } catch (error: any) {
    console.error("Goals Suggest POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
