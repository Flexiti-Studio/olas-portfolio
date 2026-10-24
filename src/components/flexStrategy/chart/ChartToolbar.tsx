"use client";

import React from 'react';
import { Timeframe } from '@/lib/flexStrategy/engine/types';
import { isAllowedMultiple } from '@/lib/data/resample';

interface ChartToolbarProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  // Replay controls
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onResetReplay: () => void;
  replaySpeed: number;
  onSpeedChange: (speed: number) => void;
  // Run
  onRunStrategy: () => void;
  isRunning?: boolean;
  onUploadCsv?: (csvText: string) => void;
  // Indicators toggle
  onOpenIndicators?: () => void;
  activeIndicatorsCount?: number;
  // Backtest starting point controls
  backtestStartIndex?: number | null;
  isSelectingStartPoint?: boolean;
  onToggleSelectStartPoint?: () => void;
  onResetStartPoint?: () => void;
  // Chart type: candles or line
  chartType?: 'candles' | 'line';
  onChartTypeChange?: (type: 'candles' | 'line') => void;
  // Clear test
  onClearTest?: () => void;
  hasTrades?: boolean;
  // Base dataset meta for data status line & allowed multiples
  baseDatasetMeta?: {
    symbol: string;
    baseTimeframe: Timeframe;
    count: number;
    startDate: string;
    endDate: string;
  } | null;
  // History & Tools
  onUndo?: () => void;
  onRedo?: () => void;
  onScreenshot?: (action?: 'instant' | 'download' | 'copy' | 'preview') => void;
  isCapturingScreenshot?: boolean;
}

