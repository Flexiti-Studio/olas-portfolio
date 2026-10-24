"use client";

import React, { useState } from 'react';
import {
  ChartIndicatorConfig,
  IndicatorType,
  DEFAULT_INDICATOR_PALETTES,
  formatIndicatorTitle,
} from '@/lib/flexStrategy/chart/indicators';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: ChartIndicatorConfig[];
  onAddIndicator: (config: ChartIndicatorConfig) => void;
  onUpdateIndicator?: (config: ChartIndicatorConfig) => void;
  onRemoveIndicator: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

interface AvailableIndicatorItem {
  type: IndicatorType;
  name: string;
  category: 'moving_averages' | 'oscillators' | 'volatility' | 'volume';
  defaultPeriod: number;
  description: string;
  overlay: boolean;
  color: string;
  stdDev?: number;
  multiplier?: number;
}

const AVAILABLE_INDICATORS: AvailableIndicatorItem[] = [
  {
    type: 'ema',
    name: 'Exponential Moving Average (EMA)',
    category: 'moving_averages',
    defaultPeriod: 20,
    description: 'Weights recent prices more heavily, reacting faster to price swings.',
    overlay: true,
    color: '#f59e0b',
  },
  {
    type: 'sma',
    name: 'Simple Moving Average (SMA)',
    category: 'moving_averages',
    defaultPeriod: 20,
    description: 'Calculates the arithmetic average of price over a rolling lookback window.',
    overlay: true,
    color: '#2962ff',
  },
  {
    type: 'wma',
    name: 'Weighted Moving Average (WMA)',
    category: 'moving_averages',
    defaultPeriod: 20,
    description: 'Linearly weighted moving average with greatest weight on the latest bar.',
    overlay: true,
    color: '#06b6d4',
  },
  {
    type: 'vol',
    name: 'Volume (VOL)',
    category: 'volume',
    defaultPeriod: 20,
    description: 'Displays the traded volume with color-coded bars indicating buy/sell pressure.',
    overlay: false,
    color: '#26a69a',
  },
  {
    type: 'vwap',
    name: 'Volume Weighted Average Price (VWAP)',
    category: 'volume',
    defaultPeriod: 0,
    description: 'Calculates the true average price weighted by traded volume across sessions.',
    overlay: true,
    color: '#ec4899',
  },
  {
    type: 'boll',
    name: 'Bollinger Bands (BB)',
    category: 'volatility',
    defaultPeriod: 20,
    stdDev: 2,
    description: 'Dynamic volatility envelope showing standard deviation bands around a 20 SMA.',
    overlay: true,
    color: '#3b82f6',
  },
  {
    type: 'supertrend',
    name: 'SuperTrend',
    category: 'volatility',
    defaultPeriod: 10,
    multiplier: 3,
    description: 'ATR-based trailing trend-following indicator with dynamic upper/lower stops.',
    overlay: true,
    color: '#10b981',
  },
  {
    type: 'highest',
    name: 'Highest High Channel',
    category: 'volatility',
    defaultPeriod: 20,
    description: 'Tracks the highest resistance peak formed over the lookback window.',
    overlay: true,
    color: '#10b981',
  },
  {
    type: 'lowest',
    name: 'Lowest Low Channel',
    category: 'volatility',
    defaultPeriod: 20,
    description: 'Tracks the lowest support valley formed over the lookback window.',
    overlay: true,
    color: '#ef5350',
  },
  {
    type: 'rsi',
    name: 'Relative Strength Index (RSI)',
    category: 'oscillators',
    defaultPeriod: 14,
    description: 'Classic 0-100 momentum oscillator measuring speed and magnitude of price changes.',
    overlay: false,
    color: '#8b5cf6',
  },
  {
    type: 'atr',
    name: 'Average True Range (ATR)',
    category: 'volatility',
    defaultPeriod: 14,
    description: 'Measures market volatility by decomposing the entire range of an asset.',
    overlay: false,
    color: '#06b6d4',
  },
  {
    type: 'macd',
    name: 'MACD (12, 26, 9)',
    category: 'oscillators',
    defaultPeriod: 12,
    description: 'Moving Average Convergence Divergence showing trend momentum and crossovers.',
    overlay: false,
    color: '#2962ff',
  },
];

