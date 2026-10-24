"use client";

import React, { useState, useEffect } from 'react';
import {
  ChartIndicatorConfig,
  DEFAULT_INDICATOR_PALETTES,
  formatIndicatorTitle,
} from '@/lib/flexStrategy/chart/indicators';

interface IndicatorSettingsModalProps {
  indicator: ChartIndicatorConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedConfig: ChartIndicatorConfig) => void;
}

export function IndicatorSettingsModal({
  indicator,
  isOpen,
  onClose,
  onSave,
}: IndicatorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');

  // Input states
  const [period, setPeriod] = useState<number>(20);
  const [source, setSource] = useState<'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3'>('close');
  const [stdDev, setStdDev] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(3);

  // Style states
  const [color, setColor] = useState<string>('#f59e0b');
  const [lineWidth, setLineWidth] = useState<number>(1.5);
  const [visible, setVisible] = useState<boolean>(true);

  // Sync state whenever opened indicator changes
  useEffect(() => {
    if (indicator) {
      setPeriod(indicator.period || 20);
      setSource(indicator.source || 'close');
      setStdDev(indicator.stdDev ?? 2);
      setMultiplier(indicator.multiplier ?? 3);
      setColor(indicator.color || '#f59e0b');
      setLineWidth(indicator.lineWidth || 1.5);
      setVisible(indicator.visible !== false);
      setActiveTab('inputs');
    }
  }, [indicator]);

  if (!isOpen || !indicator) return null;

  const handleSave = () => {
    const updated: ChartIndicatorConfig = {
      ...indicator,
      period,
      source,
      stdDev,
      multiplier,
      color,
      lineWidth,
      visible,
      name: formatIndicatorTitle({
        ...indicator,
        period,
        source,
        stdDev,
        multiplier,
      }),
    };
    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    setPeriod(indicator.type === 'rsi' || indicator.type === 'atr' ? 14 : 20);
    setSource('close');
    setStdDev(2);
    setMultiplier(3);
    setColor(indicator.type === 'rsi' ? '#8b5cf6' : indicator.type === 'atr' ? '#06b6d4' : '#f59e0b');
    setLineWidth(1.5);
    setVisible(true);
  };

  const typeUpper = indicator.type.toUpperCase();
  const hasSource = ['sma', 'ema', 'wma', 'rsi'].includes(indicator.type);
  const hasStdDev = indicator.type === 'boll';
  const hasMultiplier = indicator.type === 'supertrend';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#1e222d] border border-[#2a2e39] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs text-[#d1d4dc] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2a2e39] flex items-center justify-between bg-[#181b24]">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {formatIndicatorTitle(indicator)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* TradingView Tab Buttons */}
        <div className="flex items-center border-b border-[#2a2e39] bg-[#181b24]/50 px-5">
          <button
            type="button"
            onClick={() => setActiveTab('inputs')}
            className={`py-2 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'inputs'
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Inputs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`py-2 px-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'style'
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            Style
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 min-h-[220px]">
          {activeTab === 'inputs' ? (
            <div className="space-y-4">
              {/* Length / Period */}
              <div className="flex items-center justify-between">
                <label className="text-[#d1d4dc] font-medium">Length / Period</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPeriod((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[#2a2e39] hover:bg-[#363a45] text-white transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={period}
                    onChange={(e) => setPeriod(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-7 bg-[#131722] border border-[#2a2e39] rounded text-center text-white font-mono focus:outline-none focus:border-[#2962ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setPeriod((p) => p + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded bg-[#2a2e39] hover:bg-[#363a45] text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Source Price */}
              {hasSource && (
                <div className="flex items-center justify-between">
                  <label className="text-[#d1d4dc] font-medium">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="bg-[#131722] border border-[#2a2e39] rounded px-3 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                  >
                    <option value="close">Close</option>
                    <option value="open">Open</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                    <option value="hl2">HL2 ((H+L)/2)</option>
                    <option value="hlc3">HLC3 ((H+L+C)/3)</option>
                  </select>
                </div>
              )}

              {/* StdDev for Bollinger */}
              {hasStdDev && (
                <div className="flex items-center justify-between">
                  <label className="text-[#d1d4dc] font-medium">StdDev Multiplier</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={10}
                    value={stdDev}
                    onChange={(e) => setStdDev(parseFloat(e.target.value) || 2)}
                    className="w-20 h-7 bg-[#131722] border border-[#2a2e39] rounded text-center text-white font-mono focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              )}

              {/* Multiplier for SuperTrend */}
              {hasMultiplier && (
                <div className="flex items-center justify-between">
                  <label className="text-[#d1d4dc] font-medium">ATR Multiplier</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={10}
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value) || 3)}
                    className="w-20 h-7 bg-[#131722] border border-[#2a2e39] rounded text-center text-white font-mono focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Color Selection */}
              <div>
                <label className="text-[#d1d4dc] font-medium block mb-2">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DEFAULT_INDICATOR_PALETTES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded border border-[#2a2e39] bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-[#787b86] uppercase">{color}</span>
                  </div>
                </div>
              </div>

              {/* Line Thickness */}
              <div>
                <label className="text-[#d1d4dc] font-medium block mb-2">Line Thickness</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 1.5, 2.5, 4].map((w, idx) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setLineWidth(w)}
                      className={`h-8 flex items-center justify-center rounded border transition-colors ${
                        lineWidth === w
                          ? 'border-[#2962ff] bg-[#2962ff]/10 text-white'
                          : 'border-[#2a2e39] bg-[#131722] text-[#787b86] hover:text-[#d1d4dc]'
                      }`}
                    >
                      <div
                        className="w-8 rounded-full"
                        style={{
                          height: `${idx + 1}px`,
                          backgroundColor: lineWidth === w ? color : '#787b86',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Checkbox */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="ind_visible"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                  className="rounded bg-[#131722] border-[#2a2e39] text-[#2962ff] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="ind_visible" className="text-[#d1d4dc] cursor-pointer font-medium">
                  Show on chart
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2a2e39] flex items-center justify-between bg-[#181b24]">
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-[#787b86] hover:text-white transition-colors"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363a45] text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white font-semibold transition-colors shadow-sm"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
