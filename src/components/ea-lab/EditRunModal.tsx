"use client";

import React, { useState } from 'react';
import { RunLike } from '@/lib/ea-lab/metrics';
import { parseTesterLog, ParsedRun } from '@/lib/ea-lab/parse-log';
import { updateEaTestRun, deleteEaTestRun } from '@/app/actions/eaLab';
import { toast } from 'sonner';

interface EditRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: RunLike;
  versions?: { id: string; label: string }[];
  onUpdated?: () => void;
}

export function EditRunModal({
  isOpen,
  onClose,
  run,
  versions = [],
  onUpdated,
}: EditRunModalProps) {
  const [symbol, setSymbol] = useState(run.symbol || '');
  const [timeframe, setTimeframe] = useState(run.timeframe || 'H1');
  const [versionId, setVersionId] = useState(run.versionId || '');
  const [initialDeposit, setInitialDeposit] = useState(run.initialDeposit || 10000);
  const [finalBalance, setFinalBalance] = useState(run.finalBalance || 10000);
  const [currency, setCurrency] = useState(run.currency || 'USD');
  const [leverage, setLeverage] = useState(run.leverage || '1:100');
  const [journal, setJournal] = useState(run.journal || '');

  // Format testedAt for datetime-local
  const [testedAt, setTestedAt] = useState<string>(() => {
    const d = run.testedAt ? new Date(run.testedAt) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  });

  // Re-parsing log option
  const [isReparsingLog, setIsReparsingLog] = useState(false);
  const [newRawLog, setNewRawLog] = useState('');
  const [parsedRuns, setParsedRuns] = useState<ParsedRun[]>([]);
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);

  const reparsedRun = parsedRuns[selectedRunIdx] || null;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function selectParsedRun(runItem: ParsedRun, index: number) {
    setSelectedRunIdx(index);
    if (runItem.symbol && runItem.symbol !== 'UNKNOWN') {
      setSymbol(runItem.symbol);
    }
    if (runItem.timeframe) {
      setTimeframe(runItem.timeframe);
    }
    setInitialDeposit(runItem.initialDeposit);
    setFinalBalance(runItem.finalBalance);
    setCurrency(runItem.currency);
    setLeverage(runItem.leverage);
  }

  function handleLogChange(text: string) {
    setNewRawLog(text);
    if (!text.trim()) {
      setParsedRuns([]);
      setSelectedRunIdx(0);
      return;
    }
    try {
      const parsed = parseTesterLog(text);
      setParsedRuns(parsed);
      if (parsed.length > 0) {
        // Prefer a run that matches current symbol or has trades, or fallback to first
        let chosenIdx = 0;
        const matchingIdx = parsed.findIndex((r) => r.symbol === symbol || (r.trades && r.trades.length > 0));
        if (matchingIdx >= 0) {
          chosenIdx = matchingIdx;
        }
        selectParsedRun(parsed[chosenIdx], chosenIdx);
      }
    } catch (e) {
      console.error('Error reparsing log:', e);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!run.id) return;
    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: any = {
      runId: run.id,
      versionId: versionId || undefined,
      testedAt: testedAt ? new Date(testedAt) : undefined,
      symbol: symbol.trim(),
      timeframe: timeframe.trim() || null,
      initialDeposit: Number(initialDeposit),
      currency: currency.trim() || 'USD',
      leverage: leverage.trim() || '1:100',
      finalBalance: Number(finalBalance),
      journal: journal.trim() || null,
    };

    if (isReparsingLog && reparsedRun) {
      payload.rawLog = newRawLog;
      payload.periodFrom = reparsedRun.periodFrom ? new Date(reparsedRun.periodFrom.replace(/\./g, '-')) : null;
      payload.periodTo = reparsedRun.periodTo ? new Date(reparsedRun.periodTo.replace(/\./g, '-')) : null;
      payload.trades = reparsedRun.trades.map((t) => ({
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
      }));
    }

    const res = await updateEaTestRun(payload);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to update test run');
      toast.error(res.error || 'Failed to update test run');
      return;
    }

    toast.success('Strategy Tester run updated successfully!');
    onClose();
    if (onUpdated) {
      onUpdated();
    } else {
      window.location.reload();
    }
  }

  async function handleDelete() {
    if (!run.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this test run for ${run.symbol}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    const res = await deleteEaTestRun({ runId: run.id });
    setDeleting(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to delete test run');
      return;
    }

    toast.success('Strategy Tester run deleted successfully!');
    onClose();
    if (onUpdated) {
      onUpdated();
    } else {
      window.location.reload();
    }
  }

  const computedNet = Number((finalBalance - initialDeposit).toFixed(2));
  const computedReturn = initialDeposit > 0 ? Number(((computedNet / initialDeposit) * 100).toFixed(2)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">edit_note</span>
              Edit Strategy Tester Run
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Update run metadata, balances, execution notes, or re-parse the raw tester log.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Row 1: Symbol & Timeframe & Version */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Pair / Symbol *
              </label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Timeframe
              </label>
              <input
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="H1, M15..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {versions.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Code Version
                </label>
                <select
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 2: Tested At local datetime */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Tested At (Local Time in Africa/Lagos) *
            </label>
            <input
              type="datetime-local"
              required
              value={testedAt}
              onChange={(e) => setTestedAt(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Row 3: Financials */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Deposit ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Final Balance ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={finalBalance}
                onChange={(e) => setFinalBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Net Profit
              </label>
              <div
                className={`px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold ${
                  computedNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {computedNet >= 0 ? `+$${computedNet}` : `-$${Math.abs(computedNet)}`}
                <span className="text-[10px] font-normal ml-1">({computedReturn}%)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Leverage
              </label>
              <input
                type="text"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="1:100"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Trader Journal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Trader Journal / Observations
            </label>
            <textarea
              rows={3}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What the EA did, execution nuances, slippage, missed signals..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs leading-relaxed resize-none"
            />
          </div>

          {/* Optional: Reparse / Replace Log */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsReparsingLog(!isReparsingLog)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">
                {isReparsingLog ? 'expand_less' : 'expand_more'}
              </span>
              {isReparsingLog ? 'Cancel Reparsing Raw Log' : 'Re-paste & Re-parse MT5 Tester Log'}
            </button>

            {isReparsingLog && (
              <div className="mt-3 space-y-3 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <textarea
                  rows={5}
                  value={newRawLog}
                  onChange={(e) => handleLogChange(e.target.value)}
                  placeholder="Paste new raw MT5 Strategy Tester log here..."
                  className="w-full font-mono text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                />

                {parsedRuns.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    <span className="text-[11px] text-zinc-400 shrink-0 font-medium">Select Backtest Run:</span>
                    {parsedRuns.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectParsedRun(r, i)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                          selectedRunIdx === i
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                        }`}
                      >
                        <span>Run #{i + 1}</span>
                        <span className="text-[10px] opacity-80">({r.trades.length} trades)</span>
                      </button>
                    ))}
                  </div>
                )}

                {reparsedRun && (
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {reparsedRun.trades.length} Trades Parsed ({reparsedRun.symbol && reparsedRun.symbol !== 'UNKNOWN' ? reparsedRun.symbol : (symbol || 'Volatility 75 (1s) Index')})
                    </span>
                    <span className="text-zinc-400 font-mono">
                      Balance: ${reparsedRun.finalBalance}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              {deleting ? 'Deleting...' : 'Delete Run'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
