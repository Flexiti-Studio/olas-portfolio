"use client";

import { SubcategoryRow } from "./SubcategoryRow";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoryColumnProps {
  title: string;
  themeColor: string;
  categories: any[];
  totalGoal: number;
  totalActual: number;
  periodLabel: string;
  periodId?: string;
  isEditable: boolean;
  onGoalUpdated: (subcategoryId: string, newGoal: number) => void;
}

export function CategoryColumn({
  title,
  themeColor,
  categories,
  totalGoal,
  totalActual,
  periodLabel,
  periodId,
  isEditable,
  onGoalUpdated
}: CategoryColumnProps) {
  const router = useRouter();
  const [addingCatId, setAddingCatId] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [isSavingSubcat, setIsSavingSubcat] = useState(false);

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubcatName.trim()) {
       setAddingCatId(null);
       return;
    }
    setIsSavingSubcat(true);
    try {
      const res = await fetch("/api/budgeting/subcategory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, name: newSubcatName.trim() })
      });
      if (res.ok) {
        setNewSubcatName("");
        setAddingCatId(null);
        if (onGoalUpdated) onGoalUpdated("", 0);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSubcat(false);
    }
  };

  // Calculate used items and used amount in this group (checked items + expenses)
  const allSubcats = categories.flatMap((c) => c.subcategories || []);
  const usedCount = allSubcats.filter((s) => s.isUsed).length;
  const totalCount = allSubcats.length;
  const groupUsedAmount = allSubcats.reduce((sum, s) => sum + (s.usedAmount ?? (s.isUsed ? Math.max(s.goal, s.actual) : s.actual)), 0);
  const overallRemaining = totalGoal - groupUsedAmount;
  const isOverspent = overallRemaining < 0;

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
      {/* Group Header */}
      <div className={`p-4 sm:p-5 ${themeColor} text-white`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-base sm:text-lg uppercase tracking-wider">{title}</h3>
          {totalCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
              {usedCount}/{totalCount} Used
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-2.5 text-xs sm:text-sm font-medium">
          <span>Goal: ₦{totalGoal.toLocaleString()}</span>
          <span>Used/Spent: ₦{groupUsedAmount.toLocaleString()}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isOverspent ? "bg-red-950/60 text-red-200 border border-red-800/40" : "bg-black/20 text-white/90"}`}>
            {overallRemaining >= 0 
              ? `Available to spend: ₦${overallRemaining.toLocaleString()}` 
              : `Overspent: ₦${Math.abs(overallRemaining).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="p-3 sm:p-4 space-y-5">
        {categories.map((cat, catIdx) => (
          <div key={cat.id} className="bg-slate-950/40 rounded-xl p-2.5 sm:p-3 border border-slate-800/60">
            <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-slate-800">
              <h4 className="font-semibold text-slate-200 text-xs sm:text-sm">{catIdx + 1}. {cat.name}</h4>
              <span className="text-[11px] text-slate-400">
                Goal: ₦{cat.totalGoal.toLocaleString()} | Spent: ₦{cat.totalActual.toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-2">
              {cat.subcategories.map((sub: any, subIdx: number) => (
                <SubcategoryRow
                  key={sub.id}
                  index={subIdx + 1}
                  id={sub.id}
                  name={sub.name}
                  goal={sub.goal}
                  percentage={sub.percentage}
                  actual={sub.actual}
                  remaining={sub.remaining}
                  periodLabel={periodLabel}
                  periodId={periodId || periodLabel}
                  initialIsUsed={Boolean(sub.isUsed)}
                  isEditable={isEditable}
                  onGoalUpdated={onGoalUpdated}
                  onUsedToggled={() => {
                    if (onGoalUpdated) onGoalUpdated("", 0);
                  }}
                />
              ))}

              {/* Add Subcategory UI */}
              {isEditable && (
                <div className="pt-1.5">
                  {addingCatId === cat.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Subcategory name..."
                        value={newSubcatName}
                        onChange={(e) => setNewSubcatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSubcategory(cat.id);
                          if (e.key === "Escape") setAddingCatId(null);
                        }}
                        disabled={isSavingSubcat}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAddSubcategory(cat.id)}
                        disabled={isSavingSubcat || !newSubcatName.trim()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-colors"
                      >
                        {isSavingSubcat ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </button>
                      <button
                        onClick={() => { setAddingCatId(null); setNewSubcatName(""); }}
                        disabled={isSavingSubcat}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCatId(cat.id)}
                      className="flex items-center text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors py-1 px-1.5 rounded hover:bg-slate-800/50 mt-1"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Add Subcategory
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
