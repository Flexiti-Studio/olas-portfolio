"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save, Wallet, CheckCircle2, Trash2, CalendarClock, Circle, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subMonths, isAfter } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SalaryBenchmarker() {
  const [netWorth, setNetWorth] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any>({ netWorth: {}, monthlyIncome: {} });

  useEffect(() => {
    // Fetch Settings
    fetch("/api/settings?key=salary_benchmark")
      .then(res => res.json())
      .then(data => {
        if (data.value) {
          setNetWorth(data.value.netWorth?.toString() || "");
          setMonthlyIncome(data.value.monthlyIncome?.toString() || "");
        }
      })
      .catch(console.error);

    // Fetch Goals (Saved Plans)
    fetch("/api/goals")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const plans = data.data.filter((g: any) => g.title.includes("for Purchase"));
          setSavedPlans(plans);
        }
      })
      .finally(() => setIsLoading(false));

    // Fetch Financial History
    fetch("/api/financial-history")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const formatted = data.data.map((item: any) => ({
            ...item,
            dateLabel: format(new Date(item.created_at), "MMM d, yyyy"),
            timestamp: new Date(item.created_at).getTime(),
          })).sort((a: any, b: any) => a.timestamp - b.timestamp);
          
          setHistoryData(formatted);
          calculateStats(formatted);
        }
      })
      .catch(console.error);
  }, []);

  const calculateStats = (data: any[]) => {
    if (data.length < 2) return;
    
    const latest = data[data.length - 1];
    const now = new Date();
    
    const getPointAtOffset = (months: number) => {
      const targetDate = subMonths(now, months).getTime();
      // Find closest point before or equal to targetDate
      let closest = data[0];
      for (const pt of data) {
        if (pt.timestamp <= targetDate) closest = pt;
        else break;
      }
      return closest;
    };

    const calcPercent = (current: number, past: number) => {
      if (!past || past === 0) return 0;
      return Number((((current - past) / past) * 100).toFixed(1));
    };

    const offsets = [
      { key: '1mo', val: 1, label: 'Past Month' },
      { key: '3mo', val: 3, label: 'Past 3 Months' },
      { key: '6mo', val: 6, label: 'Past 6 Months' },
      { key: '1yr', val: 12, label: 'Past Year' },
    ];

    const stats = { netWorth: {} as any, monthlyIncome: {} as any };

    offsets.forEach(off => {
      const pastPt = getPointAtOffset(off.val);
      stats.netWorth[off.key] = calcPercent(latest.netWorth, pastPt.netWorth);
      stats.monthlyIncome[off.key] = calcPercent(latest.monthlyIncome, pastPt.monthlyIncome);
    });

    setHistoryStats(stats);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "salary_benchmark",
          value: {
            netWorth: Number(netWorth) || 0,
            monthlyIncome: Number(monthlyIncome) || 0
          }
        })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      // Refresh history silently
      fetch("/api/financial-history")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const formatted = data.data.map((item: any) => ({
              ...item,
              dateLabel: format(new Date(item.created_at), "MMM d, yyyy"),
              timestamp: new Date(item.created_at).getTime(),
            })).sort((a: any, b: any) => a.timestamp - b.timestamp);
            setHistoryData(formatted);
            calculateStats(formatted);
          }
        });
    }
  };

  const handleToggleTimelineItem = async (planId: string, itemIdx: number) => {
    const plan = savedPlans.find(p => p.id === planId);
    if (!plan) return;

    const newTimeline = [...plan.timeline];
    newTimeline[itemIdx].completed = !newTimeline[itemIdx].completed;

    // Optimistic update
    setSavedPlans(prev => prev.map(p => p.id === planId ? { ...p, timeline: newTimeline } : p));

    try {
      const res = await fetch(`/api/goals/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: newTimeline })
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update saving plan");
      // Revert on error
      newTimeline[itemIdx].completed = !newTimeline[itemIdx].completed;
      setSavedPlans(prev => prev.map(p => p.id === planId ? { ...p, timeline: newTimeline } : p));
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this saving plan?")) return;
    
    // Optimistic delete
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
    
    try {
      const res = await fetch(`/api/goals/${planId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Saving plan deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete saving plan");
      // We'd normally refetch here on error to restore the list
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Settings Section for Calculator */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Calculator Settings</h3>
            <p className="text-sm text-zinc-400">Set your baseline financials for the Purchase Affordability Planner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Monthly Income (Net)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₦</span>
              <input 
                type="number"
                value={monthlyIncome}
                onChange={e => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Total Net Worth</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₦</span>
              <input 
                type="number"
                value={netWorth}
                onChange={e => setNetWorth(e.target.value)}
                placeholder="e.g. 2000000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50"
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaving ? "Saving..." : saved ? "Saved to Database" : "Save Financial Baseline"}
        </button>
      </div>

      {/* Financial History Tracking */}
      {historyData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Financial Growth History</h3>
              <p className="text-sm text-zinc-400">Track changes to your net worth and income over time</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {['netWorth', 'monthlyIncome'].map((metric) => {
              const label = metric === 'netWorth' ? 'Net Worth' : 'Monthly Income';
              const stats = historyStats[metric];
              if (!stats) return null;

              return (
                <div key={metric} className="bg-zinc-950 border border-zinc-850 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-zinc-300 mb-4">{label} Growth</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: '1mo', label: '1 Month' },
                      { key: '3mo', label: '3 Months' },
                      { key: '6mo', label: '6 Months' },
                      { key: '1yr', label: '1 Year' },
                    ].map(off => {
                      const val = stats[off.key];
                      const isPos = val > 0;
                      const isNeg = val < 0;
                      return (
                        <div key={off.key} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">{off.label}</span>
                          <div className="flex items-center gap-1.5">
                            {isPos ? <TrendingUp size={14} className="text-emerald-400" /> : 
                             isNeg ? <TrendingDown size={14} className="text-red-400" /> : 
                             <Minus size={14} className="text-zinc-500" />}
                            <span className={`text-sm font-bold ${isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-zinc-400'}`}>
                              {isPos ? '+' : ''}{val}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="dateLabel" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis 
                  yAxisId="left" 
                  stroke="#10b981" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#6366f1" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}
                  formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, undefined]}
                />
                <Line yAxisId="left" type="monotone" dataKey="netWorth" name="Net Worth" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="monthlyIncome" name="Monthly Income" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Saved Purchase Plans */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <CalendarClock size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Active Saving Plans</h3>
            <p className="text-sm text-zinc-400">Track your progress for upcoming purchases</p>
          </div>
        </div>

        {savedPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedPlans.map(plan => {
              const target = Number(plan.targetAmount) || 0;
              const completedCount = plan.timeline?.filter((t: any) => t.completed).length || 0;
              const totalCount = plan.timeline?.length || 0;
              const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              
              return (
                <div key={plan.id} className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-1 pr-8" title={plan.title}>{plan.title}</h4>
                      <p className="text-xs text-indigo-400 font-medium mt-1">
                        Target: ₦{target.toLocaleString()} • {percent}% saved
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDeletePlan(plan.id)}
                      className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 p-1.5 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden mb-4">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {plan.timeline?.map((item: any, idx: number) => (
                      <div 
                        key={item.id || idx}
                        onClick={() => handleToggleTimelineItem(plan.id, idx)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                          item.completed 
                            ? "bg-indigo-900/10 border-indigo-500/20" 
                            : "bg-zinc-900/30 border-transparent hover:bg-zinc-900"
                        }`}
                      >
                        {item.completed ? (
                          <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                        ) : (
                          <Circle size={16} className="text-zinc-600 shrink-0" />
                        )}
                        <span className={`text-xs ${item.completed ? "text-indigo-200 font-medium line-through opacity-70" : "text-zinc-300"}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-950/50 border border-zinc-850 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-zinc-500">
            <Wallet size={48} className="mb-4 opacity-30 text-indigo-500" />
            <p className="text-sm mt-2 text-center">No active saving plans.</p>
            <p className="text-xs mt-1 text-center">Use the Purchase Affordability Planner on the Overview page to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
