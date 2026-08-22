"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  useEffect(() => {
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
  }, []);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    router.push(`/admin/budget-strategy?periodId=${encodeURIComponent(pId)}`);
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
        router.push(`/admin/budget-strategy?periodId=${data.data.period.id}`);
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
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="animate-pulse h-10 w-48 bg-slate-800 rounded"></div>;
  }

  const isViewingPastPeriod = currentPeriodId && currentPeriodId !== activePeriodId;

  return (
    <div className="flex items-center gap-4">
      <select 
        value={currentPeriodId} 
        onChange={handlePeriodChange}
        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
      >
        {periods.map(p => (
          <option key={p.id} value={p.id}>
            {p.label} {p.id === activePeriodId ? "(Active)" : ""}
          </option>
        ))}
      </select>

      {isViewingPastPeriod && (
        <button 
          onClick={() => openModal(true)}
          disabled={isCreating}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
        >
          {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Set as active
        </button>
      )}

      {!isViewingPastPeriod && (
        <button 
          onClick={() => openModal(false)}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
        >
          {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Start New Period
        </button>
      )}

      {/* Custom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 overflow-hidden relative">
            <h3 className="text-lg font-semibold text-white mb-2">
              {isRestoreMode ? "Restore Period" : "Start New Period"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Enter a name for your new budget period (e.g. "August 2026").
            </p>
            <form onSubmit={handleCreatePeriod}>
              <div className="mb-6">
                <input
                  type="text"
                  autoFocus
                  placeholder="Period Label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  disabled={isCreating}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium text-slate-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newLabel.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium text-white disabled:opacity-50 flex items-center transition-colors"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isRestoreMode ? "Restore & Start" : "Start Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
