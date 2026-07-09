import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: goals });

  } catch (error: any) {
    console.error("Goals GET Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

const goalSchema = z.object({
  title: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().optional().transform(v => v ? new Date(v) : null),
  status: z.string().optional().default("active"),
  subcategoryId: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = goalSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify subcategoryId if provided
    if (data.subcategoryId) {
      const subcategory = await prisma.subcategory.findUnique({ where: { id: data.subcategoryId } });
      if (!subcategory) {
        return NextResponse.json(
          { success: false, error: { message: "Subcategory not found" } },
          { status: 404 }
        );
      }
    }

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        deadline: data.deadline,
        status: data.status,
        subcategoryId: data.subcategoryId,
        aiGenerated: false
      }
    });

    return NextResponse.json({ success: true, data: goal });

  } catch (error: any) {
    console.error("Goals POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
