"use client";

import React, { useState, useRef, useEffect } from 'react';

interface BacktestReplayBarProps {
  candlesCount: number;
  currentReplayIndex: number;
  currentTime?: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onResetReplay: () => void;
  replaySpeed: number;
  onSpeedChange: (speed: number) => void;
  backtestStartIndex: number | null;
  isSelectingStartPoint: boolean;
  onToggleSelectStartPoint: () => void;
  onResetStartPoint: () => void;
  onRunStrategy: () => void;
  isRunning?: boolean;
  onClearTest?: () => void;
  hasTrades?: boolean;
  tradesCount?: number;
  netProfit?: number;
  winRate?: number;
  onExitBacktestMode: () => void;
  onToggleTester?: () => void;
  isTesterOpen?: boolean;
  candles?: { time: number; open: number; high: number; low: number; close: number }[];
  onSelectStartPoint?: (index: number) => void;
}

const speeds = [0.5, 1, 2, 5];

export function BacktestReplayBar({
  candlesCount,
  currentReplayIndex,
  currentTime,
  isPlaying,
  onPlayToggle,
  onStepForward,
  onResetReplay,
  replaySpeed,
  onSpeedChange,
  backtestStartIndex,
  isSelectingStartPoint,
  onToggleSelectStartPoint,
  onResetStartPoint,
  onRunStrategy,
  isRunning = false,
  onClearTest,
  hasTrades = false,
  tradesCount = 0,
  netProfit = 0,
  winRate = 0,
  onExitBacktestMode,
  onToggleTester,
  isTesterOpen = false,
  candles,
  onSelectStartPoint,
}: BacktestReplayBarProps) {
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
  const speedDropdownRef = useRef<HTMLDivElement>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setIsSpeedDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCandleMs = (time: number): number => {
    return time < 1e11 ? time * 1000 : time;
  };

  const toDateInputStr = (ms: number): string => {
    const d = new Date(ms);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const firstCandleMs = candles && candles.length > 0 ? getCandleMs(candles[0].time) : 0;
  const lastCandleMs = candles && candles.length > 0 ? getCandleMs(candles[candles.length - 1].time) : 0;
  const minDateStr = firstCandleMs > 0 ? toDateInputStr(firstCandleMs) : '';
  const maxDateStr = lastCandleMs > 0 ? toDateInputStr(lastCandleMs) : '';
  const effectiveDateStr = selectedDateStr || (backtestStartIndex != null && candles && candles[backtestStartIndex] ? toDateInputStr(getCandleMs(candles[backtestStartIndex].time)) : minDateStr);

  // Compute unique session / calendar days in loaded candles
  const uniqueDates = React.useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const map = new Map<string, number>();
    candles.forEach((c, idx) => {
      const dStr = toDateInputStr(getCandleMs(c.time));
      if (!map.has(dStr)) {
        map.set(dStr, idx);
      }
    });
    return Array.from(map.entries()).map(([dStr, barIdx]) => ({
      dateStr: dStr,
      barIndex: barIdx,
      label: `${dStr} (Bar #${barIdx + 1})`,
    }));
  }, [candles]);

  const handleJumpToDate = () => {
    if (!effectiveDateStr || !candles || candles.length === 0) return;
    const parts = effectiveDateStr.split('-');
    if (parts.length !== 3) return;
    const targetY = parseInt(parts[0], 10);
    const targetM = parseInt(parts[1], 10) - 1;
    const targetD = parseInt(parts[2], 10);
    const targetStartMs = new Date(targetY, targetM, targetD, 0, 0, 0).getTime();

    // Find the first candle that is on or after targetStartMs
    let bestIdx = -1;
    for (let i = 0; i < candles.length; i++) {
      const cMs = getCandleMs(candles[i].time);
      if (cMs >= targetStartMs) {
        bestIdx = i;
        break;
      }
    }
    if (bestIdx === -1) {
      bestIdx = 0;
    }
    onSelectStartPoint?.(bestIdx);
    setIsDatePickerOpen(false);
  };

  // Format timestamp for current candle
  const formattedTime = currentTime
    ? new Date(currentTime).toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';

  return (
    <div className="h-10 border-b border-[#1e222d] bg-[#141824] px-3 flex items-center justify-between shrink-0 text-xs text-[#d1d4dc] select-none z-20">
      {/* Left controls: Mode Tag, Start Point, Transport, Bar counter, Run Test */}
      <div className="flex items-center gap-2 overflow-x-auto min-w-0">
        {/* Mode Tag */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-700/60 text-purple-300 font-bold text-[11px] shadow-sm shrink-0">
          <span className="material-symbols-outlined text-sm text-purple-400">history_toggle_off</span>
          <span>Backtest Mode</span>
        </div>

      <div className="h-4 w-px bg-[#2a2e39]" />

      {/* 1. Start Point Selector */}
      {backtestStartIndex != null ? (
        <div className="flex items-center gap-1 bg-cyan-950/80 border border-cyan-700/70 text-cyan-200 px-2 py-0.5 rounded-lg font-mono text-[11px]">
          <span className="material-symbols-outlined text-xs text-cyan-400">flag</span>
          <span>Bar #{backtestStartIndex + 1}</span>
          <button
            type="button"
            onClick={onResetStartPoint}
            className="hover:text-white p-0.5 rounded hover:bg-cyan-900 transition-colors ml-0.5"
            title="Reset start point to beginning of chart"
          >
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleSelectStartPoint}
          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 ${
            isSelectingStartPoint
              ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse'
              : 'bg-[#1e222d] hover:bg-[#2a2e39] border-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]'
          }`}
          title="Click to select starting candle on chart"
        >
          <span className="material-symbols-outlined text-xs">add_location_alt</span>
          <span>{isSelectingStartPoint ? 'Pick Bar...' : 'Start Point'}</span>
        </button>
      )}

      {/* Pick Day / Date Button & Popover */}
      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 ${
            isDatePickerOpen
              ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
              : 'bg-[#1e222d] hover:bg-[#2a2e39] border-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]'
          }`}
          title="Pick calendar date or preset to start backtest"
        >
          <span className="material-symbols-outlined text-xs">calendar_month</span>
          <span>Pick Date</span>
        </button>

        {isDatePickerOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-3 z-50 text-xs text-[#d1d4dc] animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39] mb-2">
              <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-blue-400">event</span>
                Start From Date / Day
              </span>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                ✕
              </button>
            </div>

            {/* Dataset Date Range Badge */}
            {minDateStr && (
              <div className="text-[10px] text-zinc-400 bg-[#141824] px-2 py-1 rounded-lg border border-[#2a2e39] mb-2.5 flex items-center justify-between">
                <span>Data:</span>
                <span className="font-mono text-cyan-300 font-semibold">{minDateStr} → {maxDateStr}</span>
                <span className="text-zinc-500 font-mono">({candlesCount} bars)</span>
              </div>
            )}

            {/* Pick Day from Dataset Dropdown */}
            {uniqueDates.length > 0 && (
              <div className="mb-2.5">
                <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Trading Day</div>
                <select
                  className="w-full bg-[#141824] border border-[#2a2e39] focus:border-blue-500 rounded-lg px-2 py-1.5 text-xs text-white outline-none font-mono cursor-pointer"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const idx = parseInt(e.target.value, 10);
                    if (!isNaN(idx)) {
                      onSelectStartPoint?.(idx);
                      setIsDatePickerOpen(false);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select Calendar Day --</option>
                  {uniqueDates.map((u) => (
                    <option key={u.dateStr} value={u.barIndex}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Calendar Date Picker Input */}
            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Exact Calendar Date</div>
            <div className="flex flex-col gap-1.5 mb-2.5">
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={effectiveDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="w-full bg-[#141824] border border-[#2a2e39] focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none font-mono"
              />
              <button
                type="button"
                disabled={!effectiveDateStr}
                onClick={handleJumpToDate}
                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-xs">rocket_launch</span>
                <span>Jump to Date</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Quick Presets</div>
            <div className="grid grid-cols-2 gap-1 mb-2.5">
              {[
                { label: 'Earliest (Bar #1)', getIdx: () => 0 },
                { label: '25% in', getIdx: () => Math.floor(candlesCount * 0.25) },
                { label: '50% in', getIdx: () => Math.floor(candlesCount * 0.50) },
                { label: 'Last 50 bars', getIdx: () => Math.max(0, candlesCount - 50) },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const idx = p.getIdx();
                    onSelectStartPoint?.(idx);
                    setIsDatePickerOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-[#141824] hover:bg-blue-600/20 border border-[#2a2e39] hover:border-blue-500 text-[11px] text-zinc-300 hover:text-blue-300 font-mono text-left transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Bar Stepper / Direct Number */}
            <div className="pt-2 border-t border-[#2a2e39] flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 shrink-0">Or Bar #:</span>
              <input
                type="number"
                min={1}
                max={candlesCount}
                placeholder="1"
                defaultValue={backtestStartIndex != null ? backtestStartIndex + 1 : 1}
                id="bar_jump_input"
                className="w-20 bg-[#141824] border border-[#2a2e39] focus:border-blue-500 rounded px-2 py-0.5 text-xs text-white outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('bar_jump_input') as HTMLInputElement | null;
                  if (!input) return;
                  const num = parseInt(input.value, 10);
                  if (!isNaN(num)) {
                    onSelectStartPoint?.(Math.max(0, Math.min(candlesCount - 1, num - 1)));
                    setIsDatePickerOpen(false);
                  }
                }}
                className="flex-1 py-1 rounded bg-[#2a2e39] hover:bg-blue-600 text-white font-semibold text-[11px] transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Replay Transport Controls (Jump to Start, Play/Pause, Step Forward) */}
      <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg p-0.5">
        <button
          type="button"
          onClick={onResetReplay}
          className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
          title="Jump to Start Point"
        >
          <span className="material-symbols-outlined text-sm">first_page</span>
        </button>

        <button
          type="button"
          onClick={onPlayToggle}
          className={`p-1 rounded transition-colors flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-600 text-white shadow-sm'
              : 'hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]'
          }`}
          title={isPlaying ? 'Pause Replay (Space)' : 'Play Bar Replay (Space)'}
        >
          <span className="material-symbols-outlined text-sm">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          type="button"
          onClick={onStepForward}
          disabled={isPlaying}
          className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Step 1 Bar Forward"
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>

        {/* Speed Selector Dropdown */}
        <div className="relative" ref={speedDropdownRef}>
          <button
            type="button"
            onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-[#2a2e39] transition-colors flex items-center gap-0.5"
            title="Replay Speed"
          >
            <span>{replaySpeed}x</span>
            <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
          </button>

          {isSpeedDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-20 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onSpeedChange(s);
                    setIsSpeedDropdownOpen(false);
                  }}
                  className={`w-full px-2 py-1 text-left font-mono text-[11px] hover:bg-[#2a2e39] flex items-center justify-between transition-colors ${
                    replaySpeed === s ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-zinc-300'
                  }`}
                >
                  <span>{s}x</span>
                  {replaySpeed === s && <span className="material-symbols-outlined text-xs">check</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bar Counter & Timestamp */}
      <div className="flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 bg-[#171b26] border border-[#2a2e39] rounded-lg">
        <span className="text-[#787b86]">Bar:</span>
        <span className="font-bold text-white">
          {currentReplayIndex + 1}/{candlesCount}
        </span>
        {formattedTime && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 text-[10px]">{formattedTime}</span>
          </>
        )}
      </div>

      <div className="h-4 w-px bg-[#2a2e39]" />

      {/* 4. Run Backtest Simulation Button */}
      <button
        type="button"
        onClick={onRunStrategy}
        disabled={isRunning}
        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/30 disabled:opacity-50"
        title="Execute strategy simulation over historical data"
      >
        {isRunning ? (
          <>
            <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
            <span>Running...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xs">rocket_launch</span>
            <span>Run Test</span>
          </>
        )}
      </button>

      {/* 5. Clear Trades Button */}
      {hasTrades && onClearTest && (
        <button
          type="button"
          onClick={onClearTest}
          className="p-1 rounded-lg bg-[#1e222d] hover:bg-rose-950/40 border border-[#2a2e39] hover:border-rose-800 text-[#787b86] hover:text-rose-400 transition-colors"
          title="Clear backtest trades"
        >
          <span className="material-symbols-outlined text-sm">mop</span>
        </button>
      )}
      </div>

      {/* Right controls: Tester bottom panel toggle & Exit backtest */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 6. Toggle Strategy Tester Panel Button */}
        {onToggleTester && (
          <button
            type="button"
            onClick={onToggleTester}
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              isTesterOpen
                ? 'bg-[#2a2e39] border-[#2962ff]/50 text-[#2962ff]'
                : 'bg-[#1e222d] hover:bg-[#2a2e39] border-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]'
            }`}
            title={isTesterOpen ? 'Hide Strategy Tester bottom panel' : 'Open Strategy Tester bottom panel'}
          >
            <span className="material-symbols-outlined text-xs">query_stats</span>
            <span>Tester</span>
            <span className="material-symbols-outlined text-xs">
              {isTesterOpen ? 'expand_more' : 'expand_less'}
            </span>
          </button>
        )}

        {/* 7. Exit Backtest Mode Button */}
        <button
          type="button"
          onClick={onExitBacktestMode}
          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5"
          title="Exit Backtest Mode & Return to Strategy Mode"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}
