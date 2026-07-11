import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { needs, savings, wants } = body;
    
    await prisma.setting.upsert({
      where: { key: "budget_strategy" },
      update: { value: { needs, savings, wants } },
      create: { key: "budget_strategy", value: { needs, savings, wants } }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Strategy save error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
