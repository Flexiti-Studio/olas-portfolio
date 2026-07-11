import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { periodId, strategy, totalIncome } = await req.json();

    if (!periodId || !strategy || typeof totalIncome !== 'number') {
      return NextResponse.json({ success: false, error: { message: "Invalid payload" } }, { status: 400 });
    }

    const { autoBalanceCurrentPeriod } = await import("@/lib/autoBalance");
    await autoBalanceCurrentPeriod();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Auto-balance error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
