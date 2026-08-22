import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { periodId, needs, savings, wants } = body;
    if (!periodId) {
      return NextResponse.json({ success: false, error: { message: "periodId is required" } }, { status: 400 });
    }
    
    const key = `budget_strategy_${periodId}`;
    await prisma.setting.upsert({
      where: { key },
      update: { value: { needs, savings, wants } },
      create: { key, value: { needs, savings, wants } }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Strategy save error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
