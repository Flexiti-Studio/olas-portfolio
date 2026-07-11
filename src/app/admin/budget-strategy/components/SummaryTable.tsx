"use client";

import { useState, useEffect } from "react";
import { AllocationBar } from "./AllocationBar";
import { Loader2, Save } from "lucide-react";

interface SummaryTableProps {
  totalIncome: number;
  groups: {
    NEEDS: { totalActual: number; totalGoal: number };
    SAVINGS: { totalActual: number; totalGoal: number };
    WANTS: { totalActual: number; totalGoal: number };
  };
  strategy: { needs: number; savings: number; wants: number };
}

export function SummaryTable({ totalIncome, groups, strategy }: SummaryTableProps) {
  // Local state for ideal percentages.
  const [pctNeeds, setPctNeeds] = useState(strategy?.needs || 50);
  const [pctSavings, setPctSavings] = useState(strategy?.savings || 20);
  const [pctWants, setPctWants] = useState(strategy?.wants || 30);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (strategy) {
      setPctNeeds(strategy.needs);
      setPctSavings(strategy.savings);
      setPctWants(strategy.wants);
    }
  }, [strategy]);

  const idealNeeds = totalIncome * (pctNeeds / 100);
  const idealSavings = totalIncome * (pctSavings / 100);
  const idealWants = totalIncome * (pctWants / 100);

  const totalPct = pctNeeds + pctSavings + pctWants;
  const totalSpent = groups.NEEDS.totalActual + groups.SAVINGS.totalActual + groups.WANTS.totalActual;
  const totalAbsoluteGoal = groups.NEEDS.totalGoal + groups.SAVINGS.totalGoal + groups.WANTS.totalGoal;
  const absoluteRemaining = totalIncome - totalAbsoluteGoal;

  const handleSaveStrategy = async () => {
    if (totalPct !== 100) {
      alert("Percentages must add up to exactly 100%.");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/budgeting/strategy/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs: pctNeeds, savings: pctSavings, wants: pctWants })
      });
      const data = await res.json();
      if (data.success) {
        alert("Strategy saved successfully!");
      } else {
        alert("Failed to save strategy.");
      }
    } catch (e) {
      alert("Error saving strategy.");
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">50/30/20 Budget Tool</h2>
          <div className="flex space-x-2">
            <button 
              onClick={async () => {
                const searchParams = new URLSearchParams(window.location.search);
                const periodId = searchParams.get("periodId");
                // Fetch the periodId if not in URL
                let activePeriodId = periodId;
                if (!activePeriodId) {
                   const res = await fetch("/api/budgeting/strategy/period?list=true");
                   const json = await res.json();
                   activePeriodId = json.data.activePeriodId;
                }
                
                setIsSaving(true);
                try {
                  await fetch("/api/budgeting/strategy/auto-balance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      periodId: activePeriodId,
                      strategy: { needs: pctNeeds, savings: pctSavings, wants: pctWants },
                      totalIncome
                    })
                  });
                  window.location.reload();
                } catch (e) {}
                setIsSaving(false);
              }}
              disabled={isSaving || totalPct !== 100}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Auto-Balance Goals
            </button>
            <button 
              onClick={handleSaveStrategy}
              disabled={isSaving || totalPct !== 100}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Strategy
            </button>
          </div>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Ideal Allocation</th>
              <th className="pb-2 font-medium text-center">Goal %</th>
              <th className="pb-2 font-medium text-center">Actual %</th>
              <th className="pb-2 font-medium text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {/* NEEDS */}
            <tr className="bg-blue-900/10">
               <td className="py-3 font-semibold text-blue-400">NEEDS</td>
               <td className="py-3">₦{idealNeeds.toLocaleString()}</td>
               <td className="py-3 text-center">
                 <input 
                   type="number" 
                   value={pctNeeds} 
                   onChange={e => setPctNeeds(Number(e.target.value) || 0)}
                   className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 text-center"
                 />%
               </td>
               <td className="py-3 text-center">{totalIncome ? Math.round((groups.NEEDS.totalActual / totalIncome) * 100) : 0}%</td>
               <td className="py-3 text-right">₦{groups.NEEDS.totalActual.toLocaleString()}</td>
            </tr>
            {/* SAVINGS & INVESTMENTS */}
            <tr className="bg-violet-900/10">
               <td className="py-3 font-semibold text-violet-400">SAVINGS & INVESTMENTS</td>
               <td className="py-3">₦{idealSavings.toLocaleString()}</td>
               <td className="py-3 text-center">
                 <input 
                   type="number" 
                   value={pctSavings} 
                   onChange={e => setPctSavings(Number(e.target.value) || 0)}
                   className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 text-center"
                 />%
               </td>
               <td className="py-3 text-center">{totalIncome ? Math.round((groups.SAVINGS.totalActual / totalIncome) * 100) : 0}%</td>
               <td className="py-3 text-right">₦{groups.SAVINGS.totalActual.toLocaleString()}</td>
            </tr>
            {/* WANTS */}
            <tr className="bg-orange-900/10">
               <td className="py-3 font-semibold text-orange-400">WANTS</td>
               <td className="py-3">₦{idealWants.toLocaleString()}</td>
               <td className="py-3 text-center">
                 <input 
                   type="number" 
                   value={pctWants} 
                   onChange={e => setPctWants(Number(e.target.value) || 0)}
                   className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 text-center"
                 />%
               </td>
               <td className="py-3 text-center">{totalIncome ? Math.round((groups.WANTS.totalActual / totalIncome) * 100) : 0}%</td>
               <td className="py-3 text-right">₦{groups.WANTS.totalActual.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 pt-4 border-t border-slate-700 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-sm">
              <span className="text-slate-400 mr-2">Strategy Check:</span>
              {totalPct === 100 
                ? <span className="text-green-400">Perfect 100% split.</span>
                : totalPct > 100 
                  ? <span className="text-red-400">Over 100% ({totalPct}%)</span>
                  : <span className="text-yellow-400">Under 100% ({totalPct}%)</span>
              }
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-400">Total Spent</span>
              <div className="text-xl font-bold text-white">₦{totalSpent.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
            <div className="font-semibold text-sm">
              <span className="text-slate-400 mr-2">Allocation Status:</span>
              {absoluteRemaining === 0 
                ? <span className="text-green-400">Great, you've allocated all of your income for the month!</span>
                : absoluteRemaining > 0
                  ? <span className="text-yellow-400">You have ₦{absoluteRemaining.toLocaleString()} left to allocate to goals.</span>
                  : <span className="text-red-400">Warning: You've allocated ₦{Math.abs(absoluteRemaining).toLocaleString()} more than your income!</span>
              }
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-400">Total Goal Allocated</span>
              <div className="text-xl font-bold text-white">₦{totalAbsoluteGoal.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-center mb-2 text-slate-400">Actual Spend Distribution</h3>
        <AllocationBar 
          needs={groups.NEEDS.totalActual}
          savings={groups.SAVINGS.totalActual}
          wants={groups.WANTS.totalActual}
          totalGoal={totalAbsoluteGoal}
        />
      </div>
    </div>
  );
}
