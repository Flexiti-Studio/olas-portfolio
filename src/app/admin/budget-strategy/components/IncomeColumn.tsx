"use client";

import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface IncomeColumnProps {
  incomes: any[];
  totalIncome: number;
  onIncomeDeleted?: () => void;
}

export function IncomeColumn({ incomes, totalIncome, onIncomeDeleted }: IncomeColumnProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/budgeting/income?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        if (onIncomeDeleted) onIncomeDeleted();
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };
  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 h-full">
      <div className="p-4 bg-emerald-700 text-white">
        <h3 className="font-bold text-lg uppercase tracking-wider">INCOME</h3>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span>Total: ₦{totalIncome.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {incomes.map((inc, idx) => (
          <div key={inc.id} className="flex justify-between items-center py-2 border-b border-gray-100/10">
            <span className="text-sm font-medium text-slate-300">{idx + 1}. {inc.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-emerald-400">₦{(inc.amount ?? inc.total ?? 0).toLocaleString()}</span>
              {confirmId === inc.id ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDelete(inc.id)}
                    disabled={deletingId === inc.id}
                    className="px-2 py-1 text-xs font-bold bg-red-600 hover:bg-red-500 rounded text-white disabled:opacity-50"
                  >
                    {deletingId === inc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                  </button>
                  <button 
                    onClick={() => setConfirmId(null)}
                    disabled={deletingId === inc.id}
                    className="px-2 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmId(inc.id)}
                  className="text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                  title="Delete income"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {incomes.length === 0 && (
          <div className="text-sm text-slate-500 italic">No income recorded for this period.</div>
        )}
      </div>
    </div>
  );
}
