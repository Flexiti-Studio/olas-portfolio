"use client";

import React, { useState, useMemo } from 'react';
import { upsertPairNote } from '@/app/actions/eaLab';
import { toast } from 'sonner';
import { RunLike, TradeLike } from '@/lib/ea-lab/metrics';
import { formatLagosDateTimeDisplay } from '@/lib/ea-lab/timezone';

export interface PairPerformanceItem {
  symbol: string;
  runsCount: number;
  tradesCount: number;
  winRate: number;
  avgR: number;
  profitFactor: number;
  netProfit: number;
  returnPct: number;
  notes?: string | null;
}

interface PairsTabProps {
  strategyId: string;
  pairs: PairPerformanceItem[];
  runs?: RunLike[];
}

function formatRunPeriod(run: RunLike) {
  let pFrom = run.periodFrom;
  let pTo = run.periodTo;
  if (!pFrom && run.trades && run.trades.length > 0) {
    pFrom = run.trades[0].openedAt;
    pTo = run.trades[run.trades.length - 1].closedAt || run.trades[run.trades.length - 1].openedAt;
  }
  if (!pFrom || !pTo) return null;

  const parseTime = (val: string | Date) => {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
    return new Date(String(val).replace(/\./g, '-')).getTime();
  };
  const tStart = parseTime(pFrom);
  const tEnd = parseTime(pTo);
  if (isNaN(tStart) || isNaN(tEnd) || tEnd < tStart) return null;

  const diffMs = tEnd - tStart;
  const totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  let durationStr = `${totalDays} Days`;
  if (totalDays === 1) {
    durationStr = '1 Day';
  } else if (totalDays >= 365) {
    const y = (totalDays / 365.25).toFixed(1);
    durationStr = `${y.endsWith('.0') ? Math.round(totalDays / 365.25) : y} Years`;
  } else if (totalDays >= 30) {
    const m = (totalDays / 30.4375).toFixed(1);
    durationStr = `${m.endsWith('.0') ? Math.round(totalDays / 30.4375) : m} Months`;
  }

  const formatShort = (v: string | Date) => {
    if (typeof v === 'string') return v.split(' ')[0].replace(/-/g, '.');
    return v.toISOString().split('T')[0].replace(/-/g, '.');
  };

  return {
    label: durationStr,
    range: `${formatShort(pFrom)} → ${formatShort(pTo)}`,
  };
}

function getRunRisk(run: RunLike) {
  try {
    const inputs = typeof run.inputsJson === 'string'
      ? JSON.parse(run.inputsJson || '{}')
      : run.inputsJson || {};
    const parsedPct = parseFloat(
      inputs['InpRiskPct'] ||
      inputs['RiskPercent'] ||
      inputs['InpRiskPercent'] ||
      inputs['InpRisk'] ||
      '1.0'
    );
    const riskPct = !isNaN(parsedPct) && parsedPct > 0 ? parsedPct : 1.0;
    const deposit = run.initialDeposit || 10000;
    const riskAmount = (riskPct / 100) * deposit;
    return {
      pct: riskPct,
      amount: riskAmount,
    };
  } catch {
    return { pct: 1.0, amount: (run.initialDeposit || 10000) * 0.01 };
  }
}

