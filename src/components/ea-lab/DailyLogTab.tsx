"use client";

import React, { useState } from 'react';
import { RunLike, TradeLike, calculateTradeMetrics } from '@/lib/ea-lab/metrics';
import { getLagosDateKey, formatLagosDateDisplay, formatLagosDateTimeDisplay } from '@/lib/ea-lab/timezone';
import { upsertDayJournal, updateTradeProfit, getTestRunRawLog } from '@/app/actions/eaLab';
import { EditRunModal } from './EditRunModal';
import { toast } from 'sonner';

interface DailyLogTabProps {
  strategyId: string;
  runs: RunLike[];
  dayJournals: { id: string; date: string; notes: string }[];
  versions?: { id: string; label: string }[];
}

interface DayGroup {
  dateKey: string;
  displayDate: string;
  runs: (RunLike & { runNumber: number })[];
  aggregateMetrics: ReturnType<typeof calculateTradeMetrics>;
  journalNotes: string;
}

export function DailyLogTab({ strategyId, runs, dayJournals, versions = [] }: DailyLogTabProps) {
  // Version filter state ('all' or specific versionId)
  const [selectedVersionId, setSelectedVersionId] = useState<string>('all');

  // Compute version stats for sidebar
  const versionStats = React.useMemo(() => {
    return versions.map((v) => {
      const vRuns = runs.filter((r) => r.versionId === v.id);
      const totalTrades = vRuns.reduce((sum, r) => sum + (r.tradesCount ?? (r.trades?.length || 0)), 0);
      const totalProfit = Number(vRuns.reduce((sum, r) => sum + (r.netProfit || 0), 0).toFixed(2));
      return {
        ...v,
        runsCount: vRuns.length,
        tradesCount: totalTrades,
        netProfit: totalProfit,
      };
    });
  }, [runs, versions]);

  // Total runs without assigned version or for 'all'
  const unassignedRunsCount = React.useMemo(() => {
    return runs.filter((r) => !r.versionId).length;
  }, [runs]);

  // Filter runs based on selectedVersionId
  const filteredRuns = React.useMemo(() => {
    if (selectedVersionId === 'all') return runs;
    if (selectedVersionId === 'unassigned') return runs.filter((r) => !r.versionId);
    return runs.filter((r) => r.versionId === selectedVersionId);
  }, [runs, selectedVersionId]);

  // Group filtered runs by Africa/Lagos date of testedAt
  const dayGroups: DayGroup[] = React.useMemo(() => {
    const groupsMap = new Map<string, RunLike[]>();

    // Sort filtered runs chronologically by testedAt
    const sortedRuns = [...filteredRuns].sort((a, b) => {
      const timeA = new Date(a.testedAt || 0).getTime();
      const timeB = new Date(b.testedAt || 0).getTime();
      return timeA - timeB;
    });

    sortedRuns.forEach((run) => {
      const dateKey = getLagosDateKey(run.testedAt || new Date());
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(run);
    });

    // Convert to sorted array (most recent day first)
    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const dayRunsRaw = groupsMap.get(dateKey)!;
      // Number the runs of that day #1, #2, #3... by testedAt asc
      const numberedRuns = dayRunsRaw.map((r, idx) => ({
        ...r,
        runNumber: idx + 1,
      }));

      // Aggregate all trades of that day
      const allTrades: TradeLike[] = [];
      let sumDeposit = 0;
      let sumBalance = 0;
      numberedRuns.forEach((r) => {
        sumDeposit += r.initialDeposit || 10000;
        sumBalance += r.finalBalance || 10000;
        if (r.trades) allTrades.push(...r.trades);
      });

      const aggregateMetrics = calculateTradeMetrics(allTrades, sumDeposit, sumBalance);
      const existingJournal = dayJournals.find((j) => j.date === dateKey);

      return {
        dateKey,
        displayDate: formatLagosDateDisplay(dateKey),
        runs: numberedRuns,
        aggregateMetrics,
        journalNotes: existingJournal?.notes || '',
      };
    });
  }, [filteredRuns, dayJournals]);

  // Accordion open states
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(() => {
    // Default open the first day
    if (dayGroups.length > 0) {
      return { [dayGroups[0].dateKey]: true };
    }
    return {};
  });

  const [openRuns, setOpenRuns] = useState<Record<string, boolean>>({});
  const [dayNotesState, setDayNotesState] = useState<Record<string, string>>({});
  const [savingDay, setSavingDay] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState<Record<string, boolean>>({});

  // Editing run state
  const [editingRun, setEditingRun] = useState<RunLike | null>(null);

  // Raw log modal state
  const [activeRawLog, setActiveRawLog] = useState<{ title: string; log: string } | null>(null);
  const [loadingRawLogId, setLoadingRawLogId] = useState<string | null>(null);

  async function handleViewRawLog(run: RunLike & { runNumber: number }) {
    if (run.rawLog) {
      setActiveRawLog({
        title: `Raw Log - Run #${run.runNumber} (${run.symbol})`,
        log: run.rawLog,
      });
      return;
    }
    if (!run.id) return;
    setLoadingRawLogId(run.id);
    try {
      const raw = await getTestRunRawLog(run.id);
      setActiveRawLog({
        title: `Raw Log - Run #${run.runNumber} (${run.symbol})`,
        log: raw || 'No raw log saved for this backtest run.',
      });
    } catch (e) {
      toast.error('Failed to load raw tester log');
    } finally {
      setLoadingRawLogId(null);
    }
  }

  // Per-trade manual profit editing state
  const [editingProfitTradeId, setEditingProfitTradeId] = useState<string | null>(null);
  const [manualProfitInput, setManualProfitInput] = useState<string>('');
  const [savingProfit, setSavingProfit] = useState(false);

  // Pagination for trade lists (10 per page, per run)
  const [runTradePages, setRunTradePages] = useState<Record<string, number>>({});
  const TRADES_PER_PAGE = 10;

  function toggleDay(dateKey: string) {
    setOpenDays((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  }

  function toggleRun(runId: string) {
    setOpenRuns((prev) => ({ ...prev, [runId]: !prev[runId] }));
  }

  async function handleSaveDayJournal(dateKey: string) {
    const currentNotes = dayNotesState[dateKey] ?? dayGroups.find((g) => g.dateKey === dateKey)?.journalNotes ?? '';
    setSavingDay((prev) => ({ ...prev, [dateKey]: true }));

    const res = await upsertDayJournal({
      strategyId,
      date: dateKey,
      notes: currentNotes,
    });

    setSavingDay((prev) => ({ ...prev, [dateKey]: false }));
    if (res.success) {
      toast.success(`Journal notes saved for ${formatLagosDateDisplay(dateKey)}!`);
      setSavedSuccess((prev) => ({ ...prev, [dateKey]: true }));
      setTimeout(() => {
        setSavedSuccess((prev) => ({ ...prev, [dateKey]: false }));
      }, 2500);
    } else {
      toast.error(res.error || 'Failed to save day journal');
    }
  }

  async function handleSaveTradeProfit(tradeId: string) {
    const profitNum = manualProfitInput.trim() === '' ? null : parseFloat(manualProfitInput);
    if (profitNum !== null && isNaN(profitNum)) return;

    setSavingProfit(true);
    const res = await updateTradeProfit({
      tradeId,
      profit: profitNum,
    });
    setSavingProfit(false);
    setEditingProfitTradeId(null);
    if (res.success) {
      toast.success('Trade profit updated successfully!');
    } else {
      toast.error(res.error || 'Failed to update trade profit');
    }
  }

  const activeVersionLabel = React.useMemo(() => {
    if (selectedVersionId === 'all') return 'All Versions';
    if (selectedVersionId === 'unassigned') return 'Unassigned';
    return versions.find((v) => v.id === selectedVersionId)?.label || 'Selected Version';
  }, [selectedVersionId, versions]);

  return (
    <>
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* LEFT: Version Navigation Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-lg">alt_route</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Versions</h3>
              </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              {runs.length} Runs
            </span>
          </div>

          <div className="space-y-1.5">
            {/* "All Versions" Option */}
            <button
              type="button"
              onClick={() => setSelectedVersionId('all')}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                selectedVersionId === 'all'
                  ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                  : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedVersionId === 'all' ? 'bg-blue-400' : 'bg-zinc-600'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">All Versions</div>
                  <div className="text-[10px] text-zinc-500">Combined daily logs</div>
                </div>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  selectedVersionId === 'all'
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {runs.length}
              </span>
            </button>

            {/* Individual Version Items */}
            {versionStats.map((ver) => {
              const isSelected = selectedVersionId === ver.id;
              const hasRuns = ver.runsCount > 0;
              return (
                <button
                  key={ver.id}
                  type="button"
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                      : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{ver.label}</span>
                      {hasRuns && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            ver.netProfit >= 0
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {ver.netProfit >= 0 ? `+$${ver.netProfit}` : `-$${Math.abs(ver.netProfit)}`}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                      {ver.runsCount} {ver.runsCount === 1 ? 'test' : 'tests'} • {ver.tradesCount} trades
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {ver.runsCount}
                  </span>
                </button>
              );
            })}

            {/* Unassigned Runs Option if any */}
            {unassignedRunsCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedVersionId('unassigned')}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                  selectedVersionId === 'unassigned'
                    ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                    : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-zinc-400">Unassigned Version</div>
                  <div className="text-[10px] text-zinc-500">Runs without version tag</div>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedVersionId === 'unassigned'
                      ? 'bg-blue-500/30 text-blue-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {unassignedRunsCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Info Card */}
        <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-blue-400 text-xs">info</span>
            Version Filter
          </div>
          <p className="leading-relaxed">
            Selecting a version isolates the daily logs, daily metrics, and journal records specifically to that EA iteration.
          </p>
        </div>
      </aside>

      {/* RIGHT: Main Daily Logs Stream */}
      <div className="flex-1 w-full min-w-0 space-y-4">
        {/* Header Strip showing active version scope and quick badges */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Showing logs for:</span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">tune</span>
              {activeVersionLabel}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              ({filteredRuns.length} total run{filteredRuns.length === 1 ? '' : 's'})
            </span>
          </div>

          {selectedVersionId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedVersionId('all')}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>
              Reset to all versions
            </button>
          )}
        </div>

        {/* Empty state when no runs match */}
        {dayGroups.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl">
            <span className="material-symbols-outlined text-zinc-600 text-5xl mb-3">calendar_month</span>
            <h4 className="text-base font-bold text-white mb-1">
              No Daily Test Logs for {activeVersionLabel}
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              There are no strategy tester runs saved under this version. Switch versions in the sidebar or add a test run to populate logs.
            </p>
            {selectedVersionId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedVersionId('all')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-800 transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                View All Versions ({runs.length} runs)
              </button>
            )}
          </div>
        ) : (
          dayGroups.map((group) => {
            const isOpen = openDays[group.dateKey] ?? false;
            const currentNotes = dayNotesState[group.dateKey] ?? group.journalNotes;
            const isSaving = savingDay[group.dateKey] || false;
            const isSaved = savedSuccess[group.dateKey] || false;

        return (
          <div
            key={group.dateKey}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all"
          >
            {/* Day Accordion Header */}
            <div
              onClick={() => toggleDay(group.dateKey)}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/40 transition-colors select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-400 text-xl">event</span>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">{group.displayDate}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-blue-400 border border-zinc-700">
                      {group.runs.length} {group.runs.length === 1 ? 'test' : 'tests'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    Timezone: Africa/Lagos (UTC+1)
                  </div>
                </div>
              </div>

              {/* Day's Aggregate Numbers */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Trades</div>
                  <div className="font-bold text-white">{group.aggregateMetrics.tradesCount}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Win Rate</div>
                  <div className={`font-bold ${group.aggregateMetrics.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {group.aggregateMetrics.winRate}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Expectancy</div>
                  <div className={`font-bold ${group.aggregateMetrics.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {group.aggregateMetrics.avgR > 0 ? `+${group.aggregateMetrics.avgR}R` : `${group.aggregateMetrics.avgR}R`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Net Profit</div>
                  <div className={`font-bold ${group.aggregateMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {group.aggregateMetrics.netProfit >= 0 ? `+$${group.aggregateMetrics.netProfit}` : `-$${Math.abs(group.aggregateMetrics.netProfit)}`}
                  </div>
                </div>

                <div className="text-zinc-500 pl-2">
                  <span className={`material-symbols-outlined transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Accordion Content */}
            {isOpen && (
              <div className="p-5 pt-0 space-y-5 border-t border-zinc-900 bg-zinc-950/60">
                {/* Day-journal Textarea */}
                <div className="mt-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-400">edit_note</span>
                      Daily Strategy Journal Notes ({group.displayDate})
                    </label>
                    <div className="flex items-center gap-2">
                      {isSaved && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check</span>
                          Saved
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveDayJournal(group.dateKey);
                        }}
                        disabled={isSaving}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow"
                      >
                        {isSaving ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={currentNotes}
                    onChange={(e) =>
                      setDayNotesState((prev) => ({
                        ...prev,
                        [group.dateKey]: e.target.value,
                      }))
                    }
                    placeholder="Log overarching market conditions for this test session, what you adjusted, or what you learned today..."
                    className="w-full bg-zinc-950 border border-zinc-800/90 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Runs List for this Day */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Executed Runs on {group.displayDate}:
                  </div>

                  {group.runs.map((run) => {
                    const runId = run.id || `run-${run.runNumber}`;
                    const isRunOpen = openRuns[runId] ?? false;
                    const runVersion = versions.find((v) => v.id === run.versionId);

                    return (
                      <div
                        key={runId}
                        className="border border-zinc-800/90 rounded-xl bg-zinc-900/40 overflow-hidden"
                      >
                        {/* Run Row Header */}
                        <div
                          onClick={() => toggleRun(runId)}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800 shrink-0">
                              Run #{run.runNumber}
                            </span>
                            {runVersion && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                                {runVersion.label}
                              </span>
                            )}
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{run.symbol}</span>
                                <span className="text-zinc-500">•</span>
                                <span className="text-zinc-400">{run.timeframe || 'H1'}</span>
                                {run.periodFrom && (
                                  <>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-400 font-mono text-[11px]">
                                      {String(run.periodFrom).slice(0, 10)} to {String(run.periodTo).slice(0, 10)}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                Tested at: {run.testedAt ? formatLagosDateTimeDisplay(run.testedAt) : 'N/A'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 block uppercase">Net Profit</span>
                              <span
                                className={`font-bold ${
                                  (run.netProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {(run.netProfit ?? 0) >= 0
                                  ? `+$${run.netProfit}`
                                  : `-$${Math.abs(run.netProfit ?? 0)}`}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 block uppercase">Win Rate</span>
                              <span className="font-bold text-white">{run.winRate ?? 0}%</span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 block uppercase">Avg R</span>
                              <span
                                className={`font-bold ${
                                  (run.avgR ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {(run.avgR ?? 0) > 0 ? `+${run.avgR}R` : `${run.avgR}R`}
                              </span>
                            </div>

                            <span className={`material-symbols-outlined text-zinc-500 transition-transform ${isRunOpen ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </div>
                        </div>

                        {/* Expanded Run Details */}
                        {isRunOpen && (
                          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 space-y-4">
                            {/* Run Journal */}
                            {run.journal && (
                              <div className="p-3 bg-zinc-900/60 border border-zinc-800/70 rounded-lg text-xs text-zinc-300">
                                <span className="text-zinc-500 font-semibold block mb-1">Trader Observation:</span>
                                <p className="leading-relaxed whitespace-pre-wrap">{run.journal}</p>
                              </div>
                            )}

                            {/* Skip reasons & Diagnostics */}
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {run.skipCounts &&
                                  Object.entries(
                                    typeof run.skipCounts === 'string'
                                      ? JSON.parse(run.skipCounts)
                                      : run.skipCounts
                                  ).map(([key, count]) => (
                                    <span
                                      key={key}
                                      className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]"
                                    >
                                      {key}: {String(count)}
                                    </span>
                                  ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRun(run);
                                  }}
                                  className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1 border border-blue-500/30"
                                >
                                  <span className="material-symbols-outlined text-xs">edit</span>
                                  Edit Run
                                </button>
                                <button
                                  type="button"
                                  disabled={loadingRawLogId === run.id}
                                  onClick={() => handleViewRawLog(run)}
                                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className={`material-symbols-outlined text-xs ${loadingRawLogId === run.id ? 'animate-spin' : ''}`}>
                                    {loadingRawLogId === run.id ? 'progress_activity' : 'description'}
                                  </span>
                                  {loadingRawLogId === run.id ? 'Loading Log...' : 'View Raw Log'}
                                </button>
                              </div>
                            </div>

                            {/* Trades Table with Editable Profit & 10/page Pagination */}
                            {run.trades && run.trades.length > 0 ? (
                              (() => {
                                const totalTrades = run.trades.length;
                                const totalPages = Math.ceil(totalTrades / TRADES_PER_PAGE);
                                const currentPage = Math.min(Math.max(runTradePages[runId] || 1, 1), totalPages);
                                const startIdx = (currentPage - 1) * TRADES_PER_PAGE;
                                const paginatedTrades = run.trades.slice(startIdx, startIdx + TRADES_PER_PAGE);

                                return (
                                  <div className="space-y-2.5">
                                    <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                                      <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px]">
                                          <tr>
                                            <th className="p-2">#</th>
                                            <th className="p-2">Ticket</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2">Lots</th>
                                            <th className="p-2">Entry</th>
                                            <th className="p-2">SL</th>
                                            <th className="p-2">TP</th>
                                            <th className="p-2">Exit Price</th>
                                            <th className="p-2">Reason</th>
                                            <th className="p-2">Tag</th>
                                            <th className="p-2 text-right">R-Mult</th>
                                            <th className="p-2 text-right">Profit ($)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50 bg-zinc-950">
                                          {paginatedTrades.map((t, localIdx) => {
                                            const globalIdx = startIdx + localIdx;
                                            return (
                                              <tr key={t.id || globalIdx} className="hover:bg-zinc-900/50">
                                                <td className="p-2 text-zinc-500">{globalIdx + 1}</td>
                                                <td className="p-2 text-zinc-400">#{t.ticket || '-'}</td>
                                                <td className="p-2 font-bold uppercase">
                                                  <span className={t.direction === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                                                    {t.direction}
                                                  </span>
                                                </td>
                                                <td className="p-2">{t.lots}</td>
                                                <td className="p-2">{t.entry}</td>
                                                <td className="p-2 text-zinc-400">{t.sl ?? '-'}</td>
                                                <td className="p-2 text-zinc-400">{t.tp ?? '-'}</td>
                                                <td className="p-2">{t.exitPrice ?? '-'}</td>
                                                <td className="p-2">
                                                  <span
                                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                      t.exitReason === 'TP'
                                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                        : t.exitReason === 'SL'
                                                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                                        : 'bg-zinc-800 text-zinc-300'
                                                    }`}
                                                  >
                                                    {t.exitReason || '-'}
                                                  </span>
                                                </td>
                                                <td className="p-2 text-blue-400 truncate max-w-[120px]">
                                                  {t.tag || '-'}
                                                </td>
                                                <td
                                                  className={`p-2 text-right font-bold ${
                                                    (t.rMultiple ?? 0) > 0
                                                      ? 'text-emerald-400'
                                                      : (t.rMultiple ?? 0) < 0
                                                      ? 'text-rose-400'
                                                      : 'text-zinc-400'
                                                  }`}
                                                >
                                                  {t.rMultiple != null
                                                    ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple}R`
                                                    : '-'}
                                                </td>
                                                <td className="p-2 text-right">
                                                  {editingProfitTradeId === t.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                      <input
                                                        type="number"
                                                        step="0.01"
                                                        value={manualProfitInput}
                                                        onChange={(e) => setManualProfitInput(e.target.value)}
                                                        placeholder="$0.00"
                                                        className="w-16 bg-zinc-900 border border-zinc-700 px-1 py-0.5 text-xs text-white rounded text-right focus:outline-none"
                                                      />
                                                      <button
                                                        onClick={() => handleSaveTradeProfit(t.id!)}
                                                        disabled={savingProfit}
                                                        className="text-emerald-400 hover:text-emerald-300 p-0.5"
                                                      >
                                                        <span className="material-symbols-outlined text-sm">check</span>
                                                      </button>
                                                      <button
                                                        onClick={() => setEditingProfitTradeId(null)}
                                                        className="text-zinc-400 hover:text-white p-0.5"
                                                      >
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                      <span
                                                        className={
                                                          t.profit != null
                                                            ? t.profit >= 0
                                                              ? 'text-emerald-400 font-semibold'
                                                              : 'text-rose-400 font-semibold'
                                                            : 'text-zinc-500'
                                                        }
                                                      >
                                                        {t.profit != null
                                                          ? `${t.profit >= 0 ? '+$' : '-$'}${Math.abs(t.profit)}`
                                                          : 'Edit $'}
                                                      </span>
                                                      {t.id && (
                                                        <button
                                                          onClick={() => {
                                                            setEditingProfitTradeId(t.id!);
                                                            setManualProfitInput(t.profit != null ? String(t.profit) : '');
                                                          }}
                                                          className="text-zinc-500 hover:text-zinc-300 p-0.5 opacity-60 hover:opacity-100"
                                                          title="Edit trade money profit"
                                                        >
                                                          <span className="material-symbols-outlined text-xs">edit</span>
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                      <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs font-mono">
                                        <div className="text-zinc-400 text-[11px]">
                                          Showing <span className="text-white font-semibold">{startIdx + 1}</span>-
                                          <span className="text-white font-semibold">
                                            {Math.min(startIdx + TRADES_PER_PAGE, totalTrades)}
                                          </span> of{' '}
                                          <span className="text-white font-semibold">{totalTrades}</span> trades
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={currentPage <= 1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRunTradePages((prev) => ({
                                                ...prev,
                                                [runId]: Math.max(1, currentPage - 1),
                                              }));
                                            }}
                                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                                          >
                                            <span className="material-symbols-outlined text-xs">chevron_left</span>
                                            Prev
                                          </button>

                                          <div className="flex items-center gap-1 px-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                              <button
                                                key={p}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setRunTradePages((prev) => ({
                                                    ...prev,
                                                    [runId]: p,
                                                  }));
                                                }}
                                                className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center transition-colors ${
                                                  currentPage === p
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                }`}
                                              >
                                                {p}
                                              </button>
                                            ))}
                                          </div>

                                          <button
                                            type="button"
                                            disabled={currentPage >= totalPages}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRunTradePages((prev) => ({
                                                ...prev,
                                                [runId]: Math.min(totalPages, currentPage + 1),
                                              }));
                                            }}
                                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                                          >
                                            Next
                                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="text-xs text-zinc-500 py-2">No individual trades logged for this run.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })
    )}
      </div>
    </div>

      {/* Raw Log Modal */}
      {activeRawLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-base">terminal</span>
                {activeRawLog.title}
              </h4>
              <button
                onClick={() => setActiveRawLog(null)}
                className="text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto my-4 font-mono text-xs text-zinc-300 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/80 whitespace-pre-wrap leading-relaxed select-text">
              {activeRawLog.log}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeRawLog.log);
                  alert('Raw log copied to clipboard');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
                Copy Log
              </button>
              <button
                onClick={() => setActiveRawLog(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Run Modal */}
      {editingRun && (
        <EditRunModal
          isOpen={true}
          onClose={() => setEditingRun(null)}
          run={editingRun}
          versions={versions}
          onUpdated={() => {
            setEditingRun(null);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
