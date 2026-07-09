"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check } from "lucide-react";

import { useRouter } from "next/navigation";

interface SubcategoryRowProps {
  id: string;
  name: string;
  goal: number;
  actual: number;
  remaining: number;
  periodLabel: string;
  isEditable: boolean;
  onGoalUpdated?: (id: string, newGoal: number) => void;
}

export function SubcategoryRow({
  id,
  name,
  goal,
  actual,
  remaining,
  periodLabel,
  isEditable,
  onGoalUpdated
}: SubcategoryRowProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(goal.toString());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setInputValue(goal.toString());
  }, [goal]);

  const saveChange = useCallback(async (newGoal: number) => {
    if (newGoal === goal) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/budgeting/strategy/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategoryId: id, amount: newGoal, periodLabel })
      });
      if (res.ok) {
        setStatus("saved");
        if (onGoalUpdated) onGoalUpdated(id, newGoal);
        router.refresh(); // Refresh page to recalculate all totals
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  }, [goal, id, periodLabel, onGoalUpdated, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = Number(inputValue);
      if (!isNaN(numValue) && numValue !== goal) {
        saveChange(numValue);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [inputValue, goal, saveChange]);

  const isOverspent = remaining < 0;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100/10">
      <div className="text-sm font-medium w-1/3 truncate" title={name}>{name}</div>
      <div className="w-1/3 px-2 relative">
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={!isEditable}
          className="w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-right disabled:opacity-50"
        />
        <div className="absolute -right-4 top-2">
          {status === "saving" && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          {status === "saved" && <Check className="w-3 h-3 text-green-500" />}
        </div>
      </div>
      <div className="w-1/3 text-right">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isOverspent ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
          {remaining >= 0 ? `+${remaining.toLocaleString()}` : remaining.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
