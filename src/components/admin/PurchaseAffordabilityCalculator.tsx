"use client";

import { useState, useEffect } from "react";
import { Calculator, AlertTriangle, CheckCircle2, Info, Clock, DollarSign, Wallet, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function PurchaseAffordabilityCalculator() {
  const [itemName, setItemName] = useState<string>("");
  const [price, setPrice] = useState<number | "">("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [netWorth, setNetWorth] = useState<number>(0);
  const [creatingPlanLabel, setCreatingPlanLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings?key=salary_benchmark")
      .then(res => res.json())
      .then(data => {
        if (data.value) {
          setNetWorth(data.value.netWorth || 0);
          setMonthlyIncome(data.value.monthlyIncome || 0);
        }
      })
      .catch(console.error);
  }, []);

  // Formulas
  const incomePercent = typeof price === 'number' && typeof monthlyIncome === 'number' && monthlyIncome > 0
    ? (price / monthlyIncome) * 100
    : 0;
    
  const netWorthPercent = typeof price === 'number' && typeof netWorth === 'number' && netWorth > 0
    ? (price / netWorth) * 100
    : 0;

  const getIncomeVerdict = (pct: number) => {
    if (pct <= 2) return { text: "Buy freely", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (pct <= 5) return { text: "Fine, but notice it", color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
    if (pct <= 10) return { text: "Pause, ask if it's worth it", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    if (pct <= 20) return { text: "Sleep on it 24–48hrs", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (pct <= 30) return { text: "Needs a real reason / plan", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
    return { text: "Avoid unless planned investment", color: "text-red-500", bg: "bg-red-600/10", border: "border-red-600/20" };
  };

  const getNetWorthVerdict = (pct: number) => {
    if (pct <= 1) return { text: "Buy freely", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (pct <= 3) return { text: "Fine", color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
    if (pct <= 5) return { text: "Pause and think", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    if (pct <= 10) return { text: "Sleep on it, needs justification", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (pct <= 20) return { text: "Major decision — plan it", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (pct <= 30) return { text: "Only for serious investments", color: "text-red-500", bg: "bg-red-600/10", border: "border-red-600/20" };
    return { text: "Avoid unless grows net worth", color: "text-red-600", bg: "bg-red-700/10", border: "border-red-700/20" };
  };

  const getRecommendation = () => {
    if (incomePercent <= 5 && netWorthPercent <= 3) {
      return { title: "Buy Now", icon: CheckCircle2, color: "text-emerald-400", desc: "Low gravity on both income and net worth. Safe to proceed." };
    }
    if (incomePercent > 30 && netWorthPercent > 20) {
      return { title: "Skip / Re-evaluate", icon: AlertTriangle, color: "text-red-500", desc: "Critical impact on both. Only proceed if it's a direct business/investment asset." };
    }
    return { title: "Save For It", icon: Clock, color: "text-amber-400", desc: "High gravity on either income or net worth. Use the 20-25% safe savings rate to plan for it." };
  };

  const getSeverity = (pct: number, type: 'income' | 'netWorth') => {
    if (type === 'income') {
      if (pct <= 2) return 0;
      if (pct <= 5) return 1;
      if (pct <= 10) return 2;
      if (pct <= 20) return 3;
      if (pct <= 30) return 4;
      return 5;
    } else {
      if (pct <= 1) return 0;
      if (pct <= 3) return 1;
      if (pct <= 5) return 2;
      if (pct <= 10) return 3;
      if (pct <= 20) return 4;
      if (pct <= 30) return 5;
      return 6;
    }
  };

  const incSeverity = getSeverity(incomePercent, 'income');
  const nwSeverity = getSeverity(netWorthPercent, 'netWorth');
  const bestPlace = nwSeverity < incSeverity ? "Net Worth" : "Monthly Income";
  const activeBaseAmount = bestPlace === "Net Worth" ? netWorth : monthlyIncome;

  const calculateMonthsToSave = (rate: number) => {
    if (typeof price !== 'number' || typeof activeBaseAmount !== 'number' || activeBaseAmount === 0) return 0;
    return Math.ceil(price / (rate * activeBaseAmount));
  };

  const handleCreatePlan = async (rate: number, label: string) => {
    if (typeof price !== 'number' || activeBaseAmount === 0) return;
    setCreatingPlanLabel(label);
    
    const maxMonthlyAmount = activeBaseAmount * rate;
    const months = Math.ceil(price / maxMonthlyAmount);
    
    let remaining = price;
    const timeline = Array.from({ length: months }).map((_, i) => {
      const amountThisMonth = Math.min(remaining, maxMonthlyAmount);
      remaining -= amountThisMonth;
      return {
        id: `month-${i + 1}`,
        text: `Month ${i + 1}: ₦${amountThisMonth.toLocaleString()}`,
        completed: false
      };
    });

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Save ₦${price.toLocaleString()} for ${itemName.trim() || 'Purchase'} from ${bestPlace} (${label})`,
          targetAmount: price,
          currentAmount: 0,
          status: "active",
          timeline: timeline
        })
      });
      
      if (res.ok) {
        toast.success(`Savings plan created (${label})`, {
          description: "Check the Salary Benchmarker tab to track your progress!"
        });
      } else {
        toast.error("Failed to create plan");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error while creating plan");
    } finally {
      setCreatingPlanLabel(null);
    }
  };

  const rec = getRecommendation();
  const incVerdict = getIncomeVerdict(incomePercent);
  const nwVerdict = getNetWorthVerdict(netWorthPercent);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
          <Calculator size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Purchase Affordability Planner</h3>
          <p className="text-xs text-zinc-400">Evaluate decisions using your Salary Benchmark</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Item Name (Optional)</label>
          <input 
            type="text"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            placeholder="e.g. MacBook Pro"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-indigo-500 outline-none transition-colors shadow-inner"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Item Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">₦</span>
            <input 
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 150000"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-3 text-white focus:border-indigo-500 outline-none transition-colors shadow-inner"
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {typeof price === 'number' && price > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto hide-scrollbar space-y-6"
          >
            {/* Verdicts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border ${incVerdict.bg} ${incVerdict.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign size={14}/> vs Income</span>
                  <span className={`text-lg font-bold ${incVerdict.color}`}>{incomePercent.toFixed(1)}%</span>
                </div>
                <p className={`text-sm font-medium ${incVerdict.color}`}>{incVerdict.text}</p>
              </div>

              <div className={`p-4 rounded-xl border ${nwVerdict.bg} ${nwVerdict.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><Wallet size={14}/> vs Net Worth</span>
                  <span className={`text-lg font-bold ${nwVerdict.color}`}>{netWorthPercent.toFixed(1)}%</span>
                </div>
                <p className={`text-sm font-medium ${nwVerdict.color}`}>{nwVerdict.text}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex gap-4 items-start">
              <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 ${rec.color}`}>
                <rec.icon size={24} />
              </div>
              <div>
                <h4 className={`text-base font-bold ${rec.color} mb-1`}>{rec.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{rec.desc}</p>
              </div>
            </div>

            {/* Savings Planner */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} className="text-indigo-400"/> Savings Rate Planner
                </h4>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-sm" title="Calculated based on which option has a safer verdict">
                  Best Source: {bestPlace}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { rate: 0.1, label: "10% Rate", desc: "Too slow (often unrealistic)" },
                  { rate: 0.2, label: "20% Rate", desc: "Safe (no strain on needs)" },
                  { rate: 0.25, label: "25% Rate", desc: "Safe-moderate (small buffer)" },
                  { rate: 0.3, label: "30% Rate", desc: "Matches full wants bucket" },
                  { rate: 0.4, label: "40%+ Rate", desc: "Aggressive (requires cuts)" }
                ].map((plan, i) => {
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-800 transition-colors group">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white flex items-center gap-2">
                          {plan.label} 
                          <span className="text-xs text-zinc-400 font-normal bg-zinc-800/50 px-1.5 py-0.5 rounded">
                            ₦{(activeBaseAmount * plan.rate).toLocaleString()}/mo
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">{plan.desc}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-400">{calculateMonthsToSave(plan.rate)} <span className="text-xs font-medium text-zinc-500">months</span></span>
                        </div>
                        <button
                          onClick={() => handleCreatePlan(plan.rate, plan.label)}
                          disabled={creatingPlanLabel !== null}
                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                          title="Create Saving Plan"
                        >
                          {creatingPlanLabel === plan.label ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : monthlyIncome === 0 || netWorth === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
            <AlertTriangle size={48} className="mb-4 text-amber-500/50" />
            <p className="text-sm font-semibold text-zinc-400">Missing Financial Baseline</p>
            <p className="text-xs mt-1">Please set your Net Worth and Monthly Income in the Salary Benchmarker tab first.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
            <Calculator size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Enter an item price to calculate affordability.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
