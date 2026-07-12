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

  const overallRemaining = totalGoal - totalActual;
  const isOverspent = overallRemaining < 0;

  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
      {/* Group Header */}
      <div className={`p-4 ${themeColor} text-white`}>
        <h3 className="font-bold text-lg uppercase tracking-wider">{title}</h3>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span>Goal: ₦{totalGoal.toLocaleString()}</span>
          <span>Actual: ₦{totalActual.toLocaleString()}</span>
        </div>
        <div className="mt-1">
          <span className={`text-xs font-semibold px-2 py-1 rounded bg-white/20`}>
            {overallRemaining >= 0 
              ? `Available to spend: ₦${overallRemaining.toLocaleString()}` 
              : `Overspent: ₦${Math.abs(overallRemaining).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="p-4 space-y-6">
        {categories.map((cat, catIdx) => (
          <div key={cat.id}>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
              <h4 className="font-semibold text-slate-300">{catIdx + 1}. {cat.name}</h4>
              <span className="text-xs text-slate-500">
                Goal: {cat.totalGoal.toLocaleString()} | Actual: {cat.totalActual.toLocaleString()}
              </span>
            </div>
            <div className="space-y-1">
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
                  isEditable={isEditable}
                  onGoalUpdated={onGoalUpdated}
                />
              ))}

              {/* Add Subcategory UI */}
              {isEditable && (
                <div className="pt-2">
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
                        className="flex-1 bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                      />
                      <button
                        onClick={() => handleAddSubcategory(cat.id)}
                        disabled={isSavingSubcat || !newSubcatName.trim()}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {isSavingSubcat ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </button>
                      <button
                        onClick={() => { setAddingCatId(null); setNewSubcatName(""); }}
                        disabled={isSavingSubcat}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCatId(cat.id)}
                      className="flex items-center text-xs text-slate-500 hover:text-emerald-400 transition-colors mt-2"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Subcategory
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
