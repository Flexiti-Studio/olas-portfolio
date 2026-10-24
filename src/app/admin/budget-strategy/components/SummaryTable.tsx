"use client";

import { useState, useEffect } from "react";
import { AllocationBar } from "./AllocationBar";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface SummaryTableProps {
  totalIncome: number;
  groups: {
    NEEDS: { totalActual: number; totalGoal: number };
    SAVINGS: { totalActual: number; totalGoal: number };
    WANTS: { totalActual: number; totalGoal: number };
  };
  strategy: { needs: number; savings: number; wants: number };
  periodId?: string;
}

export function SummaryTable({ totalIncome, groups, strategy, periodId }: SummaryTableProps) {
  // Local state for ideal percentages.
  const [pctNeeds, setPctNeeds] = useState(strategy?.needs || 50);
  const [pctSavings, setPctSavings] = useState(strategy?.savings || 20);
  const [pctWants, setPctWants] = useState(strategy?.wants || 30);
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  const [isAutoBalancing, setIsAutoBalancing] = useState(false);

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
  const totalSpent = ((groups.NEEDS as any).totalUsed ?? groups.NEEDS.totalActual) +
                     (((groups.SAVINGS as any).totalUsed ?? groups.SAVINGS.totalActual)) +
                     (((groups.WANTS as any).totalUsed ?? groups.WANTS.totalActual));
  const totalBalanceRemaining = totalIncome - totalSpent;
  const totalAbsoluteGoal = groups.NEEDS.totalGoal + groups.SAVINGS.totalGoal + groups.WANTS.totalGoal;
  const absoluteRemaining = totalIncome - totalAbsoluteGoal;

  const handleSaveStrategy = async () => {
    if (totalPct !== 100) {
      toast.error("Percentages must add up to exactly 100%.");
      return;
    }
    
    setIsSavingStrategy(true);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlPeriodId = searchParams.get("periodId");
      let activePeriodId = periodId || urlPeriodId;
      
      if (!activePeriodId) {
         const res = await fetch("/api/budgeting/strategy/period?list=true");
         const json = await res.json();
         activePeriodId = json.data.activePeriodId;
      }

      const res = await fetch("/api/budgeting/strategy/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: activePeriodId, needs: pctNeeds, savings: pctSavings, wants: pctWants })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Strategy saved successfully for this period!");
      } else {
        toast.error("Failed to save strategy.");
      }
    } catch (e) {
      toast.error("Error saving strategy.");
    }
    setIsSavingStrategy(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">50/30/20 Budget Tool</h2>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
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
                
                setIsAutoBalancing(true);
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
                setIsAutoBalancing(false);
              }}
              disabled={isAutoBalancing || isSavingStrategy || totalPct !== 100}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center w-full sm:w-auto"
            >
              {isAutoBalancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Auto-Balance Goals
            </button>
            <button 
              onClick={handleSaveStrategy}
              disabled={isAutoBalancing || isSavingStrategy || totalPct !== 100}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center w-full sm:w-auto"
            >
              {isSavingStrategy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Strategy
            </button>
          </div>
        </div>
        
        {/* Mobile View: Clean cards (< 640px) */}
        <div className="block sm:hidden space-y-3 pb-2">
          {/* NEEDS Card */}
          <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-blue-400">NEEDS</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Goal:</span>
                <input 
                  type="number" 
                  value={pctNeeds} 
                  onChange={e => setPctNeeds(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 w-14 text-center text-xs font-semibold text-slate-100"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-blue-900/20">
              <div>
                <span className="text-slate-400">Ideal:</span>{" "}
                <span className="font-semibold text-slate-200">₦{idealNeeds.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Spent:</span>{" "}
                <span className="font-semibold text-slate-200">₦{groups.NEEDS.totalActual.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({totalIncome ? Math.round((groups.NEEDS.totalActual / totalIncome) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* SAVINGS Card */}
          <div className="bg-violet-950/30 border border-violet-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-violet-400">SAVINGS & INVEST</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Goal:</span>
                <input 
                  type="number" 
                  value={pctSavings} 
                  onChange={e => setPctSavings(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 w-14 text-center text-xs font-semibold text-slate-100"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-violet-900/20">
              <div>
                <span className="text-slate-400">Ideal:</span>{" "}
                <span className="font-semibold text-slate-200">₦{idealSavings.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Spent:</span>{" "}
                <span className="font-semibold text-slate-200">₦{groups.SAVINGS.totalActual.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({totalIncome ? Math.round((groups.SAVINGS.totalActual / totalIncome) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* WANTS Card */}
          <div className="bg-orange-950/30 border border-orange-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-orange-400">WANTS</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Goal:</span>
                <input 
                  type="number" 
                  value={pctWants} 
                  onChange={e => setPctWants(Number(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 w-14 text-center text-xs font-semibold text-slate-100"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-orange-900/20">
              <div>
                <span className="text-slate-400">Ideal:</span>{" "}
                <span className="font-semibold text-slate-200">₦{idealWants.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Spent:</span>{" "}
                <span className="font-semibold text-slate-200">₦{groups.WANTS.totalActual.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({totalIncome ? Math.round((groups.WANTS.totalActual / totalIncome) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View: Full Table (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto w-full pb-2">
          <table className="w-full text-left text-sm min-w-[550px]">
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
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="font-semibold text-sm">
              <span className="text-slate-400 mr-2">Strategy Check:</span>
              {totalPct === 100 
                ? <span className="text-green-400">Perfect 100% split.</span>
                : totalPct > 100 
                  ? <span className="text-red-400">Over 100% ({totalPct}%)</span>
                  : <span className="text-yellow-400">Under 100% ({totalPct}%)</span>
              }
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400">Total Spent / Used</span>
                <div className="text-base sm:text-lg font-bold text-slate-200">₦{totalSpent.toLocaleString()}</div>
              </div>
              <div className="text-left sm:text-right pl-3 border-l border-slate-800">
                <span className="text-xs text-slate-400">Total Balance Remaining</span>
                <div className={`text-lg sm:text-xl font-extrabold ${totalBalanceRemaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ₦{totalBalanceRemaining.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-800/50 gap-2">
            <div className="font-semibold text-sm">
              <span className="text-slate-400 mr-2">Allocation Status:</span>
              {absoluteRemaining === 0 
                ? <span className="text-green-400 block sm:inline mt-1 sm:mt-0">Great, you've allocated all of your income for the month!</span>
                : absoluteRemaining > 0
                  ? <span className="text-yellow-400 block sm:inline mt-1 sm:mt-0">You have ₦{absoluteRemaining.toLocaleString()} left to allocate to goals.</span>
                  : <span className="text-red-400 block sm:inline mt-1 sm:mt-0">Warning: You've allocated ₦{Math.abs(absoluteRemaining).toLocaleString()} more than your income!</span>
              }
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Total Goal Allocated</span>
              <div className="text-base sm:text-lg font-bold text-white">₦{totalAbsoluteGoal.toLocaleString()}</div>
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
