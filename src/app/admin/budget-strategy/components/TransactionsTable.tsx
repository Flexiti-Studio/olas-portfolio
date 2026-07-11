"use client";

import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, ReceiptText } from "lucide-react";

interface TransactionsTableProps {
  transactions: any[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="mt-8 bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
        <ReceiptText className="w-8 h-8 mx-auto mb-3 opacity-50" />
        No transactions logged for this period.
      </div>
    );
  }

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center">
        <ReceiptText className="w-5 h-5 mr-3 text-slate-400" />
        <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Bank/Source</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {transactions.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                  {format(new Date(t.createdAt), "MMM d, yyyy h:mm a")}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-200">
                    {t.rawText || "Manual Entry"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                    {t.subcategory?.category?.name} &rsaquo; {t.subcategory?.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-400">
                    {t.bankAccount?.name || "Cash/Unknown"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-medium text-red-400 flex items-center justify-end">
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    ₦{Number(t.amount).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
