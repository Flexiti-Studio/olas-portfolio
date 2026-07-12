"use client";

import { useState, useEffect, useMemo } from "react";
import { Banknote, Save, Calendar as CalendarIcon, TrendingUp, Plus, Edit2, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { motion } from "framer-motion";

type DailyStat = {
  date: string;
  totalLinks: number;
  earnings: number;
};

type WeeklyStat = {
  weekStart: string;
  weekEnd: string;
  totalLinks: number;
  earnings: number;
  days: DailyStat[];
  target: number;
};

export default function PaymentTracker() {
  const [costPerLink, setCostPerLink] = useState(50);
  const [inputCost, setInputCost] = useState("50");
  const [weeklyTarget, setWeeklyTarget] = useState(10000);
  const [inputTarget, setInputTarget] = useState("10000");
  const [sessionTarget, setSessionTarget] = useState(20);
  const [inputSessionTarget, setInputSessionTarget] = useState("20");
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSpecificTarget, setIsSavingSpecificTarget] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualLinks, setManualLinks] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/task/payments");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCostPerLink(json.costPerLink);
          setInputCost(json.costPerLink.toString());
          setSessionTarget(json.sessionTarget || 20);
          setInputSessionTarget((json.sessionTarget || 20).toString());
          setWeeklyTarget(json.weeklyTarget);
          setInputTarget(json.weeklyTarget.toString());
          setDailyStats(json.dailyStats);
          setWeeklyStats(json.weeklyStats);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const parsedCost = parseFloat(inputCost);
      const parsedSession = parseInt(inputSessionTarget, 10);
      if (isNaN(parsedCost) || parsedCost < 0 || isNaN(parsedSession) || parsedSession < 1) return;

      const res = await fetch("/api/task/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          costPerLink: parsedCost,
          sessionTarget: parsedSession
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSpecificTarget = async () => {
    if (weeklyStats.length === 0) return;
    setIsSavingSpecificTarget(true);
    try {
      const parsedTarget = parseFloat(inputTarget);
      if (isNaN(parsedTarget) || parsedTarget < 0) return;

      const currentWeek = weeklyStats[selectedWeekIdx];
      const res = await fetch("/api/task/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          weekStart: currentWeek.weekStart,
          specificTarget: parsedTarget 
        }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSpecificTarget(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/task/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: manualDate, totalLinks: parseInt(manualLinks, 10) }),
      });
      if (res.ok) {
        setShowManualEntry(false);
        setManualLinks("");
        await fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (isLoading) {
    return <div className="text-zinc-400">Loading payments...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Settings Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Banknote className="text-green-500" />
          Payment Settings
        </h3>
        
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-xl">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Cost per Link (₦)</label>
            <input
              type="number"
              value={inputCost}
              onChange={(e) => setInputCost(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Daily Session Limit</label>
            <input
              type="number"
              value={inputSessionTarget}
              onChange={(e) => setInputSessionTarget(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || (inputCost === costPerLink.toString() && inputSessionTarget === sessionTarget.toString())}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save Default"}
          </button>
        </div>
      </div>

      {/* Calendar Grid Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="text-purple-500" />
            Activity Calendar
          </h3>
          <div className="flex items-center justify-between sm:justify-start gap-4 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 w-full sm:w-auto">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronLeft size={18} className="text-zinc-400" />
            </button>
            <span className="text-zinc-200 font-medium text-sm w-32 text-center">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <ChevronRight size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-zinc-500 py-2">
              {day}
            </div>
          ))}
          
          {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
            <div key={`blank-${i}`} className="p-2" />
          ))}

          {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
            const dateNumber = i + 1;
            const fullDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dateNumber).padStart(2, '0')}`;
            const statForDay = dailyStats.find(s => s.date === fullDateStr);

            return (
              <button
                key={dateNumber}
                onClick={() => {
                  setManualDate(fullDateStr);
                  setManualLinks(statForDay ? statForDay.totalLinks.toString() : "");
                  setShowManualEntry(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative p-1.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all group hover:border-blue-500
                  ${statForDay ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}
                `}
              >
                <span className={`text-xs sm:text-sm font-medium ${statForDay ? 'text-indigo-400' : 'text-zinc-500'}`}>
                  {dateNumber}
                </span>
                
                {statForDay && (
                  <div className="flex flex-col items-center mt-0.5 w-full overflow-hidden">
                    <span className="text-[8px] sm:text-[10px] font-bold text-green-400 leading-none truncate w-full text-center">
                      ₦{statForDay.earnings.toLocaleString()}
                    </span>
                    <span className="text-[8px] sm:text-[10px] text-zinc-500 leading-tight hidden sm:block truncate w-full text-center mt-0.5">
                      {statForDay.totalLinks} links
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/50 rounded-xl transition-all pointer-events-none opacity-0 group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Weekly Breakdown & Target */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="text-indigo-500" />
              Weekly Goal Progress
            </h3>
            
            {weeklyStats.length > 0 && (
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    const nextIdx = Math.min(weeklyStats.length - 1, selectedWeekIdx + 1);
                    setSelectedWeekIdx(nextIdx);
                    setInputTarget(weeklyStats[nextIdx].target.toString());
                  }}
                  disabled={selectedWeekIdx === weeklyStats.length - 1}
                  className="p-1 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors"
                >
                  <ChevronLeft size={18} className="text-zinc-400" />
                </button>
                <span className="text-zinc-200 font-medium text-[10px] sm:text-xs text-center">
                  {selectedWeekIdx === 0 ? "Current Week" : `${weeklyStats[selectedWeekIdx].weekStart} - ${weeklyStats[selectedWeekIdx].weekEnd}`}
                </span>
                <button 
                  onClick={() => {
                    const prevIdx = Math.max(0, selectedWeekIdx - 1);
                    setSelectedWeekIdx(prevIdx);
                    setInputTarget(weeklyStats[prevIdx].target.toString());
                  }}
                  disabled={selectedWeekIdx === 0}
                  className="p-1 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors"
                >
                  <ChevronRight size={18} className="text-zinc-400" />
                </button>
              </div>
            )}
          </div>

          {weeklyStats.length > 0 && (
            <div className="mb-8">
              <div className="flex gap-2 items-center mb-4 bg-zinc-950 p-2 rounded-xl border border-zinc-800 w-full sm:max-w-[200px] sm:ml-auto">
                <span className="text-xs font-medium text-zinc-400 pl-2 whitespace-nowrap">Target ₦</span>
                <input
                  type="number"
                  value={inputTarget}
                  onChange={(e) => setInputTarget(e.target.value)}
                  className="w-full bg-transparent text-white font-semibold focus:outline-none text-right px-1"
                />
                <button
                  onClick={handleSaveSpecificTarget}
                  disabled={isSavingSpecificTarget || inputTarget === weeklyStats[selectedWeekIdx].target.toString()}
                  className="p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:bg-zinc-800 rounded-lg text-white transition-colors"
                >
                  <Save size={14} />
                </button>
              </div>

              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-400 mb-1">Week Earnings</p>
                      <p className="text-3xl font-bold text-white mb-1">₦{weeklyStats[selectedWeekIdx].earnings.toLocaleString()}</p>
                      <p className="text-xs font-medium text-zinc-500 bg-zinc-900 inline-block px-2 py-1 rounded-md border border-zinc-800">
                        {weeklyStats[selectedWeekIdx].totalLinks} links applied
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Target</p>
                      <p className="text-lg font-semibold text-indigo-400">₦{weeklyStats[selectedWeekIdx].target.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="h-3 w-full bg-zinc-800 rounded-full mt-4 overflow-hidden relative">
                    <motion.div 
                      key={weeklyStats[selectedWeekIdx].weekStart}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (weeklyStats[selectedWeekIdx].earnings / weeklyStats[selectedWeekIdx].target) * 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${weeklyStats[selectedWeekIdx].earnings >= weeklyStats[selectedWeekIdx].target ? 'bg-green-500' : 'bg-indigo-500'}`}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-zinc-500 font-medium">
                      {Math.round(Math.min(100, (weeklyStats[selectedWeekIdx].earnings / weeklyStats[selectedWeekIdx].target) * 100))}% reached
                    </p>
                    {weeklyStats[selectedWeekIdx].earnings >= weeklyStats[selectedWeekIdx].target ? (
                      <p className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md">Goal Met! 🎉</p>
                    ) : (
                      <p className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
                        {Math.ceil(Math.max(0, weeklyStats[selectedWeekIdx].target - weeklyStats[selectedWeekIdx].earnings) / costPerLink)} links left
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="text-zinc-400" />
            Previous Weeks
          </h3>
          
          <div className="space-y-4">
            {weeklyStats.slice(1).map((week, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={week.weekStart} 
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-300 font-medium">{week.weekStart} to {week.weekEnd}</p>
                    <p className="text-sm text-zinc-500">{week.totalLinks} links applied</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-400">₦{week.earnings.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">Target: ₦{weeklyTarget.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {Math.round(Math.min(100, (week.earnings / week.target) * 100))}%
                    </span>
                    <span className="text-[10px] font-medium">
                      {week.earnings >= week.target ? (
                        <span className="text-green-400">Goal Met</span>
                      ) : (
                        <span className="text-amber-400">{Math.ceil(Math.max(0, week.target - week.earnings) / costPerLink)} links missed</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${week.earnings >= week.target ? 'bg-green-500' : 'bg-indigo-500/50'}`}
                      style={{ width: `${Math.min(100, (week.earnings / week.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
            {weeklyStats.length <= 1 && (
              <p className="text-zinc-500 text-sm italic">No previous weeks available yet.</p>
            )}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="text-blue-500" />
              Daily Earnings
            </h3>
            <button 
              onClick={() => {
                if (!showManualEntry) {
                  setManualDate(new Date().toISOString().split('T')[0]);
                  setManualLinks("");
                }
                setShowManualEntry(!showManualEntry);
              }}
              className="text-sm px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus size={16} /> Add / Edit Day
            </button>
          </div>

          {showManualEntry && (
            <form onSubmit={handleManualEntry} className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-zinc-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm text-zinc-400 mb-1">Total Links Applied</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={manualLinks}
                    onChange={(e) => setManualLinks(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 40"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isSubmittingManual ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {dailyStats.map((day, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={day.date} 
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between"
              >
                <div>
                  <p className="text-zinc-300 font-medium">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-sm text-zinc-500">{day.totalLinks} links applied</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <p className="text-lg font-bold text-green-400">₦{day.earnings.toLocaleString()}</p>
                  <button 
                    onClick={() => {
                      setManualDate(day.date);
                      setManualLinks(day.totalLinks.toString());
                      setShowManualEntry(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                    title="Edit Day"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
            {dailyStats.length === 0 && (
              <p className="text-zinc-500">No data available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
