import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      include: {
        incomes: true,
        transactions: true,
        transfersOut: true,
        transfersIn: true
      }
    });

    const reconciliation = bankAccounts.map(account => {
      const currentBalance = Number(account.balance);
      
      const totalIncome = account.incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
      const totalExpenses = account.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const totalTransfersOut = account.transfersOut.reduce((sum, tr) => sum + Number(tr.amount), 0);
      const totalTransfersIn = account.transfersIn.reduce((sum, tr) => sum + Number(tr.amount), 0);
      
      const computedBalance = totalIncome - totalExpenses - totalTransfersOut + totalTransfersIn;
      const drift = computedBalance - currentBalance;
      
      return {
        accountId: account.id,
        name: account.name,
        currentBalance,
        computedBalance,
        drift,
        isSynced: drift === 0,
        details: {
          totalIncome,
          totalExpenses,
          totalTransfersOut,
          totalTransfersIn
        }
      };
    });

    const outOfSync = reconciliation.filter(r => !r.isSynced);

    return NextResponse.json({ 
      success: true, 
      data: {
        allAccountsSynced: outOfSync.length === 0,
        reconciliation,
        outOfSync
      } 
    });

  } catch (error: any) {
    console.error("Reconcile GET Error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
