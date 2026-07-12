import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { categoryId, name } = await req.json();

    if (!categoryId || !name) {
      return NextResponse.json({ success: false, error: { message: "categoryId and name are required" } }, { status: 400 });
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        categoryId
      }
    });

    return NextResponse.json({ success: true, data: subcategory });
  } catch (error: any) {
    console.error("Subcategory POST Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: { message: "Subcategory ID required" } }, { status: 400 });
    }

    const subcat = await prisma.subcategory.findUnique({
      where: { id },
      include: { transactions: true }
    });

    if (!subcat) {
      return NextResponse.json({ success: false, error: { message: "Not found" } }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const t of subcat.transactions) {
        if (t.bankAccountId) {
          await tx.bankAccount.update({
            where: { id: t.bankAccountId },
            data: { balance: { increment: t.amount } }
          });
        }
      }

      await tx.transaction.deleteMany({ where: { subcategoryId: id } });
      await tx.budgetGoal.deleteMany({ where: { subcategoryId: id } });
      await tx.subcategory.delete({ where: { id } });
    });

    const { autoBalanceCurrentPeriod } = await import("@/lib/autoBalance");
    await autoBalanceCurrentPeriod();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subcategory DELETE Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
