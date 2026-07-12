"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Trash2 } from "lucide-react";

import { useRouter } from "next/navigation";

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
        setStatus("saved");
        const json = await res.json();
        if (onGoalUpdated) onGoalUpdated(id, json.data.amount);
        router.refresh(); // Refresh page to recalculate all totals
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
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

  useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = Number(inputValue);
      if (!isNaN(numValue)) {
        if (mode === "amount" && numValue !== goal) {
           saveChange(numValue, mode);
        } else if (mode === "percentage" && numValue !== percentage) {
           saveChange(numValue, mode);
        }
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [inputValue, goal, percentage, mode, saveChange]);

  const isOverspent = remaining < 0;

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
          className="px-1.5 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
          title={`Toggle to ${mode === "amount" ? "percentage" : "amount"}`}
        >
          {mode === "amount" ? "₦" : "%"}
        </button>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!isEditable}
          className="w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-right disabled:opacity-50"
          step={mode === "percentage" ? "0.1" : "1"}
        />
        <div className="absolute -right-4 top-2">
          {status === "saving" && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          {status === "saved" && <Check className="w-3 h-3 text-green-500" />}
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
    </div>
  );
}
