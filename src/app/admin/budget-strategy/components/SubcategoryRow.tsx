"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Trash2, ArrowLeftRight, GripVertical } from "lucide-react";
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
  periodId?: string;
  initialIsUsed?: boolean;
  isEditable: boolean;
  dragHandleProps?: any;
  onGoalUpdated?: (id: string, newGoal: number) => void;
  onUsedToggled?: (id: string, isUsed: boolean) => void;
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
  periodId,
  initialIsUsed = false,
  isEditable,
  dragHandleProps,
  onGoalUpdated,
  onUsedToggled
}: SubcategoryRowProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"amount" | "percentage">(percentage ? "percentage" : "amount");
  const [inputValue, setInputValue] = useState(mode === "percentage" ? (percentage?.toString() || "0") : goal.toString());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Used checkmark state
  const [isUsed, setIsUsed] = useState<boolean>(initialIsUsed);
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [isRecordingExpense, setIsRecordingExpense] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Sync initialIsUsed if prop changes (e.g. switching months)
  useEffect(() => {
    setIsUsed(Boolean(initialIsUsed));
  }, [initialIsUsed]);

  useEffect(() => {
    if (status !== "saving") {
      setInputValue(mode === "percentage" ? (percentage?.toString() || "0") : goal.toString());
    }
  }, [goal, percentage, mode]);

  const effectivePeriodId = periodId || periodLabel;

  const handleToggleUsed = async () => {
    if (isTogglingUsed) return;

    const nextUsed = !isUsed;
    // Optimistic UI update
    setIsUsed(nextUsed);
    setIsTogglingUsed(true);

    try {
      const res = await fetch("/api/budgeting/strategy/used", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: effectivePeriodId,
          subcategoryId: id,
          isUsed: nextUsed
        })
      });
      const data = await res.json();
      if (data.success) {
        if (nextUsed) {
          toast.success(`"${name}" marked as used (deducted from balance)`);
        } else {
          toast.info(`"${name}" marked as unused (restored to balance)`);
        }
        if (onUsedToggled) {
          onUsedToggled(id, nextUsed);
        }
      } else {
        // Revert on failure
        setIsUsed(!nextUsed);
        toast.error("Failed to update checkmark");
      }
    } catch (err) {
      setIsUsed(!nextUsed);
      toast.error("Network error updating checkmark");
    } finally {
      setIsTogglingUsed(false);
    }
  };

  const saveChange = useCallback(async (val: number, currentMode: "amount" | "percentage") => {
    if (currentMode === "amount" && val === goal) return;
    if (currentMode === "percentage" && val === percentage) return;

    setStatus("saving");
    try {
      const payload: any = { subcategoryId: id, periodLabel: effectivePeriodId };
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
        router.refresh();
      } else {
        setStatus("error");
        toast.error("Failed to update goal");
      }
    } catch (e) {
      setStatus("error");
      toast.error("An error occurred");
    }
  }, [goal, id, effectivePeriodId, onGoalUpdated, router, percentage]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/budgeting/subcategory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`"${name}" deleted successfully`);
        if (onGoalUpdated) onGoalUpdated(id, 0);
        router.refresh();
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message || "Failed to delete subcategory");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error deleting subcategory");
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
        setTimeout(() => setShowPulse(false), 5000);
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
    <div
      className={`group rounded-xl p-2.5 sm:p-3 transition-all duration-200 border ${isUsed
          ? "bg-slate-900/40 border-emerald-950/40 opacity-90 hover:opacity-100"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
        }`}
    >
      {/* Top Row: Checkmark + Title + Used Badge + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag Handle */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors touch-none"
              title="Drag to readjust position"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Checkmark Button with clear loading state */}
          <button
            type="button"
            onClick={handleToggleUsed}
            disabled={isTogglingUsed}
            title={isUsed ? "Marked as used (click to unmark and restore balance)" : "Click to mark as used and reduce from total balance"}
            className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${isUsed
                ? "bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/20"
                : "border-slate-600 bg-slate-800/80 hover:border-emerald-400 text-transparent hover:text-emerald-400/40"
              } ${isTogglingUsed ? "opacity-75 cursor-wait" : "cursor-pointer active:scale-95"}`}
          >
            {isTogglingUsed ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
            ) : (
              <Check className={`w-3.5 h-3.5 ${isUsed ? "opacity-100 stroke-[3]" : "opacity-0 group-hover:opacity-40"}`} />
            )}
          </button>

          {/* Subcategory Name & Indicators */}
          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium truncate transition-colors ${isUsed ? "text-slate-400 line-through decoration-emerald-500/50" : "text-slate-200"
                }`}
              title={name}
            >
              {index ? `${index}. ` : ""}{name}
            </span>

            {isUsed && (
              <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                USED
              </span>
            )}

            {mode === "percentage" && (
              <span className="text-[11px] text-slate-500">
                (₦{goal.toLocaleString()})
              </span>
            )}
          </div>
        </div>

        {/* Right side of Top Row: Remaining badge & Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2 py-0.5 text-xs font-bold bg-red-600 hover:bg-red-500 rounded text-white disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="px-2 py-0.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${isOverspent
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  }`}
                title={isOverspent ? "Overspent" : "Remaining"}
              >
                {remaining >= 0 ? `+₦${remaining.toLocaleString()}` : `-₦${Math.abs(remaining).toLocaleString()}`}
              </span>

              {isEditable && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-800"
                  title="Delete subcategory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Row / Controls: Input, Mode Toggle, Record Expense button, Save */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          {/* Amount / Percentage Toggle */}
          <button
            onClick={() => setMode(mode === "amount" ? "percentage" : "amount")}
            disabled={!isEditable}
            className="px-1.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
            title={`Toggle between Amount (₦) and Percentage (%)`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span className="font-mono text-xs text-indigo-400 font-bold">{mode === "amount" ? "₦" : "%"}</span>
          </button>

          {/* Quick Expense Logger */}
          {mode === "amount" && isEditable && (
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-2 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded border border-slate-700 transition-colors whitespace-nowrap"
              title="Record an expense for this item"
            >
              + Expense
            </button>
          )}

          {/* Goal Input Field */}
          <div className="relative flex-1 max-w-[160px]">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!isEditable}
              placeholder={mode === "percentage" ? "0%" : "₦0"}
              className={`w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-medium text-right text-slate-100 disabled:opacity-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all ${showPulse ? 'ring-2 ring-red-500 animate-pulse bg-red-500/10' : ''
                }`}
              step={mode === "percentage" ? "0.1" : "1"}
            />
            <span className="absolute left-2 top-1.5 text-xs text-slate-500 font-mono pointer-events-none">
              {mode === "amount" ? "₦" : "%"}
            </span>
          </div>

          {/* Save Status / Button */}
          <div className="flex items-center">
            {status === "saving" ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 ml-1" />
            ) : isChanged ? (
              <button
                onClick={() => {
                  const numValue = Number(inputValue);
                  if (!isNaN(numValue)) saveChange(numValue, mode);
                }}
                className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 p-1.5 rounded-md transition-colors ml-1 shadow-sm"
                title="Save updated goal"
              >
                <Check className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Actual Spent Descriptor */}
        <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
          Spent: <span className="font-semibold text-slate-200">₦{actual.toLocaleString()}</span>
        </div>
      </div>

      {/* Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Expense</h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-5">
              Logging expense under <span className="text-indigo-400 font-semibold">{name}</span>
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  autoFocus
                  value={expenseDescription}
                  onChange={e => setExpenseDescription(e.target.value)}
                  placeholder="e.g. Lunch, Grocery, Transport..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRecordExpense();
                    if (e.key === "Escape") setExpenseModalOpen(false);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Amount"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                disabled={isRecordingExpense}
                className="flex-1 px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordExpense}
                disabled={isRecordingExpense}
                className="flex-1 px-4 py-2 rounded-xl text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                {isRecordingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
