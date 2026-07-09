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

  const startNewPeriod = async (isRestore: boolean = false) => {
    let newLabel = prompt("Enter label for the new period (e.g. 03/2027):");
    if (!newLabel) return;
    
    setIsCreating(true);
    try {
      const payload = {
        label: newLabel,
        triggeredBy: isRestore ? "restore" : "manual",
        restoredFromPeriodId: isRestore ? currentPeriodId : undefined
      };

      const res = await fetch("/api/budgeting/strategy/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully ${isRestore ? 'restored and ' : ''}started period: ${newLabel}`);
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
          onClick={() => startNewPeriod(true)}
          disabled={isCreating}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
        >
          {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Set as active
        </button>
      )}

      {!isViewingPastPeriod && (
        <button 
          onClick={() => startNewPeriod(false)}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
        >
          {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Start New Period
        </button>
      )}
    </div>
  );
}
