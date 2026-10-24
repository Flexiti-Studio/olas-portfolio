"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Scatter } from "recharts";
import { getBudgetSettings, getMonthlyBudgets, saveBudgetSettings, saveMonthlyBudget } from "@/app/dashboard/lifestyle-cost/actions";
import { calculateMonth, calculateYearSummary, calculateProjection } from "@/lib/lifestyle";
import { Plus, Trash2, Copy, Save, AlertTriangle, TrendingUp, Wallet, Banknote, ShieldAlert, PiggyBank } from "lucide-react";

import { toast } from "sonner";

// Formatting
const formatNGN = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

const shortNGN = (num: number) => {
  if (Math.abs(num) >= 1_000_000) return `₦${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `₦${(num / 1_000).toFixed(0)}k`;
  return `₦${num}`;
};

const MonthSchema = z.object({
  incomes: z.array(z.object({
    source: z.string().min(1),
    amount: z.number().min(0, "Amount cannot be negative"),
  })),
  expenses: z.array(z.object({
    category: z.string().min(1),
    amount: z.number().min(0, "Amount cannot be negative"),
  })),
  savePercent: z.number(),
  investPercent: z.number(),
});

export default function LifestyleCostClient({ userId }: { userId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Local storage for month persistence
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lifestyleCostSelectedMonth");
      if (stored !== null) return parseInt(stored, 10);
    }
    return new Date().getMonth();
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [settings, setSettings] = useState<any>(null);
  const [monthsData, setMonthsData] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState<'income' | 'expense' | null>(null);
  const [newCatName, setNewCatName] = useState("");

  // Form
  const form = useForm({
    resolver: zodResolver(MonthSchema),
    defaultValues: {
      incomes: [],
      expenses: [],
      savePercent: 20,
      investPercent: 30
    }
  });

  const { fields: incFields, append: appendInc, remove: removeInc } = useFieldArray({
    control: form.control,
    name: "incomes"
  });

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
    control: form.control,
    name: "expenses"
  });

  const watchedValues = form.watch();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const [s, m] = await Promise.all([
          getBudgetSettings(userId),
          getMonthlyBudgets(userId, year)
        ]);
        setSettings(s);
        setMonthsData(m);
      } catch (err) {
        console.error("Failed to load lifestyle data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [userId, year]);

  // Sync form with selected month
  useEffect(() => {
    if (!settings) return;
    localStorage.setItem("lifestyleCostSelectedMonth", selectedMonth.toString());
    
    let monthData = monthsData.find(m => m.month === selectedMonth);
    let isNewEmptyMonth = false;

    // If empty, copy from the most recent prior month
    if (!monthData) {
      isNewEmptyMonth = true;
      const previousMonths = monthsData.filter(m => m.month < selectedMonth).sort((a, b) => b.month - a.month);
      if (previousMonths.length > 0) {
        monthData = previousMonths[0]; // Copy previous month's data
      }
    }
    
    const currentFormValues = form.getValues();

    const incomes = settings.incomeSources.map((src: string) => {
      // Prefer current unsaved value in form, then saved month data, then 0
      const current = currentFormValues.incomes?.find((e: any) => e.source === src);
      if (current) return current;
      const existing = monthData?.incomes?.find((e: any) => e.source === src);
      return { source: src, amount: existing ? existing.amount : 0 };
    });

    const expenses = settings.categories.map((cat: string) => {
      // Prefer current unsaved value in form, then saved month data, then 0
      const current = currentFormValues.expenses?.find((e: any) => e.category === cat);
      if (current) return current;
      const existing = monthData?.expenses?.find((e: any) => e.category === cat);
      return { category: cat, amount: existing ? existing.amount : 0 };
    });

    form.reset({
      incomes,
      expenses,
      savePercent: monthData?.savePercent ?? settings.savePercent,
      investPercent: monthData?.investPercent ?? settings.investPercent,
    });
  }, [selectedMonth, monthsData, settings]); // Removed form from deps to avoid loop

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    
    // Artificial minimum delay so the button spin isn't an invisible flash
    await Promise.all([
      saveMonthlyBudget(userId, year, selectedMonth, data),
      new Promise(r => setTimeout(r, 600))
    ]);
    
    // Update local state for immediate feedback
    setMonthsData(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(m => m.month === selectedMonth);
      const newMonth = { 
        year, 
        month: selectedMonth, 
        incomes: data.incomes, 
        expenses: data.expenses,
        savePercent: data.savePercent,
        investPercent: data.investPercent
      };
      if (idx >= 0) updated[idx] = newMonth;
      else updated.push(newMonth);
      return updated;
    });
    
    setIsSaving(false);
    setIsSaveSuccess(true);
    setLastSaved(new Date());
    
    // Show toast
    toast.success("Settings saved successfully!");
    
    // reset button state after 2 seconds
    setTimeout(() => {
      setIsSaveSuccess(false);
      setLastSaved(null);
    }, 2000);
  };

  // Derived state
  const currentMonthCalc = useMemo(() => {
    if (!settings) return null;
    const totalInc = (watchedValues.incomes || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
    const totalExp = (watchedValues.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    return calculateMonth(totalInc, [totalExp], watchedValues.savePercent, watchedValues.investPercent);
  }, [watchedValues, settings]);

  const yearSummary = useMemo(() => {
    if (!settings) return null;
    const fullYear = Array.from({ length: 12 }, (_, i) => {
      const isCurrentEditing = i === selectedMonth;
      if (isCurrentEditing) {
        return {
          income: (watchedValues.incomes || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
          expenses: (watchedValues.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
          saveP: watchedValues.savePercent,
          investP: watchedValues.investPercent
        };
      }
      const m = monthsData.find(x => x.month === i);
      return {
        income: m ? m.incomes.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) : 0,
        expenses: m ? m.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) : 0,
        saveP: m?.savePercent ?? settings.savePercent,
        investP: m?.investPercent ?? settings.investPercent
      };
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSaveAndInvest = 0;
    let monthsEntered = 0;

    for (const m of fullYear) {
      if (m.income > 0 || m.expenses > 0) {
        monthsEntered++;
        totalIncome += m.income;
        totalExpenses += m.expenses;
        const leftOver = m.income - m.expenses;
        if (leftOver > 0) {
          totalSaveAndInvest += leftOver * ((m.saveP + m.investP) / 100);
        }
      }
    }

    const expensesPercent = totalIncome > 0 ? totalExpenses / totalIncome : 0;
    const leftOverSoFar = totalIncome - totalExpenses;
    const keptPercent = totalIncome > 0 ? leftOverSoFar / totalIncome : 0;

    return {
      totalIncome,
      totalExpenses,
      expensesPercent,
      leftOverSoFar,
      keptPercent,
      totalSaveAndInvest,
      monthsEntered
    };
  }, [monthsData, watchedValues, selectedMonth, settings]);

  const projection = useMemo(() => {
    if (!settings) return null;
    const fullYear = Array.from({ length: 12 }, (_, i) => {
      const isCurrentEditing = i === selectedMonth;
      if (isCurrentEditing) {
        return {
          income: (watchedValues.incomes || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
          expenses: (watchedValues.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
        };
      }
      const m = monthsData.find(x => x.month === i);
      return {
        income: m ? m.incomes.reduce((sum: number, k: any) => sum + (k.amount || 0), 0) : 0,
        expenses: m ? m.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) : 0
      };
    });
    return calculateProjection(fullYear, settings.investPercent, settings.annualReturn, settings.years);
  }, [monthsData, watchedValues, selectedMonth, settings]);

  // Chart data
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Array.from({ length: 12 }, (_, i) => {
      const isCurrentEditing = i === selectedMonth;
      let inc = 0, exp = 0;
      
      if (isCurrentEditing) {
        inc = (watchedValues.incomes || []).reduce((sum: number, k: any) => sum + (k.amount || 0), 0);
        exp = (watchedValues.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      } else {
        const m = monthsData.find(x => x.month === i);
        if (m) {
          inc = m.incomes.reduce((sum: number, k: any) => sum + (k.amount || 0), 0);
          exp = m.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        }
      }
      
      const leftOver = inc - exp;
      const hasData = inc > 0 || exp > 0;
      
      return {
        name: months[i],
        monthIndex: i,
        // Bar chart hides empty months
        income: hasData ? inc : null,
        expenses: hasData ? exp : null,
        // Line chart shows 0s so the line spans the whole year
        lineIncome: inc,
        lineExpenses: exp,
        leftOver: hasData ? leftOver : null,
        deficitDot: (hasData && leftOver < 0) ? leftOver : null,
        surplusDot: (hasData && leftOver >= 0) ? leftOver : null,
      };
    });
  }, [monthsData, selectedMonth, watchedValues]);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferMonths, setTransferMonths] = useState<number[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  const projectionChartData = useMemo(() => {
    if (!settings || !projection) return [];
    
    const data = [];
    const r = (settings.annualReturn / 100) / 12;
    
    for (let y = 1; y <= settings.years; y++) {
      const n = y * 12;
      const totalInvested = projection.monthlyInvest * n;
      let futureValue = 0;
      if (r > 0) {
        futureValue = projection.monthlyInvest * ((Math.pow(1 + r, n) - 1) / r);
      } else {
        futureValue = totalInvested;
      }
      
      data.push({
        year: `Y${y}`,
        totalInvested,
        growth: futureValue - totalInvested, // stack this on top of totalInvested
        futureValue
      });
    }
    return data;
  }, [projection, settings]);

  // Handlers
  const confirmAddCategory = async () => {
    if (!newCatName.trim() || !settings) return;
    const name = newCatName.trim();
    
    setIsAddingCategory(true);
    
    if (showAddModal === 'income') {
      if (settings.incomeSources.includes(name)) {
        alert("Source already exists.");
        setIsAddingCategory(false);
        return;
      }
      const newSrcs = [...settings.incomeSources, name];
      setSettings({ ...settings, incomeSources: newSrcs });
      await saveBudgetSettings(userId, { incomeSources: newSrcs });
    } else if (showAddModal === 'expense') {
      if (settings.categories.includes(name)) {
        alert("Category already exists.");
        setIsAddingCategory(false);
        return;
      }
      const newCats = [...settings.categories, name];
      setSettings({ ...settings, categories: newCats });
      await saveBudgetSettings(userId, { categories: newCats });
    }
    
    setIsAddingCategory(false);
    setNewCatName("");
    setShowAddModal(null);
  };

  const handleRemoveIncomeSource = async (index: number) => {
    if (!settings) return;
    const src = incFields[index].source;
    if (confirm(`Remove "${src}"? This deletes amounts for this income source across all months.`)) {
      const newSrcs = settings.incomeSources.filter((s: string) => s !== src);
      setSettings({ ...settings, incomeSources: newSrcs });
      await saveBudgetSettings(userId, { incomeSources: newSrcs });
      removeInc(index);
    }
  };

  const handleRemoveCategory = async (index: number) => {
    if (!settings) return;
    const cat = expFields[index].category;
    if (confirm(`Remove "${cat}"? This deletes amounts for this category across all months.`)) {
      const newCats = settings.categories.filter((c: string) => c !== cat);
      setSettings({ ...settings, categories: newCats });
      await saveBudgetSettings(userId, { categories: newCats });
      removeExp(index);
    }
  };

  const handleCopySummary = async () => {
    if (!yearSummary) return;
    const text = `Lifestyle Cost Planner ${year}\nIncome: ${formatNGN(yearSummary.totalIncome)}\nExpenses: ${formatNGN(yearSummary.totalExpenses)} (${(yearSummary.expensesPercent * 100).toFixed(1)}%)\nLeft over: ${formatNGN(yearSummary.leftOverSoFar)}\nSaved & Invested: ${formatNGN(yearSummary.totalSaveAndInvest)}`;
    await navigator.clipboard.writeText(text);
    alert("Summary copied to clipboard!");
  };
  
  const handleTransfer = async () => {
    if (transferMonths.length === 0) return;
    setIsTransferring(true);
    const data = form.getValues();
    
    const promises = transferMonths.map(m => saveMonthlyBudget(userId, year, m, data));
    await Promise.all(promises);
    
    // update local state
    setMonthsData(prev => {
      const updated = [...prev];
      for (const m of transferMonths) {
        const idx = updated.findIndex(x => x.month === m);
        const newMonth = { year, month: m, incomes: data.incomes, expenses: data.expenses, savePercent: data.savePercent, investPercent: data.investPercent };
        if (idx >= 0) updated[idx] = newMonth;
        else updated.push(newMonth);
      }
      return updated;
    });
    
    setIsTransferring(false);
    setShowTransferModal(false);
    toast.success(`Copied to ${transferMonths.length} month(s)`);
  };

  if (isLoading || !settings || !currentMonthCalc || !yearSummary || !projection) {
    return (
      <div className="w-[98%] mx-auto space-y-6 pb-20 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-zinc-800 rounded w-64"></div>
          <div className="h-9 bg-zinc-800 rounded w-32"></div>
        </div>
        
        {/* Top Row: 4 Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm h-[104px]">
              <div className="h-3 bg-zinc-800 rounded w-24 mb-3"></div>
              <div className="h-8 bg-zinc-800 rounded w-32 mb-2"></div>
              <div className="h-3 bg-zinc-800 rounded w-40"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm h-[400px]">
              <div className="h-6 bg-zinc-800 rounded w-48 mb-6"></div>
              <div className="h-72 bg-zinc-800/50 rounded w-full"></div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm h-[200px]">
              <div className="flex justify-between items-start mb-6">
                <div className="h-6 bg-zinc-800 rounded w-48"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-zinc-800 rounded w-20"></div>
                  <div className="h-8 bg-zinc-800 rounded w-20"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-zinc-800/50 rounded-xl"></div>
                <div className="h-20 bg-zinc-800/50 rounded-xl"></div>
                <div className="h-20 bg-zinc-800/50 rounded-xl"></div>
              </div>
            </div>
          </div>
          
          {/* Right Column Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm h-[320px]">
              <div className="h-6 bg-zinc-800 rounded w-48 mb-6"></div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between"><div className="h-4 bg-zinc-800 rounded w-16"></div><div className="h-4 bg-zinc-800 rounded w-20"></div></div>
                <div className="flex justify-between"><div className="h-4 bg-zinc-800 rounded w-24"></div><div className="h-4 bg-zinc-800 rounded w-20"></div></div>
                <div className="pt-4 border-t border-zinc-800 flex justify-between"><div className="h-5 bg-zinc-800 rounded w-20"></div><div className="h-6 bg-zinc-800 rounded w-24"></div></div>
              </div>
              <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 bg-zinc-800 rounded w-16"></div>
                <div className="h-8 bg-zinc-800 rounded w-32"></div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="h-3 bg-zinc-800 rounded w-16 mb-2"></div>
                  <div className="h-12 bg-zinc-800 rounded-xl"></div>
                </div>
                <div>
                  <div className="h-3 bg-zinc-800 rounded w-20 mb-2"></div>
                  <div className="h-10 bg-zinc-800 rounded-lg mb-3"></div>
                  <div className="h-10 bg-zinc-800 rounded-lg mb-3"></div>
                  <div className="h-10 bg-zinc-800 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTotalIncome = (watchedValues.incomes || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const isMonthEmpty = currentTotalIncome === 0 && currentMonthCalc.expenses === 0;

  return (
    <div className="w-[98%] mx-auto space-y-6 pb-20 relative">
      
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Add {showAddModal === 'income' ? 'Income Source' : 'Expense Category'}</h3>
            <input 
              type="text" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              placeholder="e.g. Loan, Salary, Food"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 mb-4"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmAddCategory(); } }}
              disabled={isAddingCategory}
            />
            <div className="flex gap-3 justify-end">
              <button type="button" disabled={isAddingCategory} onClick={() => { setShowAddModal(null); setNewCatName(""); }} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isAddingCategory} onClick={confirmAddCategory} className="bg-teal-500 text-zinc-950 px-4 py-2 rounded-lg font-bold hover:bg-teal-400 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isAddingCategory && <div className="w-3 h-3 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin"></div>}
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-2">Copy Settings</h3>
            <p className="text-sm text-zinc-400 mb-4">Select the months you want to overwrite with {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth]}'s current numbers.</p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                <label key={m} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  i === selectedMonth ? "opacity-50 bg-zinc-950/50 border-zinc-800 grayscale cursor-not-allowed" :
                  transferMonths.includes(i) ? "bg-indigo-500/10 border-indigo-500" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                }`}>
                  <input 
                    type="checkbox" 
                    disabled={i === selectedMonth}
                    checked={transferMonths.includes(i)}
                    onChange={(e) => {
                      if (e.target.checked) setTransferMonths([...transferMonths, i]);
                      else setTransferMonths(transferMonths.filter(x => x !== i));
                    }}
                    className="accent-indigo-500"
                  />
                  <span className={`text-sm ${transferMonths.includes(i) ? "text-indigo-400 font-bold" : "text-white"}`}>{m}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end border-t border-zinc-800 pt-4">
              <button type="button" disabled={isTransferring} onClick={() => { setShowTransferModal(false); setTransferMonths([]); }} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isTransferring || transferMonths.length === 0} onClick={handleTransfer} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-400 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isTransferring ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> Copying...</>
                ) : (
                  `Copy to ${transferMonths.length} month(s)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header with Copy Summary */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white font-bricolage">Lifestyle Cost Planner</h1>
        <button
          onClick={handleCopySummary}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Copy className="w-4 h-4" /> Copy summary
        </button>
      </div>

      {/* Top Row: 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase mb-2">Income this year</h3>
          <p className="text-2xl font-black text-teal-400 font-bricolage">{formatNGN(yearSummary.totalIncome)}</p>
          <p className="text-xs text-zinc-500 mt-1">{yearSummary.monthsEntered} months entered</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase mb-2">Expenses this year</h3>
          <p className="text-2xl font-black text-amber-500 font-bricolage">{formatNGN(yearSummary.totalExpenses)}</p>
          <p className="text-xs text-zinc-500 mt-1">{(yearSummary.expensesPercent * 100).toFixed(1)}% of income</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase mb-2">Left over so far</h3>
          <p className={`text-2xl font-black font-bricolage ${yearSummary.leftOverSoFar >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {formatNGN(yearSummary.leftOverSoFar)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{(yearSummary.keptPercent * 100).toFixed(1)}% of income kept</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase mb-2">Saved & Invested</h3>
          <p className="text-2xl font-black text-indigo-400 font-bricolage">{formatNGN(yearSummary.totalSaveAndInvest)}</p>
          <p className="text-xs text-zinc-500 mt-1">From each month's split</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Chart */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-white font-bricolage mb-6">Income vs Expenses</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    onClick={(data) => setSelectedMonth(data.index)}
                    style={{ cursor: 'pointer' }}
                  />
                  <YAxis 
                    tickFormatter={shortNGN} 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: any) => formatNGN(Number(val) || 0)}
                  />
                  <ReferenceLine y={0} stroke="#3f3f46" />
                  <Bar dataKey="income" fill="#2dd4bf" radius={[4, 4, 0, 0]} maxBarSize={40} name="Income" />
                  <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} name="Expenses" />
                  <Scatter dataKey="surplusDot" fill="#10b981" name="Left Over" />
                  <Scatter dataKey="deficitDot" fill="#ef4444" name="Overspent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-zinc-500 mt-4 text-center">Click a month label on the axis to edit it.</p>
          </div>

          {/* Lifestyle Gap Line Chart */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-white font-bricolage mb-1">Lifestyle Gap</h2>
            <p className="text-xs text-zinc-400 mb-6">The space between these lines represents your financial breathing room.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    onClick={(data) => setSelectedMonth(data.index)}
                    style={{ cursor: 'pointer' }}
                  />
                  <YAxis 
                    tickFormatter={shortNGN} 
                    stroke="#71717a" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const inc = payload[0].payload.lineIncome;
                        const exp = payload[0].payload.lineExpenses;
                        const gap = inc - exp;
                        return (
                          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-xl">
                            <p className="text-white font-bold mb-2">{label}</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-teal-400">Income: {formatNGN(inc)}</p>
                              <p className="text-amber-500">Lifestyle: {formatNGN(exp)}</p>
                              <div className="pt-1 mt-1 border-t border-zinc-800">
                                <p className={`font-bold ${gap >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                  Gap: {gap > 0 ? '+' : ''}{formatNGN(gap)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="lineIncome" stroke="#2dd4bf" strokeWidth={3} name="Income" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="lineExpenses" stroke="#f59e0b" strokeWidth={3} name="Lifestyle (Expenses)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Investment Projection Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-bricolage flex items-center gap-2">
                  <TrendingUp className="text-indigo-400 w-5 h-5" /> Investment Projection
                </h2>
                <p className="text-xs text-zinc-400 mt-1">If you invest your average surplus ({formatNGN(projection.avgSurplus)}/mo)</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Return (%)</label>
                  <input 
                    type="number" 
                    value={settings.annualReturn} 
                    onChange={e => saveBudgetSettings(userId, { annualReturn: Number(e.target.value) }).then(() => setSettings({...settings, annualReturn: Number(e.target.value)}))}
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Years</label>
                  <input 
                    type="number" 
                    value={settings.years} 
                    onChange={e => saveBudgetSettings(userId, { years: Number(e.target.value) }).then(() => setSettings({...settings, years: Number(e.target.value)}))}
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Monthly</span>
                <span className="text-sm font-semibold text-white">{formatNGN(projection.monthlyInvest)}</span>
              </div>
              <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Total Put In</span>
                <span className="text-sm font-semibold text-white">{formatNGN(projection.totalInvested)}</span>
              </div>
              <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl relative">
                <span className="text-[10px] text-indigo-400 font-bold uppercase block mb-1">Future Value</span>
                <span className="text-lg font-bold text-indigo-400">{formatNGN(projection.futureValue)}</span>
                {projection.totalInvested > 0 && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    +{(((projection.futureValue - projection.totalInvested) / projection.totalInvested) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            <div className="h-64 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3f3f46" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="year" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={shortNGN} stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const invested = payload.find((p: any) => p.dataKey === 'totalInvested')?.value || 0;
                        const growth = payload.find((p: any) => p.dataKey === 'growth')?.value || 0;
                        const total = invested + growth;
                        const percentGrowth = invested > 0 ? ((growth / invested) * 100).toFixed(1) : "0.0";
                        return (
                          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-xl">
                            <p className="text-white font-bold mb-2">{label}</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-zinc-400">Total Put In: <span className="text-white">{formatNGN(invested)}</span></p>
                              <p className="text-indigo-400 flex items-center justify-between">
                                <span>Interest Earned: +{formatNGN(growth)}</span>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-3">+{percentGrowth}%</span>
                              </p>
                              <div className="pt-1 mt-1 border-t border-zinc-800">
                                <p className="font-bold text-indigo-300">Total Value: {formatNGN(total)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="totalInvested" stackId="1" stroke="#52525b" fill="url(#colorInvested)" name="Total Put In" />
                  <Area type="monotone" dataKey="growth" stackId="1" stroke="#818cf8" fill="url(#colorGrowth)" name="Interest Earned" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-zinc-500 text-center italic">
              An illustration only. Real returns vary and can be negative, and inflation reduces what the money buys.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Calculation Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <h2 className="text-lg font-bold text-white font-bricolage mb-6">Calculations for {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth]}</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Income</span>
                <span className="text-teal-400 font-medium">{formatNGN(currentTotalIncome)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Minus expenses</span>
                <span className="text-amber-500 font-medium">-{formatNGN(currentMonthCalc.expenses)}</span>
              </div>
              <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                <span className="font-bold text-white">Left over</span>
                <span className={`text-xl font-bold font-bricolage ${currentMonthCalc.leftOver >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatNGN(currentMonthCalc.leftOver)}
                </span>
              </div>
              {currentMonthCalc.leftOver > 0 && (
                <div className="text-right text-xs text-zinc-500">
                  {(currentMonthCalc.keptPercent * 100).toFixed(1)}% of income kept
                </div>
              )}
            </div>

            {currentMonthCalc.leftOver > 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Split what is left</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white flex items-center gap-1.5"><PiggyBank className="w-4 h-4 text-pink-400" /> Save {watchedValues.savePercent}%</span>
                      <span className="font-medium text-pink-400">{formatNGN(currentMonthCalc.saveAmount)}</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" {...form.register("savePercent", { valueAsNumber: true })} className="w-full accent-pink-500" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-indigo-400" /> Invest {watchedValues.investPercent}%</span>
                      <span className="font-medium text-indigo-400">{formatNGN(currentMonthCalc.investAmount)}</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" {...form.register("investPercent", { valueAsNumber: true })} className="w-full accent-indigo-500" />
                  </div>

                  {watchedValues.savePercent + watchedValues.investPercent > 100 && (
                     <div className="text-xs text-red-400">Cannot exceed 100%</div>
                  )}

                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs text-zinc-500">
                    <span>Kept as spending buffer ({(100 - watchedValues.savePercent - watchedValues.investPercent)}%)</span>
                    <span>{formatNGN(currentMonthCalc.bufferAmount)}</span>
                  </div>
                </div>
              </div>
            ) : currentMonthCalc.leftOver < 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 items-start">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">Nothing to save or invest this month. You spent <strong>{formatNGN(Math.abs(currentMonthCalc.leftOver))}</strong> more than you earned, so cover that gap before investing.</p>
              </div>
            ) : null}
          </div>

          {/* Month Entry Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white font-bricolage">Entry</h2>
                {isSaving ? (
                  <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div> Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="text-[10px] text-zinc-600 font-medium flex items-center gap-1">
                    <Save className="w-3 h-3" /> Saved
                  </span>
                ) : null}
              </div>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                  <option key={m} value={i}>{m} {year}</option>
                ))}
              </select>
            </div>

            {isMonthEmpty && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-4 rounded-xl mb-6 text-sm">
                No figures entered for {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth]}. Enter your income and expenses below.
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-teal-500 uppercase tracking-wider">Incomes</label>
                  <span className="text-xs text-zinc-500 font-medium">Total: {formatNGN(currentTotalIncome)}</span>
                </div>
                
                <div className="space-y-3">
                  {incFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50 shadow-inner">
                      <div className="flex-1">
                        <label className="block text-[10px] text-zinc-500 mb-1 font-semibold tracking-wide truncate">{field.source}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">₦</span>
                          <input
                            type="number"
                            {...form.register(`incomes.${index}.amount`, { valueAsNumber: true })}
                            className="w-full bg-zinc-900 border border-zinc-700 shadow-sm rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveIncomeSource(index)}
                        className="mt-5 p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800/80 hover:shadow-sm"
                        title="Remove source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowAddModal('income')}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add income source
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider">Expenses</label>
                  <span className="text-xs text-zinc-500 font-medium">Total: {formatNGN(currentMonthCalc.expenses)}</span>
                </div>
                
                <div className="space-y-3">
                  {expFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50 shadow-inner">
                      <div className="flex-1">
                        <label className="block text-[10px] text-zinc-500 mb-1 font-semibold tracking-wide truncate">{field.category}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">₦</span>
                          <input
                            type="number"
                            {...form.register(`expenses.${index}.amount`, { valueAsNumber: true })}
                            className="w-full bg-zinc-900 border border-zinc-700 shadow-sm rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCategory(index)}
                        className="mt-5 p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800/80 hover:shadow-sm"
                        title="Remove category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowAddModal('expense')}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add category
                </button>
              </div>
              
              <div className="pt-6 border-t border-zinc-800 space-y-3">
                <button
                  type="submit"
                  disabled={isSaving || isSaveSuccess}
                  className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isSaveSuccess 
                      ? 'bg-emerald-500 text-emerald-950' 
                      : 'bg-teal-500 hover:bg-teal-600 text-zinc-950 disabled:opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin"></div>
                      Saving...
                    </>
                  ) : isSaveSuccess ? (
                    <>
                      <Save className="w-4 h-4" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Settings
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy to other months
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