export function IndicatorsModal({
  isOpen,
  onClose,
  indicators,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator,
  onToggleVisibility,
}: IndicatorsModalProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingIndicator, setEditingIndicator] = useState<ChartIndicatorConfig | null>(null);

  if (!isOpen) return null;

  const filteredAvailable = AVAILABLE_INDICATORS.filter((ind) => {
    const matchesSearch =
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.type.toLowerCase().includes(search.toLowerCase()) ||
      ind.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || ind.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectToAdd = (item: AvailableIndicatorItem) => {
    const colorIndex = indicators.length % DEFAULT_INDICATOR_PALETTES.length;
    const color = item.color || DEFAULT_INDICATOR_PALETTES[colorIndex];

    const newConfig: ChartIndicatorConfig = {
      id: `${item.type}-${Date.now()}`,
      type: item.type,
      name: `${item.type.toUpperCase()}${item.defaultPeriod > 0 ? ` (${item.defaultPeriod})` : ''}`,
      period: item.defaultPeriod,
      color,
      lineWidth: 1.5,
      overlay: item.overlay,
      visible: true,
      source: 'close',
      stdDev: item.stdDev,
      multiplier: item.multiplier,
    };

    newConfig.name = formatIndicatorTitle(newConfig);
    onAddIndicator(newConfig);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#2a2e39] flex items-center justify-between bg-[#181b24]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2962ff]/10 border border-[#2962ff]/30 flex items-center justify-center text-[#2962ff]">
                <span className="material-symbols-outlined text-lg">stacked_line_chart</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Indicators & Strategies</h2>
                <p className="text-xs text-[#787b86]">
                  Authentic technical indicators, moving averages, channels, and oscillators
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-5 py-3 border-b border-[#2a2e39] bg-[#131722]/60">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#787b86] text-lg">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search indicators (e.g. EMA, RSI, SuperTrend, VWAP, Bollinger)..."
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#787b86] focus:outline-none focus:border-[#2962ff]"
                autoFocus
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'All Indicators' },
                { id: 'moving_averages', label: 'Moving Averages' },
                { id: 'oscillators', label: 'Oscillators' },
                { id: 'volatility', label: 'Volatility & Channels' },
                { id: 'volume', label: 'Volume' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#2962ff] text-white'
                      : 'bg-[#1e222d] text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content: Active List + Available Library */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]/60 p-5 space-y-6">
            {/* Active Indicators */}
            {indicators.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-[#787b86] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Active on Chart ({indicators.length})</span>
                </div>
                <div className="space-y-1.5">
                  {indicators.map((ind) => (
                    <div
                      key={ind.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#131722]/70 border border-[#2a2e39] text-xs hover:border-[#363a45] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ind.color }}
                        />
                        <span className="font-semibold text-white font-mono">{formatIndicatorTitle(ind)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e222d] text-[#787b86] font-mono border border-[#2a2e39]">
                          {ind.overlay ? 'Overlay' : 'Sub-pane'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Settings Cog */}
                        <button
                          type="button"
                          onClick={() => setEditingIndicator(ind)}
                          className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors"
                          title="Indicator Settings"
                        >
                          <span className="material-symbols-outlined text-base">settings</span>
                        </button>

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => onToggleVisibility(ind.id)}
                          className={`p-1 rounded hover:bg-[#2a2e39] transition-colors ${
                            ind.visible ? 'text-[#787b86] hover:text-white' : 'text-zinc-600'
                          }`}
                          title={ind.visible ? 'Hide Indicator' : 'Show Indicator'}
                        >
                          <span className="material-symbols-outlined text-base">
                            {ind.visible ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onRemoveIndicator(ind.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-[#787b86] hover:text-rose-400 transition-colors"
                          title="Remove from chart"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Library */}
            <div>
              <div className="text-[11px] font-bold text-[#787b86] uppercase tracking-wider mb-2">
                Indicator Library
              </div>
              <div className="grid grid-cols-1 gap-2">
                {filteredAvailable.map((item) => (
                  <div
                    key={item.type}
                    className="p-3 rounded-xl bg-[#131722]/40 hover:bg-[#181b24] border border-[#2a2e39] hover:border-[#363a45] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{item.name}</span>
                        <span className="text-[10px] text-[#787b86] font-mono px-1.5 py-0.2 rounded bg-[#1e222d] border border-[#2a2e39]">
                          {item.overlay ? 'Main Pane' : 'Sub-pane'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#787b86] truncate mt-0.5">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectToAdd(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#2962ff]/15 hover:bg-[#2962ff] text-[#2962ff] hover:text-white border border-[#2962ff]/30 text-xs font-semibold flex items-center gap-1 transition-all shrink-0 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add
                    </button>
                  </div>
                ))}
                {filteredAvailable.length === 0 && (
                  <div className="text-center py-8 text-[#787b86] text-xs">
                    No matching indicators found for "{search}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#2a2e39] bg-[#181b24] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-xs font-semibold text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Settings Modal */}
      {editingIndicator && (
        <IndicatorSettingsModal
          indicator={editingIndicator}
          isOpen={true}
          onClose={() => setEditingIndicator(null)}
          onSave={(updated) => {
            onUpdateIndicator?.(updated);
            setEditingIndicator(null);
          }}
        />
      )}
    </>
  );
}
