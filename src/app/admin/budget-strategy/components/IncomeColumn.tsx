"use client";

import { useRouter } from "next/navigation";
import { Trash2, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface IncomeColumnProps {
  incomes: any[];
  totalIncome: number;
  onIncomeDeleted?: () => void;
}

export function IncomeColumn({ incomes, totalIncome, onIncomeDeleted }: IncomeColumnProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddIncome = async () => {
    if (!newName.trim() || !newAmount.trim() || isNaN(Number(newAmount))) {
      toast.error("Please enter a valid name and amount.");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/budgeting/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomeCategoryName: newName.trim(),
          amount: Number(newAmount),
          bankAccountName: "Main Account"
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setNewName("");
        setNewAmount("");
        setIsAdding(false);
        toast.success("Income added successfully!");
        if (onIncomeDeleted) onIncomeDeleted();
      } else {
        toast.error(data.error?.message || "Failed to add income");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error adding income");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/budgeting/income?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Income deleted successfully!");
        if (onIncomeDeleted) onIncomeDeleted();
      } else {
        toast.error("Failed to delete income");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting income");
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

        {/* Add Income UI */}
        <div className="pt-2">
          {isAdding ? (
            <div className="flex flex-col gap-2 mt-2">
              <input
                type="text"
                autoFocus
                placeholder="Income Name (e.g. Salary)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSaving}
                className="w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
              />
              <input
                type="number"
                placeholder="Amount (₦)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddIncome();
                  if (e.key === "Escape") setIsAdding(false);
                }}
                disabled={isSaving}
                className="w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleAddIncome}
                  disabled={isSaving || !newName.trim() || !newAmount.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold text-white disabled:opacity-50 flex-1 flex justify-center"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </button>
                <button
                  onClick={() => { setIsAdding(false); setNewName(""); setNewAmount(""); }}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center text-xs text-slate-500 hover:text-emerald-400 transition-colors mt-2"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Income
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
