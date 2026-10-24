"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { parseTesterLog, ParsedRun } from '@/lib/ea-lab/parse-log';
import { saveEaTestRun } from '@/app/actions/eaLab';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface StrategyOption {
  id: string;
  name: string;
  versions: { id: string; label: string }[];
  pairs?: string[];
}

interface AddRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyOption[];
  defaultStrategyId?: string;
  defaultVersionId?: string;
  availablePairs?: string[];
  onSaved?: (testRunId: string) => void;
}

export function AddRunModal({
  isOpen,
  onClose,
  strategies,
  defaultStrategyId,
  defaultVersionId,
  availablePairs = [],
  onSaved,
}: AddRunModalProps) {
  const router = useRouter();

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(
    defaultStrategyId || (strategies[0]?.id ?? '')
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string>(defaultVersionId || '');

  // TestedAt date/time in local timezone (editable)
  const [testedAt, setTestedAt] = useState<string>(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  });

  const [rawLog, setRawLog] = useState<string>('');
  const [activeRunIndex, setActiveRunIndex] = useState<number>(0);
  const [journal, setJournal] = useState<string>('');
  const [overrideSymbol, setOverrideSymbol] = useState<string>('');
  const [balanceOverride, setBalanceOverride] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced log parsing & pagination
  const [parsedRuns, setParsedRuns] = useState<ParsedRun[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const TRADES_PER_PAGE = 10;

  // Sync selected strategy versions
  const currentStrategy = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId);
  }, [strategies, selectedStrategyId]);

  useEffect(() => {
    if (defaultStrategyId) {
      setSelectedStrategyId(defaultStrategyId);
    }
  }, [defaultStrategyId]);

  useEffect(() => {
    if (defaultVersionId) {
      setSelectedVersionId(defaultVersionId);
    } else if (currentStrategy && currentStrategy.versions.length > 0) {
      setSelectedVersionId(currentStrategy.versions[0].id);
    } else {
      setSelectedVersionId('');
    }
  }, [currentStrategy, defaultVersionId]);

  // Debounce log parsing so multi-megabyte paste doesn't lock UI thread
  useEffect(() => {
    if (!rawLog.trim()) {
      setParsedRuns([]);
      setIsParsing(false);
      return;
    }
    setIsParsing(true);
    const timer = setTimeout(() => {
      try {
        const parsed = parseTesterLog(rawLog);
        setParsedRuns(parsed);
      } catch (e) {
        console.error('Error parsing raw tester log:', e);
        setParsedRuns([]);
      } finally {
        setIsParsing(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [rawLog]);

  useEffect(() => {
    setPreviewPage(1);
  }, [activeRunIndex, parsedRuns]);

  // Unique list of all pairs documented on the Pairs tab for this strategy
  const pairsKey = availablePairs.join(',');
  const associatedPairs = useMemo(() => {
    const set = new Set<string>();
    if (availablePairs && availablePairs.length > 0 && selectedStrategyId === defaultStrategyId) {
      availablePairs.forEach((p) => {
        if (p && p !== 'UNKNOWN') set.add(p.trim());
      });
    }
    if (currentStrategy?.pairs && currentStrategy.pairs.length > 0) {
      currentStrategy.pairs.forEach((p) => {
        if (p && p !== 'UNKNOWN') set.add(p.trim());
      });
    }
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey, currentStrategy, selectedStrategyId, defaultStrategyId]);

  const activeRun: ParsedRun | undefined = parsedRuns[activeRunIndex] || parsedRuns[0];

  // Set override symbol whenever active run changes
  useEffect(() => {
    if (activeRun && activeRun.symbol && activeRun.symbol !== 'UNKNOWN') {
      const matchedCanonical = associatedPairs.find(
        (p) => p.toLowerCase() === activeRun.symbol.toLowerCase()
      );
      setOverrideSymbol(matchedCanonical || activeRun.symbol);
    }
  }, [activeRun, associatedPairs]);

  const totalTrades = activeRun?.trades?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalTrades / TRADES_PER_PAGE));
  const paginatedTrades = useMemo(() => {
    if (!activeRun?.trades) return [];
    const start = (previewPage - 1) * TRADES_PER_PAGE;
    return activeRun.trades.slice(start, start + TRADES_PER_PAGE);
  }, [activeRun?.trades, previewPage]);

  if (!isOpen) return null;

  const riskPctInput = activeRun ? parseFloat(activeRun.inputsJson?.['InpRiskPct'] || '1.0') || 1.0 : 1.0;

  // Manual final balance (from the tester report) beats the log-based estimate
  const overrideNum = parseFloat(balanceOverride);
  const hasOverride = balanceOverride.trim() !== '' && !isNaN(overrideNum);
  const effFinalBalance = hasOverride ? overrideNum : activeRun?.finalBalance ?? 0;
  const effNetProfit = activeRun
    ? hasOverride
      ? Number((overrideNum - activeRun.initialDeposit).toFixed(2))
      : activeRun.netProfit
    : 0;
  const effReturnPct = activeRun
    ? hasOverride
      ? Number(((effNetProfit / (activeRun.initialDeposit || 1)) * 100).toFixed(2))
      : activeRun.returnPct
    : 0;

  async function handleSave() {
    if (!selectedStrategyId) {
      setError('Please select a strategy.');
      toast.error('Please select a strategy.');
      return;
    }
    if (!selectedVersionId) {
      setError('Please select or create a code version first.');
      toast.error('Please select or create a code version first.');
      return;
    }
    if (!activeRun) {
      setError('Please paste a valid Strategy Tester log.');
      toast.error('Please paste a valid Strategy Tester log.');
      return;
    }

    const finalSymbol = overrideSymbol.trim() || activeRun.symbol || 'UNKNOWN';
    if (!finalSymbol || finalSymbol === 'UNKNOWN') {
      setError('Please select or enter the tested pair symbol.');
      toast.error('Please select or enter the tested pair symbol.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await saveEaTestRun({
        strategyId: selectedStrategyId,
        versionId: selectedVersionId,
        testedAt: testedAt ? new Date(testedAt) : new Date(),
        symbol: finalSymbol,
        timeframe: activeRun.timeframe || null,
        periodFrom: activeRun.periodFrom ? new Date(activeRun.periodFrom.replace(/\./g, '-')) : null,
        periodTo: activeRun.periodTo ? new Date(activeRun.periodTo.replace(/\./g, '-')) : null,
        initialDeposit: activeRun.initialDeposit,
        currency: activeRun.currency,
        leverage: activeRun.leverage,
        finalBalance: effFinalBalance,
        inputsJson: activeRun.inputsJson,
        rawLog: activeRun.rawLog || rawLog,
        journal: journal.trim() || null,
        trades: activeRun.trades.map((t) => ({
          ticket: t.ticket || null,
          openedAt: t.openedAt ? new Date(t.openedAt.replace(/\./g, '-')) : null,
          closedAt: t.closedAt ? new Date(t.closedAt.replace(/\./g, '-')) : null,
          direction: t.direction,
          lots: t.lots,
          entry: t.entry,
          sl: t.sl,
          tp: t.tp,
          exitPrice: t.exitPrice,
          exitReason: t.exitReason,
          tag: t.tag,
          rMultiple: t.rMultiple,
          profit: t.profit,
        })),
        skipCounts: activeRun.skipCounts,
        errorCount: activeRun.errorCount,
        breakCount: activeRun.breakCount,
        retestCount: activeRun.retestCount,
      });

      setLoading(false);

      if (!res.success || !res.testRun) {
        setError(res.error || 'Failed to save backtest run');
        toast.error(res.error || 'Failed to save backtest run');
        return;
      }

      toast.success(`Strategy Tester run for ${finalSymbol} saved successfully! (${activeRun.trades.length} trades, added to Pairs table)`);
      setRawLog('');
      setJournal('');
      setBalanceOverride('');
      onClose();

      if (onSaved) {
        onSaved(res.testRun.id);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Error saving backtest run:', err);
      const msg = err?.message || 'An unexpected error occurred while saving the run.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-blue-500">add_chart</span>
              Add Strategy Tester Run
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Paste your MetaTrader 5 Strategy Tester log. Metrics, trades, and diagnostics are parsed instantly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-200 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-base">error</span>
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
          {/* Top selection bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Strategy *
              </label>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Code Version *
              </label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {currentStrategy?.versions && currentStrategy.versions.length > 0 ? (
                  currentStrategy.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))
                ) : (
                  <option value="">No versions available</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                When I Ran It (Local Time) *
              </label>
              <input
                type="datetime-local"
                value={testedAt}
                onChange={(e) => setTestedAt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Associated Pairs Bar from Pairs Tab */}
          {associatedPairs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs">
              <span className="text-zinc-400 font-semibold flex items-center gap-1.5 shrink-0">
                <span className="material-symbols-outlined text-purple-400 text-sm">currency_exchange</span>
                Pairs on Pairs Tab ({associatedPairs.length}):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {associatedPairs.map((p) => {
                  const isSelected = overrideSymbol.trim().toLowerCase() === p.trim().toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOverrideSymbol(p)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400 font-bold'
                          : 'bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isSelected ? 'check_circle' : 'add_chart'}
                      </span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paste log area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Paste Tester Log (Supports Multi-Run Pasting) *
              </label>
              {isParsing ? (
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Parsing log...
                </span>
              ) : parsedRuns.length > 0 ? (
                <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  {parsedRuns.length} run{parsedRuns.length > 1 ? 's' : ''} detected
                </span>
              ) : null}
            </div>
            <textarea
              rows={6}
              placeholder="Paste raw MetaTrader 5 Strategy Tester log lines here..."
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              className="w-full font-mono text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Multi-run tabs if more than 1 run was detected */}
          {parsedRuns.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-zinc-400 shrink-0 font-medium">Runs in Log:</span>
              {parsedRuns.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveRunIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    activeRunIndex === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  Run #{i + 1}: {r.symbol} ({r.timeframe})
                </button>
              ))}
            </div>
          )}

          {/* Live Parsed Preview */}
          {activeRun && (
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-4.5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-xl">insights</span>
                  <h4 className="text-sm font-semibold text-white">Parsed Backtest Preview</h4>
                </div>

                {overrideSymbol && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/80 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-400">add_chart</span>
                      Associated Pair: <span className="text-white">{overrideSymbol}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Select Associated Pair Section */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-lg">add_chart</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Select Associated Pair *
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Custom / Override:</span>
                    <input
                      type="text"
                      value={overrideSymbol}
                      onChange={(e) => setOverrideSymbol(e.target.value)}
                      placeholder="e.g. Volatility 75 (1s) Index"
                      className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono w-48"
                    />
                  </div>
                </div>

                {/* Associated Pairs from the Pairs Tab */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-purple-400 text-xs">currency_exchange</span>
                      Pairs on Pairs Tab ({associatedPairs.length}):
                    </span>
                    <span className="text-[10px] text-zinc-500 italic">Click to select associated pair</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {associatedPairs.length > 0 ? (
                      associatedPairs.map((p) => {
                        const isSelected = overrideSymbol.trim().toLowerCase() === p.trim().toLowerCase();
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setOverrideSymbol(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400 font-bold'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isSelected ? 'check_circle' : 'add_chart'}
                            </span>
                            {p}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-zinc-500 italic">
                        No pairs documented on Pairs tab yet. The pair entered will be automatically saved to the Pairs table.
                      </span>
                    )}

                    {/* Detected pair from log if not in associatedPairs */}
                    {activeRun.symbol &&
                      activeRun.symbol !== 'UNKNOWN' &&
                      !associatedPairs.some(
                        (p) => p.trim().toLowerCase() === activeRun.symbol.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => setOverrideSymbol(activeRun.symbol)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                            overrideSymbol.trim().toLowerCase() === activeRun.symbol.trim().toLowerCase()
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400 font-bold'
                              : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          From Log: {activeRun.symbol}
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Timeframe</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeRun.timeframe || 'H1'}</div>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Period</div>
                  <div className="text-xs font-medium text-zinc-300 mt-1 truncate" title={`${activeRun.periodFrom} to ${activeRun.periodTo}`}>
                    {activeRun.periodFrom ? `${activeRun.periodFrom.slice(5, 10)} → ${activeRun.periodTo?.slice(5, 10)}` : 'N/A'}
                  </div>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Deposit / Balance</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-1">
                    ${activeRun.initialDeposit} → ${effFinalBalance}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceOverride}
                    onChange={(e) => setBalanceOverride(e.target.value)}
                    placeholder="Enter real final balance"
                    title="The tester journal has no final balance line. Enter it from the tester report."
                    className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Net Profit</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      effNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {effNetProfit >= 0 ? `+$${effNetProfit}` : `-$${Math.abs(effNetProfit)}`}
                    <span className="text-[11px] font-normal ml-1">({effReturnPct}%)</span>
                  </div>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Trades / Win Rate</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {activeRun.trades.length}
                    <span className="text-xs text-blue-400 font-normal ml-1.5">
                      ({activeRun.trades.length > 0
                        ? ((activeRun.trades.filter((t) => (t.rMultiple ?? 0) > 0).length / activeRun.trades.length) * 100).toFixed(0)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-[11px] text-zinc-400">Diagnostics</div>
                  <div className="text-xs font-medium text-zinc-300 mt-1 flex items-center gap-1.5">
                    {activeRun.errorCount > 0 ? (
                      <span className="text-rose-400 font-bold">{activeRun.errorCount} err</span>
                    ) : (
                      <span className="text-emerald-400">0 err</span>
                    )}
                    <span>• {activeRun.breakCount} break</span>
                  </div>
                </div>
              </div>

              {/* Warnings / Errors if any */}
              {activeRun.errors.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 space-y-1">
                  <div className="font-semibold text-red-200 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Tester Execution Errors Detected:
                  </div>
                  {activeRun.errors.map((err, i) => (
                    <div key={i} className="font-mono pl-4">• {err}</div>
                  ))}
                </div>
              )}

              {/* Skips breakdown */}
              {Object.keys(activeRun.skipCounts).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-zinc-400 font-medium mr-1">Skips:</span>
                  {Object.entries(activeRun.skipCounts).map(([reason, count]) => (
                    <span
                      key={reason}
                      className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[11px]"
                    >
                      {reason}: {String(count)}
                    </span>
                  ))}
                </div>
              )}

              {/* Trades preview table */}
              {totalTrades > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-zinc-300">
                      Trades Parsed ({totalTrades})
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>
                          Showing {(previewPage - 1) * TRADES_PER_PAGE + 1}–
                          {Math.min(previewPage * TRADES_PER_PAGE, totalTrades)} of {totalTrades}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={previewPage <= 1}
                            onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                          >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                          </button>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 font-mono text-zinc-300">
                            {previewPage}/{totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={previewPage >= totalPages}
                            onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
                          >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs text-zinc-300 font-mono">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Ticket</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Lots</th>
                          <th className="p-2">Entry</th>
                          <th className="p-2">SL</th>
                          <th className="p-2">TP</th>
                          <th className="p-2">Exit</th>
                          <th className="p-2">Reason</th>
                          <th className="p-2">Tag</th>
                          <th className="p-2 text-right">R-Mult</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                        {paginatedTrades.map((t, idx) => {
                          const i = (previewPage - 1) * TRADES_PER_PAGE + idx;
                          return (
                            <tr key={i} className="hover:bg-zinc-800/30">
                              <td className="p-2 text-zinc-500">{i + 1}</td>
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
                              <td className="p-2 text-blue-400 truncate max-w-[100px]">{t.tag || '-'}</td>
                              <td
                                className={`p-2 text-right font-bold ${
                                  (t.rMultiple ?? 0) > 0
                                    ? 'text-emerald-400'
                                    : (t.rMultiple ?? 0) < 0
                                    ? 'text-rose-400'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {t.rMultiple != null ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple}R` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trader Journal Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Trader Journal (What the EA did and what I noticed)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Executed clean retests during London open. In high volatility spikes, stop loss suffered 2 pips slippage. Missed one trend continuation due to spread filter."
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-2">
          <div className="text-xs text-zinc-400">
            {activeRun ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                Ready to save: {activeRun.trades.length} trades on <strong className="text-white">{overrideSymbol || activeRun.symbol}</strong> (stored on Pairs Table & Tab)
              </span>
            ) : (
              'Awaiting tester log'
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !activeRun}
              onClick={handleSave}
              className="px-6 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Saving Run...
                </>
              ) : (
                'Save Backtest Run'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
