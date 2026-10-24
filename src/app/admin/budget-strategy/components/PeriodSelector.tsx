"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Sparkles, Archive, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Period {
  id: string;
  label: string;
  startDate: string;
}

interface PeriodSelectorProps {
  currentPeriodId: string;
}

export function PeriodSelector({ currentPeriodId }: PeriodSelectorProps) {
  const router = useRouter();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestoreMode, setIsRestoreMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const loadPeriods = () => {
    fetch("/api/budgeting/strategy/period?list=true")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setPeriods(data.data.periods);
          setActivePeriodId(data.data.activePeriodId);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const navigateToPeriod = (pId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("periodId", pId);
    if (window.location.pathname === "/admin") {
      url.searchParams.set("tab", "budget-strategy");
    }
    router.push(url.pathname + "?" + url.searchParams.toString());
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigateToPeriod(e.target.value);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    
    setIsCreating(true);
    try {
      const payload = {
        label: newLabel.trim(),
        triggeredBy: isRestoreMode ? "restore" : "manual",
        restoredFromPeriodId: isRestoreMode ? currentPeriodId : undefined
      };

      const res = await fetch("/api/budgeting/strategy/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewLabel("");
        navigateToPeriod(data.data.period.id);
        router.refresh();
      } else {
        alert(data.error?.message || "Failed to create period");
      }
    } catch (e) {
      alert("Error creating period");
    }
    setIsCreating(false);
  };

  const openModal = (isRestore: boolean = false) => {
    setIsRestoreMode(isRestore);
    // Suggest next month's name
    if (!isRestore) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      const suggestedName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      setNewLabel(suggestedName);
    } else {
      setNewLabel("");
    }
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="animate-pulse h-10 w-48 bg-slate-800 rounded-xl"></div>;
  }

  const isViewingPastPeriod = currentPeriodId && currentPeriodId !== activePeriodId;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
      {/* Month Selector dropdown */}
      <div className="relative flex-1 sm:w-56">
        <div className="absolute left-3 top-2.5 pointer-events-none text-slate-400">
          <Calendar className="w-4 h-4" />
        </div>
        <select 
          value={currentPeriodId} 
          onChange={handlePeriodChange}
          className="w-full bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
        >
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.label} {p.id === activePeriodId ? "• (Active)" : "• (Snapshot)"}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      {isViewingPastPeriod ? (
        <button 
          onClick={() => openModal(true)}
          disabled={isCreating}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
          Restore as Active
        </button>
      ) : (
        <button 
          onClick={() => openModal(false)}
          disabled={isCreating}
          className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all whitespace-nowrap"
          title="Snapshot current month and start new fresh month"
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          New Month Snapshot
        </button>
      )}

      {/* Snapshot / Rollover Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 relative">
            <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
              {isRestoreMode ? (
                <>
                  <Archive className="w-5 h-5 text-emerald-400" />
                  Restore Period Snapshot
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Start New Month & Save Snapshot
                </>
              )}
            </h3>

            <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              {isRestoreMode ? (
                "This will duplicate the selected snapshot into a new active month with your recorded goals."
              ) : (
                "A permanent snapshot of the current month (with all used checkmarks & logged expenses) will be archived to the database. The new month will begin as a fresh, unmarked copy with your goals carried over."
              )}
            </p>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Month Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. November 2026"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs sm:text-sm font-medium text-slate-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newLabel.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs sm:text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 transition-colors"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isRestoreMode ? "Restore & Activate" : "Snapshot & Start"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
