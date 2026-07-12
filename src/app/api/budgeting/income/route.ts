import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const incomeSchema = z.object({
  amount: z.number().positive(),
  incomeCategoryName: z.string().min(1),
  bankAccountName: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = incomeSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { amount, incomeCategoryName, bankAccountName, description } = result.data;

    // Look up IncomeCategory (case-insensitive), create if not exists
    let incomeCategory = await prisma.incomeCategory.findFirst({
      where: { name: { equals: incomeCategoryName, mode: 'insensitive' } }
    });

    if (!incomeCategory) {
      incomeCategory = await prisma.incomeCategory.create({
        data: { name: incomeCategoryName }
      });
    }

    // Look up BankAccount (case-insensitive), create if not exists
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { name: { equals: bankAccountName, mode: 'insensitive' } }
    });

    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: { name: bankAccountName, balance: 0 }
      });
    }

    // In a single Prisma transaction: create Income, increment balance
    const [income, updatedAccount] = await prisma.$transaction([
      prisma.income.create({
        data: {
          amount,
          description,
          incomeCategoryId: incomeCategory.id,
          bankAccountId: bankAccount.id,
        }
      }),
      prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          balance: { increment: amount }
        }
      })
    ]);

    // Auto-balance goals based on the new total income
    const { autoBalanceCurrentPeriod } = await import("@/lib/autoBalance");
    await autoBalanceCurrentPeriod();

    return NextResponse.json({ success: true, data: { income, updatedAccount } });

  } catch (error: any) {
    console.error("Income POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: { message: "Income ID required" } }, { status: 400 });
    }

    const income = await prisma.income.findUnique({ where: { id } });
    if (!income) {
      return NextResponse.json({ success: false, error: { message: "Income not found" } }, { status: 404 });
    }

    // Delete the income and revert the bank balance
    await prisma.$transaction([
      prisma.income.delete({ where: { id } }),
      ...(income.bankAccountId ? [
        prisma.bankAccount.update({
          where: { id: income.bankAccountId },
          data: { balance: { decrement: income.amount } }
        })
      ] : [])
    ]);

    // Rebalance goals if needed
    const { autoBalanceCurrentPeriod } = await import("@/lib/autoBalance");
    await autoBalanceCurrentPeriod();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Income DELETE Error:", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
