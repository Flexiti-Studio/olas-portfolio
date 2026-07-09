import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const confirmSchema = z.object({
  goals: z.array(
    z.object({
      title: z.string().min(1),
      targetAmount: z.number().positive(),
      deadline: z.string().optional().transform(v => v ? new Date(v) : null),
      subcategoryId: z.string().optional()
    })
  ).min(1)
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

    const { goals } = result.data;

    // Persist goals with aiGenerated = true
    const createdGoals = await prisma.$transaction(
      goals.map(g => 
        prisma.goal.create({
          data: {
            title: g.title,
            targetAmount: g.targetAmount,
            deadline: g.deadline,
            subcategoryId: g.subcategoryId,
            aiGenerated: true,
            status: "active",
            currentAmount: 0
          }
        })
      )
    );

    return NextResponse.json({ success: true, data: createdGoals });

  } catch (error: any) {
    console.error("Goals Confirm POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