export function PairsTab({ strategyId, pairs, runs = [] }: PairsTabProps) {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [expandedRunTrades, setExpandedRunTrades] = useState<Record<string, boolean>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    pairs.forEach((p) => {
      map[p.symbol] = p.notes || '';
    });
    return map;
  });

  const [savingSymbol, setSavingSymbol] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState<Record<string, boolean>>({});

  // Pagination for trade lists in Pairs tab (10 per page, per run)
  const [pairTradePages, setPairTradePages] = useState<Record<string, number>>({});
  const TRADES_PER_PAGE = 10;

  // Pair filter dropdown state
  const [selectedPair, setSelectedPair] = useState<string>('all');

  // Add pair modal state
  const [isAddPairOpen, setIsAddPairOpen] = useState(false);
  const [newPairSymbol, setNewPairSymbol] = useState('');
  const [newPairNotes, setNewPairNotes] = useState('');
  const [isAddingPair, setIsAddingPair] = useState(false);

  // Numbered pairs with static 1-based numbering
  const numberedPairs = useMemo(() => {
    return pairs.map((p, idx) => ({
      ...p,
      pairNumber: idx + 1,
    }));
  }, [pairs]);

  // Filtered pairs based on dropdown selection
  const displayedPairs = useMemo(() => {
    if (selectedPair === 'all') return numberedPairs;
    return numberedPairs.filter(
      (p) => p.symbol.trim().toLowerCase() === selectedPair.trim().toLowerCase()
    );
  }, [numberedPairs, selectedPair]);

  async function handleAddPair(e: React.FormEvent) {
    e.preventDefault();
    const sym = newPairSymbol.trim();
    if (!sym) {
      toast.error('Pair symbol is required');
      return;
    }
    setIsAddingPair(true);
    const res = await upsertPairNote({
      strategyId,
      symbol: sym,
      notes: newPairNotes.trim(),
    });
    setIsAddingPair(false);
    if (res.success) {
      toast.success(`Pair ${sym} added to Pairs table!`);
      setIsAddPairOpen(false);
      setNewPairSymbol('');
      setNewPairNotes('');
      window.location.reload();
    } else {
      toast.error(res.error || 'Failed to add pair');
    }
  }

  // Chronologically sorted runs with numbering
  const numberedRuns = useMemo(() => {
    const sorted = [...runs].sort(
      (a, b) => new Date(a.testedAt || 0).getTime() - new Date(b.testedAt || 0).getTime()
    );
    return sorted.map((r, idx) => ({
      ...r,
      runNumber: idx + 1,
    }));
  }, [runs]);

  const toggleRunTrades = (runId: string) => {
    setExpandedRunTrades((prev) => ({
      ...prev,
      [runId]: !prev[runId],
    }));
  };

  async function handleSaveNote(symbol: string) {
    const notes = noteInputs[symbol] ?? '';
    setSavingSymbol((prev) => ({ ...prev, [symbol]: true }));

    const res = await upsertPairNote({
      strategyId,
      symbol,
      notes,
    });

    setSavingSymbol((prev) => ({ ...prev, [symbol]: false }));
    if (res.success) {
      toast.success(`Specifications for ${symbol} saved!`);
      setSavedSuccess((prev) => ({ ...prev, [symbol]: true }));
      setEditingSymbol(null);
      setTimeout(() => {
        setSavedSuccess((prev) => ({ ...prev, [symbol]: false }));
      }, 2500);
    } else {
      toast.error(res.error || 'Failed to save pair notes');
    }
  }

  if (pairs.length === 0) {
    return (
      <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 text-xs space-y-4">
        <p>No symbol backtests saved yet. Add test runs to track pair-specific performance and notes, or add pairs directly.</p>
        <button
          type="button"
          onClick={() => setIsAddPairOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add First Pair
        </button>

        {isAddPairOpen && renderAddPairModal()}
      </div>
    );
  }

  function renderAddPairModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative text-left">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-base">add_chart</span>
              Add Pair to Pairs Table
            </h4>
            <button
              type="button"
              onClick={() => setIsAddPairOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleAddPair} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Pair / Symbol *
              </label>
              <input
                type="text"
                value={newPairSymbol}
                onChange={(e) => setNewPairSymbol(e.target.value)}
                placeholder="e.g. XAUUSD, EURUSD, Volatility 75 (1s) Index"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Broker Specifications / Quirks Notes
              </label>
              <textarea
                rows={3}
                value={newPairNotes}
                onChange={(e) => setNewPairNotes(e.target.value)}
                placeholder="e.g. Min stops level: 25 pips. Spread average 18. Min lot 0.05. Avoid trading during midnight rollover."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsAddPairOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingPair || !newPairSymbol.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-600/20"
              >
                {isAddingPair ? (
                  <>
                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs">save</span>
                    Save Pair to Table
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-purple-400 text-xl">currency_exchange</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Pairs & Test Results Breakdown</h3>
            <p className="text-xs text-zinc-400">
              {selectedPair === 'all'
                ? `Showing all ${numberedPairs.length} numbered instrument profiles and their executed test runs.`
                : `Focused on #${numberedPairs.find((p) => p.symbol === selectedPair)?.pairNumber || 1} - ${selectedPair}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Numbered Pair Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="appearance-none bg-zinc-900 border border-purple-500/50 hover:border-purple-400 text-white text-xs rounded-xl pl-8 pr-9 py-2 font-medium focus:outline-none focus:border-purple-500 cursor-pointer shadow-sm transition-colors"
              title="Select pair to view"
            >
              <option value="all">🌐 All Pairs ({numberedPairs.length} pairs total)</option>
              {numberedPairs.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  #{p.pairNumber}. {p.symbol} ({p.runsCount} test{p.runsCount !== 1 ? 's' : ''} · {p.tradesCount} trades)
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-purple-400 text-base absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              currency_exchange
            </span>
            <span className="material-symbols-outlined text-zinc-400 text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>

          {/* Prev / Next Pair Navigation */}
          {selectedPair !== 'all' && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => {
                  const currentIndex = numberedPairs.findIndex((p) => p.symbol === selectedPair);
                  const prevIndex = (currentIndex - 1 + numberedPairs.length) % numberedPairs.length;
                  setSelectedPair(numberedPairs[prevIndex].symbol);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Previous Pair"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="text-[11px] font-mono text-zinc-400 px-1.5">
                #{numberedPairs.find((p) => p.symbol === selectedPair)?.pairNumber} of {numberedPairs.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  const currentIndex = numberedPairs.findIndex((p) => p.symbol === selectedPair);
                  const nextIndex = (currentIndex + 1) % numberedPairs.length;
                  setSelectedPair(numberedPairs[nextIndex].symbol);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Next Pair"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}

          {/* Reset to All Pairs button */}
          {selectedPair !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedPair('all')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Show All Pairs"
            >
              <span className="material-symbols-outlined text-sm">clear_all</span>
              Show All
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddPairOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Pair
          </button>
        </div>
      </div>

      {isAddPairOpen && renderAddPairModal()}

      <div className="grid grid-cols-1 gap-6">
        {displayedPairs.map((p) => {
          const isEditing = editingSymbol === p.symbol;
          const isSaving = savingSymbol[p.symbol] || false;
          const isSaved = savedSuccess[p.symbol] || false;
          const currentNotes = noteInputs[p.symbol] ?? (p.notes || '');

          // Find all runs executed on this specific pair
          const pairRuns = numberedRuns.filter(
            (r) => (r.symbol || '').trim().toLowerCase() === p.symbol.trim().toLowerCase()
          );

          return (
            <div
              key={p.symbol}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-5"
            >
              {/* Pair Header with Numbering Badge & Aggregate Stats */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-400">#{p.pairNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-lg font-bold text-white tracking-wide">{p.symbol}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
                        {p.runsCount} {p.runsCount === 1 ? 'Test Run' : 'Test Runs'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      {p.tradesCount} Total Completed Trades Across All Tests
                    </div>
                  </div>
                </div>

                {/* Aggregate Pair Metrics */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 font-mono text-xs">
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800/60 text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase">Win Rate</span>
                    <span className={`font-bold ${p.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {p.winRate}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800/60 text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase">Expectancy</span>
                    <span className={`font-bold ${p.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.avgR > 0 ? `+${p.avgR}R` : `${p.avgR}R`}
                    </span>
                  </div>

                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800/60 text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase">Profit Factor</span>
                    <span className={`font-bold ${p.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {p.profitFactor}
                    </span>
                  </div>

                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800/60 text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase">Net Profit</span>
                    <span className={`font-bold ${p.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.netProfit >= 0 ? `+$${p.netProfit.toLocaleString()}` : `-$${Math.abs(p.netProfit).toLocaleString()}`}
                    </span>
                  </div>

                  <div className="hidden sm:block p-2.5 bg-zinc-900 rounded-lg border border-zinc-800/60 text-right">
                    <span className="text-[10px] text-zinc-500 block uppercase">Return</span>
                    <span className={`font-bold ${p.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.returnPct >= 0 ? `+${p.returnPct}%` : `${p.returnPct}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Test Runs Executed On This Pair */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-blue-400">history_edu</span>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Test Runs Executed on {p.symbol} ({pairRuns.length})
                    </h5>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Chronological order
                  </span>
                </div>

                {pairRuns.length === 0 ? (
                  <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50 text-xs text-zinc-500 text-center">
                    No run logs found for this symbol.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pairRuns.map((r) => {
                      const runId = r.id || `run-${r.runNumber}`;
                      const isTradesExpanded = expandedRunTrades[runId] || false;
                      const periodInfo = formatRunPeriod(r);
                      const riskInfo = getRunRisk(r);
                      const currency = r.currency || 'USD';
                      const deposit = r.initialDeposit || 10000;
                      const finalBal = r.finalBalance || deposit;
                      const netProf = r.netProfit ?? Number((finalBal - deposit).toFixed(2));
                      const retPct = r.returnPct ?? (deposit > 0 ? Number(((netProf / deposit) * 100).toFixed(2)) : 0);
                      const tradesCount = r.tradesCount ?? r.trades?.length ?? 0;

                      return (
                        <div
                          key={runId}
                          className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-700/80 space-y-3"
                        >
                          {/* Run Title Strip */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b border-zinc-800/60">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                Run #{r.runNumber}
                              </span>
                              {r.timeframe && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                                  {r.timeframe}
                                </span>
                              )}
                              <span className="text-xs text-zinc-400 font-mono">
                                Tested: {r.testedAt ? formatLagosDateTimeDisplay(r.testedAt) : 'N/A'}
                              </span>
                            </div>

                            {/* Testing Period Duration */}
                            {periodInfo && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                                <span className="material-symbols-outlined text-xs text-amber-400">schedule</span>
                                <span className="font-bold text-amber-300">{periodInfo.label}</span>
                                <span className="text-zinc-500 text-[11px]">({periodInfo.range})</span>
                              </div>
                            )}
                          </div>

                          {/* Key Results Grid for this Run */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                            {/* Starting & Final Balance */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Balance Progression</span>
                              <div className="text-zinc-400 text-[11px]">
                                {currency} {deposit.toLocaleString()}
                              </div>
                              <div className="font-bold text-white text-xs">
                                → {currency} {finalBal.toLocaleString()}
                              </div>
                            </div>

                            {/* Net Profit & Return */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Net Profit & Return</span>
                              <div className={`font-bold text-xs ${netProf >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {netProf >= 0 ? `+${currency} ${netProf.toLocaleString()}` : `-${currency} ${Math.abs(netProf).toLocaleString()}`}
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className={`text-[11px] ${retPct >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                                  {retPct >= 0 ? `+${retPct}%` : `${retPct}%`}
                                </span>
                                {(() => {
                                  const tradeSum = (r.trades || []).reduce((s, t) => s + (t.profit || 0), 0);
                                  const diff = Number((netProf - tradeSum).toFixed(2));
                                  if (r.trades && r.trades.length > 0 && Math.abs(diff) >= 0.01) {
                                    return (
                                      <span
                                        className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800"
                                        title={`Calculated trade sum: $${tradeSum.toFixed(2)}. Broker balance diff: ${diff >= 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`} (swap/commission/slippage)`}
                                      >
                                        diff: {diff >= 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>

                            {/* Trades & Win Rate */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Trades / Win Rate</span>
                              <div className="font-bold text-white text-xs">
                                {tradesCount} {tradesCount === 1 ? 'Trade' : 'Trades'}
                              </div>
                              <div className={`text-[11px] font-bold ${r.winRate !== undefined && r.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {r.winRate !== undefined ? `${r.winRate}% WR` : '—'}
                              </div>
                            </div>

                            {/* Expectancy (Avg R) */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Expectancy (Avg R)</span>
                              <div className={`font-bold text-xs ${r.avgR !== undefined && r.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {r.avgR !== undefined ? (r.avgR > 0 ? `+${r.avgR}R` : `${r.avgR}R`) : '—'}
                              </div>
                              <span className="text-[10px] text-zinc-500">per trade</span>
                            </div>

                            {/* Profit Factor */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Profit Factor</span>
                              <div className={`font-bold text-xs ${r.profitFactor !== undefined && r.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {r.profitFactor !== undefined ? r.profitFactor : '—'}
                              </div>
                              <span className="text-[10px] text-zinc-500">Gross W / Gross L</span>
                            </div>

                            {/* Risk Per Trade */}
                            <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
                              <span className="text-[10px] text-zinc-500 block uppercase">Risk / Trade</span>
                              <div className="font-bold text-amber-400 text-xs">
                                {riskInfo.pct}%
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                ~${riskInfo.amount.toFixed(0)} ({r.leverage || '1:100'})
                              </div>
                            </div>
                          </div>

                          {/* Journal note if present */}
                          {r.journal && (
                            <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/60 text-xs text-zinc-300 flex items-start gap-2">
                              <span className="material-symbols-outlined text-xs text-blue-400 mt-0.5 shrink-0">edit_note</span>
                              <div>
                                <span className="font-bold text-zinc-400 text-[11px] block uppercase">Journal Observation</span>
                                <p className="text-zinc-200 mt-0.5 leading-relaxed">{r.journal}</p>
                              </div>
                            </div>
                          )}

                          {/* Expandable Trades Table */}
                          {r.trades && r.trades.length > 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleRunTrades(runId)}
                                className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800/70 border border-zinc-800 text-xs text-zinc-300 font-mono flex items-center justify-between transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm text-zinc-400">
                                    {isTradesExpanded ? 'expand_less' : 'expand_more'}
                                  </span>
                                  {isTradesExpanded ? 'Hide Individual Trades' : `View ${r.trades.length} Completed Trades`}
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  {isTradesExpanded ? 'Collapse' : 'Click to inspect tickets & R-multiples'}
                                </span>
                              </button>

                              {isTradesExpanded && (
                                (() => {
                                  const totalTrades = r.trades.length;
                                  const totalPages = Math.ceil(totalTrades / TRADES_PER_PAGE);
                                  const currentPage = Math.min(Math.max(pairTradePages[runId] || 1, 1), totalPages);
                                  const startIdx = (currentPage - 1) * TRADES_PER_PAGE;
                                  const paginatedTrades = r.trades.slice(startIdx, startIdx + TRADES_PER_PAGE);

                                  return (
                                    <div className="mt-2 space-y-2">
                                      <div className="overflow-x-auto rounded-lg border border-zinc-800">
                                        <table className="w-full text-left font-mono text-[11px]">
                                          <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
                                            <tr>
                                              <th className="py-2 px-3">#</th>
                                              <th className="py-2 px-3">Date / Time</th>
                                              <th className="py-2 px-3">Ticket</th>
                                              <th className="py-2 px-3">Type</th>
                                              <th className="py-2 px-3 text-right">Lots</th>
                                              <th className="py-2 px-3 text-right">Entry</th>
                                              <th className="py-2 px-3 text-right">SL / TP</th>
                                              <th className="py-2 px-3 text-right">Exit</th>
                                              <th className="py-2 px-3">Reason</th>
                                              <th className="py-2 px-3 text-right">R-Mult</th>
                                              <th className="py-2 px-3 text-right">Profit</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                                            {paginatedTrades.map((tr: TradeLike, localIdx: number) => {
                                              const globalIdx = startIdx + localIdx;
                                              const isWin = (tr.rMultiple !== undefined && tr.rMultiple !== null && tr.rMultiple > 0) || ((tr.profit || 0) > 0);
                                              const isLoss = (tr.rMultiple !== undefined && tr.rMultiple !== null && tr.rMultiple < 0) || ((tr.profit || 0) < 0);
                                              return (
                                                <tr key={tr.id || `trade-${globalIdx}`} className="hover:bg-zinc-900/50">
                                                  <td className="py-1.5 px-3 text-zinc-500">{globalIdx + 1}</td>
                                                  <td className="py-1.5 px-3 text-zinc-300">
                                                    {tr.openedAt ? String(tr.openedAt).slice(0, 16) : '—'}
                                                  </td>
                                                  <td className="py-1.5 px-3 text-zinc-400">{tr.ticket || '—'}</td>
                                                  <td className="py-1.5 px-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tr.direction?.toLowerCase() === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                      {tr.direction?.toUpperCase()}
                                                    </span>
                                                  </td>
                                                  <td className="py-1.5 px-3 text-right text-zinc-300">{tr.lots}</td>
                                                  <td className="py-1.5 px-3 text-right text-zinc-200">{tr.entry}</td>
                                                  <td className="py-1.5 px-3 text-right text-zinc-400">
                                                    {tr.sl ?? '—'} / {tr.tp ?? '—'}
                                                  </td>
                                                  <td className="py-1.5 px-3 text-right text-zinc-200">{tr.exitPrice ?? '—'}</td>
                                                  <td className="py-1.5 px-3 text-zinc-400">{tr.exitReason || '—'}</td>
                                                  <td className={`py-1.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400'}`}>
                                                    {tr.rMultiple !== undefined && tr.rMultiple !== null
                                                      ? (tr.rMultiple > 0 ? `+${tr.rMultiple}R` : `${tr.rMultiple}R`)
                                                      : '—'}
                                                  </td>
                                                  <td className={`py-1.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400'}`}>
                                                    {tr.profit !== undefined && tr.profit !== null
                                                      ? (tr.profit > 0 ? `+$${tr.profit.toFixed(2)}` : `-$${Math.abs(tr.profit).toFixed(2)}`)
                                                      : '—'}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Pagination Controls */}
                                      {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono">
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
                                                setPairTradePages((prev) => ({
                                                  ...prev,
                                                  [runId]: Math.max(1, currentPage - 1),
                                                }));
                                              }}
                                              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:hover:bg-zinc-900 transition-colors flex items-center gap-1 text-[11px]"
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
                                                    setPairTradePages((prev) => ({
                                                      ...prev,
                                                      [runId]: p,
                                                    }));
                                                  }}
                                                  className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center transition-colors ${
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
                                                setPairTradePages((prev) => ({
                                                  ...prev,
                                                  [runId]: Math.min(totalPages, currentPage + 1),
                                                }));
                                              }}
                                              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:hover:bg-zinc-900 transition-colors flex items-center gap-1 text-[11px]"
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
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pair Quirks & Broker Parameters Section */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/70 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-purple-400">notes</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Pair Quirks & Broker Parameters (Stops Level, Spread, Min Lot)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSaved && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check</span>
                        Saved
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSymbol(null)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveNote(p.symbol)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingSymbol(p.symbol)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        Edit Notes
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={currentNotes}
                    onChange={(e) =>
                      setNoteInputs((prev) => ({
                        ...prev,
                        [p.symbol]: e.target.value,
                      }))
                    }
                    placeholder="e.g. Min stops level: 25 pips. Spread average 18. Min lot 0.20. Quirks: Avoid during rollover, heavy wick manipulation."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
                  />
                ) : (
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans min-h-[38px] flex items-center">
                    {currentNotes ? (
                      <p className="whitespace-pre-wrap">{currentNotes}</p>
                    ) : (
                      <span className="text-zinc-600 italic">
                        No specific broker quirks logged yet for {p.symbol}. Click &quot;Edit Notes&quot; to add stops level, spread, and nuances.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

