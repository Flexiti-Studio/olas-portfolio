import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { success: false, error: { message: "periodId is required" } },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findUnique({
      where: { key: `budget_used_${periodId}` },
    });

    const usedMap = (setting?.value as Record<string, boolean>) || {};

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        usedMap,
      },
    });
  } catch (error: any) {
    console.error("Budget Used GET Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { periodId, subcategoryId, isUsed } = body;

    if (!periodId || !subcategoryId || typeof isUsed !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "periodId, subcategoryId, and boolean isUsed are required" },
        },
        { status: 400 }
      );
    }

    const settingKey = `budget_used_${periodId}`;
    const existing = await prisma.setting.findUnique({
      where: { key: settingKey },
    });

    const currentMap = (existing?.value as Record<string, boolean>) || {};
    currentMap[subcategoryId] = isUsed;

    const updated = await prisma.setting.upsert({
      where: { key: settingKey },
      update: { value: currentMap },
      create: {
        key: settingKey,
        value: currentMap,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        subcategoryId,
        isUsed,
        usedMap: updated.value,
      },
    });
  } catch (error: any) {
    console.error("Budget Used POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: error?.message || "Internal server error" } },
      { status: 500 }
    );
  }
}
