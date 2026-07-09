import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: bankAccounts });

  } catch (error: any) {
    console.error("Balance GET Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
