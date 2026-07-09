import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const transferSchema = z.object({
  amount: z.number().positive(),
  fromAccountName: z.string().min(1),
  toAccountName: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = transferSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid input", details: result.error.flatten() } },
        { status: 400 }
      );
    }

    const { amount, fromAccountName, toAccountName, note } = result.data;

    if (fromAccountName.toLowerCase() === toAccountName.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: { message: "Cannot transfer to the same account" } },
        { status: 400 }
      );
    }

    // Look up both accounts (case-insensitive)
    const [fromAccount, toAccount] = await Promise.all([
      prisma.bankAccount.findFirst({ where: { name: { equals: fromAccountName, mode: 'insensitive' } } }),
      prisma.bankAccount.findFirst({ where: { name: { equals: toAccountName, mode: 'insensitive' } } })
    ]);

    if (!fromAccount) {
      return NextResponse.json(
        { success: false, error: { message: `Source account '${fromAccountName}' does not exist.` } },
        { status: 400 }
      );
    }

    if (!toAccount) {
      return NextResponse.json(
        { success: false, error: { message: `Destination account '${toAccountName}' does not exist.` } },
        { status: 400 }
      );
    }

    // NOTE: Transfers are strictly balance movements and should NEVER be counted as income or expenses.
    // Explicitly exclude transfers from any budget/spend aggregation queries.
    const [transfer, updatedFrom, updatedTo] = await prisma.$transaction([
      prisma.transfer.create({
        data: {
          amount,
          note,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id
        }
      }),
      prisma.bankAccount.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amount } }
      }),
      prisma.bankAccount.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amount } }
      })
    ]);

    return NextResponse.json({ success: true, data: { transfer, updatedFrom, updatedTo } });

  } catch (error: any) {
    console.error("Transfer POST Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
