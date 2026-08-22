"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Trash2, ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SubcategoryRowProps {
  index?: number;
  id: string;
  name: string;
  goal: number;
  percentage?: number | null;
  actual: number;
  remaining: number;
  periodLabel: string;
  isEditable: boolean;
  onGoalUpdated?: (id: string, newGoal: number) => void;
}

export function SubcategoryRow({
  index,
  id,
  name,
  goal,
  percentage,
  actual,
  remaining,
  periodLabel,
  isEditable,
  onGoalUpdated
}: SubcategoryRowProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"amount" | "percentage">(percentage ? "percentage" : "amount");
  const [inputValue, setInputValue] = useState(mode === "percentage" ? (percentage?.toString() || "0") : goal.toString());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [isRecordingExpense, setIsRecordingExpense] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (status !== "saving") {
      setInputValue(mode === "percentage" ? (percentage?.toString() || "0") : goal.toString());
    }
  }, [goal, percentage, mode]);

  const saveChange = useCallback(async (val: number, currentMode: "amount" | "percentage") => {
    // Basic guard
    if (currentMode === "amount" && val === goal) return;
    if (currentMode === "percentage" && val === percentage) return;

    setStatus("saving");
    try {
      const payload: any = { subcategoryId: id, periodLabel };
      if (currentMode === "percentage") {
        payload.percentage = val;
      } else {
        payload.amount = val;
        payload.percentage = null;
      }

      const res = await fetch("/api/budgeting/strategy/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatus("idle");
        const json = await res.json();
        if (onGoalUpdated) onGoalUpdated(id, json.data.amount);
        toast.success("Goal updated successfully");
        router.refresh(); // Refresh page to recalculate all totals
      } else {
        setStatus("error");
        toast.error("Failed to update goal");
      }
    } catch (e) {
      setStatus("error");
      toast.error("An error occurred");
    }
  }, [goal, id, periodLabel, onGoalUpdated, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/budgeting/subcategory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        if (onGoalUpdated) onGoalUpdated(id, 0);
        router.refresh();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to delete subcategory");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleRecordExpense = async () => {
    if (!expenseDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    const numValue = Number(inputValue);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsRecordingExpense(true);
    try {
      const res = await fetch("/api/budgeting/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcategoryId: id,
          amount: numValue,
          rawText: expenseDescription,
          source: "dashboard"
        })
      });
      if (res.ok) {
        toast.success("Expense recorded successfully");
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 5000); // clear after 5s
        setExpenseModalOpen(false);
        setExpenseDescription("");
        router.refresh();
      } else {
        toast.error("Failed to record expense");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsRecordingExpense(false);
    }
  };

  const isOverspent = remaining < 0;
  
  const isChanged = mode === "amount" 
    ? Number(inputValue) !== goal 
    : Number(inputValue) !== (percentage || 0);

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100/10">
      <div className="w-1/3 truncate" title={name}>
        <div className="text-sm font-medium">
          {index ? `${index}. ` : ""}{name}
        </div>
        {mode === "percentage" && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            ₦{goal.toLocaleString()}
          </div>
        )}
      </div>
      <div className="w-1/3 px-2 relative flex items-center gap-1">
        <button
          onClick={() => setMode(mode === "amount" ? "percentage" : "amount")}
          disabled={!isEditable}
          className="px-1 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
          title={`Toggle to ${mode === "amount" ? "percentage" : "amount"}`}
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            if (mode === "amount") {
              setExpenseModalOpen(true);
            } else {
              setMode("amount");
            }
          }}
          disabled={!isEditable}
          className="px-1.5 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
          title={mode === "amount" ? "Record Expense" : "Switch to Amount"}
        >
          {mode === "amount" ? "₦" : "%"}
        </button>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!isEditable}
          className={`w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-right disabled:opacity-50 transition-all duration-300 ${showPulse ? 'ring-2 ring-red-500 animate-pulse bg-red-500/10' : ''}`}
          step={mode === "percentage" ? "0.1" : "1"}
        />
        <div className="absolute -right-7 top-1.5 flex items-center">
          {status === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : isChanged ? (
            <button
              onClick={() => {
                const numValue = Number(inputValue);
                if (!isNaN(numValue)) saveChange(numValue, mode);
              }}
              className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 p-1 rounded transition-colors"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="w-1/3 flex items-center justify-end gap-2">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-1.5 py-0.5 text-xs font-bold bg-red-600 hover:bg-red-500 rounded text-white disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
              className="px-1.5 py-0.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isOverspent ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
              {remaining >= 0 ? `+${remaining.toLocaleString()}` : remaining.toLocaleString()}
            </span>
            {isEditable && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                title="Delete subcategory"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Record Expense</h3>
            <p className="text-sm text-slate-400 mb-6">
              What did you use ₦{Number(inputValue).toLocaleString()} for?
            </p>
            <input
              type="text"
              autoFocus
              value={expenseDescription}
              onChange={e => setExpenseDescription(e.target.value)}
              placeholder="e.g. Lunch, Uber, Groceries..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              onKeyDown={e => {
                if (e.key === "Enter") handleRecordExpense();
                if (e.key === "Escape") setExpenseModalOpen(false);
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setExpenseModalOpen(false)}
                disabled={isRecordingExpense}
                className="flex-1 px-4 py-2.5 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordExpense}
                disabled={isRecordingExpense}
                className="flex-1 px-4 py-2.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRecordingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
