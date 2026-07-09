"use client";

import { SubcategoryRow } from "./SubcategoryRow";

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
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700">
              <h4 className="font-semibold text-slate-300">{cat.name}</h4>
              <span className="text-xs text-slate-500">
                Goal: {cat.totalGoal.toLocaleString()} | Actual: {cat.totalActual.toLocaleString()}
              </span>
            </div>
            <div className="space-y-1">
              {cat.subcategories.map((sub: any) => (
                <SubcategoryRow
                  key={sub.id}
                  id={sub.id}
                  name={sub.name}
                  goal={sub.goal}
                  actual={sub.actual}
                  remaining={sub.remaining}
                  periodLabel={periodLabel}
                  isEditable={isEditable}
                  onGoalUpdated={onGoalUpdated}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
