import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { categoryId, orderedSubcategoryIds } = await req.json();

    if (!categoryId || !Array.isArray(orderedSubcategoryIds)) {
      return NextResponse.json({ success: false, error: { message: "Invalid payload" } }, { status: 400 });
    }

    const settingKey = `budget_subcat_order_${categoryId}`;
    await prisma.setting.upsert({
      where: { key: settingKey },
      update: { value: orderedSubcategoryIds },
      create: { key: settingKey, value: orderedSubcategoryIds }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reorder Subcategories Error:", err);
    return NextResponse.json({ success: false, error: { message: "Failed to persist order" } }, { status: 500 });
  }
}

