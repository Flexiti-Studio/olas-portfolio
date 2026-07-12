"use client";

import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TransactionsTableProps {
  transactions: any[];
}

const ITEMS_PER_PAGE = 10;

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="mt-8 bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
        <ReceiptText className="w-8 h-8 mx-auto mb-3 opacity-50" />
        No transactions logged for this period.
      </div>
    );
  }

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center">
          <ReceiptText className="w-5 h-5 mr-3 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Ledger History</h2>
        </div>
        <div className="text-sm text-slate-400">
          Total: {transactions.length} entries
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium w-16">#</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Bank/Source</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedTransactions.map((t: any, idx: number) => {
              const isIncome = t.type === "income";
              return (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {startIndex + idx + 1}
                  </td>
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {format(new Date(t.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">
                      {t.rawText || "Manual Entry"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isIncome ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>
                      {t.subcategory?.category?.name} &rsaquo; {t.subcategory?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400">
                      {t.bankAccount?.name || "Cash/Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-medium flex items-center justify-end ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                      {isIncome ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                      {isIncome ? "+" : "-"}₦{Number(t.amount).toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