export function ChartToolbar({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  isPlaying,
  onPlayToggle,
  onStepForward,
  onResetReplay,
  replaySpeed,
  onSpeedChange,
  onRunStrategy,
  isRunning,
  onUploadCsv,
  onOpenIndicators,
  activeIndicatorsCount = 0,
  backtestStartIndex,
  isSelectingStartPoint = false,
  onToggleSelectStartPoint,
  onResetStartPoint,
  chartType = 'candles',
  onChartTypeChange,
  onClearTest,
  baseDatasetMeta,
  hasTrades = false,
  onUndo,
  onRedo,
  onScreenshot,
  isCapturingScreenshot = false,
}: ChartToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isTfDropdownOpen, setIsTfDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isScreenshotDropdownOpen, setIsScreenshotDropdownOpen] = React.useState(false);
  const screenshotDropdownRef = React.useRef<HTMLDivElement>(null);

  // Determine allowed timeframes based on imported base timeframe
  const baseTf: Timeframe = baseDatasetMeta?.baseTimeframe || '5m';

  const checkAllowed = (tf: Timeframe) => {
    return isAllowedMultiple(baseTf, tf);
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTfDropdownOpen(false);
      }
      if (screenshotDropdownRef.current && !screenshotDropdownRef.current.contains(event.target as Node)) {
        setIsScreenshotDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadCsv) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onUploadCsv(text);
      };
      reader.readAsText(file);
    }
  };

  const quickTimeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const allTimeframes: { label: string; group: string; items: { tf: Timeframe; label: string }[] }[] = [
    {
      label: 'Minutes',
      group: 'MINUTES',
      items: [
        { tf: '1m', label: '1 minute' },
        { tf: '3m', label: '3 minutes' },
        { tf: '5m', label: '5 minutes' },
        { tf: '15m', label: '15 minutes' },
        { tf: '30m', label: '30 minutes' },
      ],
    },
    {
      label: 'Hours',
      group: 'HOURS',
      items: [
        { tf: '1h', label: '1 hour' },
        { tf: '4h', label: '4 hours' },
      ],
    },
    {
      label: 'Days',
      group: 'DAYS',
      items: [
        { tf: '1d', label: '1 day' },
      ],
    },
  ];

  return (
    <div className="h-12 border-b border-zinc-800 bg-zinc-950 px-3 flex items-center justify-between gap-3 text-xs">
      {/* Left: Symbol & TradingView style Timeframe selectors & Indicators */}
      <div className="flex items-center gap-2">
        {/* Symbol badge */}
        <div className="flex items-center gap-1.5 font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
          <span className="material-symbols-outlined text-sm text-amber-400">candlestick_chart</span>
          <span>{symbol}</span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* TradingView Quick Timeframes Strip */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg p-0.5">
          {quickTimeframes.map((tf) => {
            const allowed = checkAllowed(tf);
            return (
              <button
                key={tf}
                type="button"
                disabled={!allowed}
                onClick={() => allowed && onTimeframeChange(tf)}
                title={allowed ? `Switch to ${tf}` : `Disabled: ${tf} is not a multiple of base ${baseTf}`}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : allowed
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    : 'text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
              >
                {tf}
              </button>
            );
          })}

          {/* Timeframe Dropdown (TradingView Chevron) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsTfDropdownOpen(!isTfDropdownOpen)}
              className={`px-1 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center ${
                isTfDropdownOpen ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="More Timeframes"
            >
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {isTfDropdownOpen && (
              <div className="absolute left-0 mt-2 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Select Timeframe (Base: {baseTf})
                </div>
                {allTimeframes.map((group) => (
                  <div key={group.group} className="mt-1.5">
                    <div className="px-3 py-0.5 text-[9px] font-bold text-zinc-500 uppercase">
                      {group.group}
                    </div>
                    {group.items.map((item) => {
                      const allowed = checkAllowed(item.tf);
                      return (
                        <button
                          key={item.tf}
                          type="button"
                          disabled={!allowed}
                          onClick={() => {
                            if (allowed) {
                              onTimeframeChange(item.tf);
                              setIsTfDropdownOpen(false);
                            }
                          }}
                          className={`w-full px-3 py-1 text-left text-xs flex items-center justify-between transition-colors ${
                            timeframe === item.tf
                              ? 'bg-blue-600/15 text-blue-400 font-bold'
                              : allowed
                              ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                              : 'text-zinc-600 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.tf}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Chart Type Toggle: Candles vs Line (TradingView style) */}
        {onChartTypeChange && (
          <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onChartTypeChange('candles')}
              className={`p-1 rounded transition-colors flex items-center ${
                chartType === 'candles'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Candlestick Chart"
            >
              <span className="material-symbols-outlined text-sm">candlestick_chart</span>
            </button>
            <button
              type="button"
              onClick={() => onChartTypeChange('line')}
              className={`p-1 rounded transition-colors flex items-center ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title="Line Chart (Area)"
            >
              <span className="material-symbols-outlined text-sm">show_chart</span>
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Indicators Button (TradingView style fx icon) */}
        {onOpenIndicators && (
          <button
            type="button"
            onClick={onOpenIndicators}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-semibold"
            title="Add Technical Indicators (SMA, EMA, RSI, VWAP, ATR)"
          >
            <span className="font-serif italic font-bold text-blue-400 text-xs">fx</span>
            <span>Indicators</span>
            {activeIndicatorsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                {activeIndicatorsCount}
              </span>
            )}
          </button>
        )}

        {/* Screenshot split button & dropdown menu */}
        <div ref={screenshotDropdownRef} className="relative flex items-center">
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors shadow-sm">
            <button
              type="button"
              onClick={() => onScreenshot?.('instant')}
              disabled={isCapturingScreenshot}
              className={`p-1.5 text-zinc-400 hover:text-white transition-all flex items-center justify-center group ${
                isCapturingScreenshot ? 'opacity-70 cursor-wait' : 'active:scale-95'
              }`}
              title="Quick Screenshot: Download PNG & Copy to clipboard"
            >
              {isCapturingScreenshot ? (
                <span className="material-symbols-outlined text-sm animate-spin text-blue-400">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">
                  photo_camera
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsScreenshotDropdownOpen((prev) => !prev)}
              disabled={isCapturingScreenshot}
              className="px-1 py-1.5 border-l border-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Screenshot options (Download, Copy, Preview)"
            >
              <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
            </button>
          </div>

          {/* Screenshot Dropdown Menu */}
          {isScreenshotDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-[#181c27] border border-[#2a2e39] rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsScreenshotDropdownOpen(false);
                  onScreenshot?.('instant');
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2e39] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-blue-400">photo_camera</span>
                <div>
                  <div className="font-semibold text-white text-[11px]">Quick Snapshot</div>
                  <div className="text-[10px] text-zinc-400">Save image & copy to clipboard</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsScreenshotDropdownOpen(false);
                  onScreenshot?.('download');
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2e39] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-emerald-400">download</span>
                <div>
                  <div className="font-semibold text-white text-[11px]">Download PNG Image</div>
                  <div className="text-[10px] text-zinc-400">Save high-res chart file</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsScreenshotDropdownOpen(false);
                  onScreenshot?.('copy');
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2e39] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-amber-400">content_copy</span>
                <div>
                  <div className="font-semibold text-white text-[11px]">Copy to Clipboard</div>
                  <div className="text-[10px] text-zinc-400">Instant paste into Discord, Notion</div>
                </div>
              </button>

              <div className="h-px bg-[#2a2e39] my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsScreenshotDropdownOpen(false);
                  onScreenshot?.('preview');
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2e39] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-purple-400">visibility</span>
                <div>
                  <div className="font-semibold text-white text-[11px]">Preview Snapshot Modal</div>
                  <div className="text-[10px] text-zinc-400">Inspect full-size image before saving</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Clear Test if trades present) */}
      <div className="flex items-center gap-2">
        {hasTrades && onClearTest && (
          <button
            type="button"
            onClick={onClearTest}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Clear current backtest results & remove trades from chart"
          >
            <span className="material-symbols-outlined text-sm text-zinc-500 group-hover:text-rose-400">mop</span>
            <span>Clear Test</span>
          </button>
        )}
      </div>
    </div>
  );
}
