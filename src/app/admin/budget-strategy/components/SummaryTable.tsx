"use client";

import { useState, useEffect } from "react";
import { AllocationDonut } from "./AllocationDonut";

interface SummaryTableProps {
  totalIncome: number;
  groups: {
    NEEDS: { totalActual: number; totalGoal: number };
    SAVINGS: { totalActual: number; totalGoal: number };
    WANTS: { totalActual: number; totalGoal: number };
  };
}

export function SummaryTable({ totalIncome, groups }: SummaryTableProps) {
  // Local state for ideal allocations. Initialize to 50/30/20 rule of total income.
  const [idealNeeds, setIdealNeeds] = useState(totalIncome * 0.5);
  const [idealSavings, setIdealSavings] = useState(totalIncome * 0.2);
  const [idealWants, setIdealWants] = useState(totalIncome * 0.3);

  // Sync if totalIncome changes and user hasn't edited (simplified)
  useEffect(() => {
    setIdealNeeds(totalIncome * 0.5);
    setIdealSavings(totalIncome * 0.2);
    setIdealWants(totalIncome * 0.3);
  }, [totalIncome]);

  const totalAllocated = idealNeeds + idealSavings + idealWants;
  const totalSpent = groups.NEEDS.totalActual + groups.SAVINGS.totalActual + groups.WANTS.totalActual;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex gap-6">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">50/30/20 Budget Tool</h2>
        
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Ideal Allocation</th>
              <th className="pb-2 font-medium">Goal %</th>
              <th className="pb-2 font-medium">Actual %</th>
              <th className="pb-2 font-medium text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {/* NEEDS */}
            <tr className="bg-blue-900/10">
              <td className="py-3 font-semibold text-blue-400">NEEDS</td>
              <td className="py-3 pr-4">
                <input 
                  type="number" 
                  value={idealNeeds} 
                  onChange={e => setIdealNeeds(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-32"
                />
              </td>
              <td className="py-3">{totalIncome ? Math.round((idealNeeds / totalIncome) * 100) : 0}%</td>
              <td className="py-3">{idealNeeds ? Math.round((groups.NEEDS.totalActual / idealNeeds) * 100) : 0}%</td>
              <td className="py-3 text-right">₦{groups.NEEDS.totalActual.toLocaleString()}</td>
            </tr>
            {/* SAVINGS & INVESTMENTS */}
            <tr className="bg-violet-900/10">
              <td className="py-3 font-semibold text-violet-400">SAVINGS & INVESTMENTS</td>
              <td className="py-3 pr-4">
                <input 
                  type="number" 
                  value={idealSavings} 
                  onChange={e => setIdealSavings(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-32"
                />
              </td>
              <td className="py-3">{totalIncome ? Math.round((idealSavings / totalIncome) * 100) : 0}%</td>
              <td className="py-3">{idealSavings ? Math.round((groups.SAVINGS.totalActual / idealSavings) * 100) : 0}%</td>
              <td className="py-3 text-right">₦{groups.SAVINGS.totalActual.toLocaleString()}</td>
            </tr>
            {/* WANTS */}
            <tr className="bg-orange-900/10">
              <td className="py-3 font-semibold text-orange-400">WANTS</td>
              <td className="py-3 pr-4">
                <input 
                  type="number" 
                  value={idealWants} 
                  onChange={e => setIdealWants(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-32"
                />
              </td>
              <td className="py-3">{totalIncome ? Math.round((idealWants / totalIncome) * 100) : 0}%</td>
              <td className="py-3">{idealWants ? Math.round((groups.WANTS.totalActual / idealWants) * 100) : 0}%</td>
              <td className="py-3 text-right">₦{groups.WANTS.totalActual.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
          <div className="font-semibold">
            Status: 
            {totalAllocated === totalIncome 
              ? <span className="text-green-400 ml-2">Great, you've allocated exactly your income!</span>
              : totalAllocated > totalIncome 
                ? <span className="text-red-400 ml-2">Warning: You have allocated more than your income!</span>
                : <span className="text-yellow-400 ml-2">You have ₦{(totalIncome - totalAllocated).toLocaleString()} left to allocate.</span>
            }
          </div>
          <div className="text-right">
            <span className="text-sm text-slate-400">Total Spent</span>
            <div className="text-xl font-bold">₦{totalSpent.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <div className="w-64 border-l border-slate-800 pl-6 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-center mb-2 text-slate-400">Actual Spend Distribution</h3>
        <AllocationDonut 
          needs={groups.NEEDS.totalActual}
          savings={groups.SAVINGS.totalActual}
          wants={groups.WANTS.totalActual}
        />
      </div>
    </div>
  );
}
