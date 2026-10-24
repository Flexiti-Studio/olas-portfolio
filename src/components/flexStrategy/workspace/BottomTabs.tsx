"use client";

import React, { useState } from 'react';
import { CompletedTrade, SimulationStats, EquityPoint, ActivePosition, TradeSubsetStats } from '@/lib/flexStrategy/engine/types';

interface BottomTabsProps {
  trades: CompletedTrade[];
  runningPosition?: ActivePosition | null;
  currentPrice?: number;
  startingCapital?: number;
  symbol?: string;
  stats: SimulationStats;
  equityCurve: EquityPoint[];
  versions: { version: number; name: string; createdBy: string; createdAt: Date }[];
  activeVersion: number;
  onRollbackVersion?: (version: number) => void;
  selectedTrade: CompletedTrade | null;
  onSelectTrade: (t: CompletedTrade | null) => void;
  strategyCode: string;
  onClearTest?: () => void;
  panelHeight?: 'normal' | 'expanded' | 'minimized';
  onPanelHeightChange?: (height: 'normal' | 'expanded' | 'minimized') => void;
}

export function BottomTabs({
  trades,
  runningPosition = null,
  currentPrice,
  startingCapital = 10000,
  symbol = 'XAUUSD',
  stats,
  equityCurve,
  versions,
  activeVersion,
  onRollbackVersion,
  selectedTrade,
  onSelectTrade,
  strategyCode,
  onClearTest,
  panelHeight: externalPanelHeight,
  onPanelHeightChange,
}: BottomTabsProps) {
  // Main Tab: 'strategyTester' | 'liveTerminal' | 'versions' | 'code'
  const [mainTab, setMainTab] = useState<'strategyTester' | 'liveTerminal' | 'versions' | 'code'>('strategyTester');

  // Strategy Tester Sub-tabs: 'overview' | 'performance' | 'trades' | 'properties'
  const [testerSubTab, setTesterSubTab] = useState<'overview' | 'performance' | 'trades' | 'properties'>('overview');

  // Overview Chart Mode: 'equity' | 'drawdown'
  const [chartMode, setChartMode] = useState<'equity' | 'drawdown'>('equity');

  // Hovered Trade on Equity Curve
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // List of Trades Filter: 'all' | 'long' | 'short' | 'wins' | 'losses'
  const [tradeFilter, setTradeFilter] = useState<'all' | 'long' | 'short' | 'wins' | 'losses'>('all');

  // Panel Height: 'normal' (h-72), 'expanded' (h-[440px]), 'minimized' (h-9) - CLOSED ON DEFAULT ('minimized')
  const [internalPanelHeight, setInternalPanelHeight] = useState<'normal' | 'expanded' | 'minimized'>('minimized');
  const panelHeight = externalPanelHeight !== undefined ? externalPanelHeight : internalPanelHeight;

  const handleSetPanelHeight = (newHeight: 'normal' | 'expanded' | 'minimized') => {
    setInternalPanelHeight(newHeight);
    onPanelHeightChange?.(newHeight);
  };

  // MT5 Mobile Live Calculations
  const balance = startingCapital + stats.netProfit;
  const livePrice = currentPrice || (runningPosition ? runningPosition.entryPrice : 0);

  let floatingPnl = 0;
  if (runningPosition && livePrice > 0) {
    const isLong = runningPosition.side === 'buy';
    floatingPnl = isLong
      ? (livePrice - runningPosition.entryPrice) * 1.0
      : (runningPosition.entryPrice - livePrice) * 1.0;
  }

  const equity = balance + floatingPnl;
  const margin = runningPosition && livePrice > 0 ? (livePrice * 1.0) / 100 : 0;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  // Filtered trades for List of Trades tab
  const filteredTrades = React.useMemo(() => {
    switch (tradeFilter) {
      case 'long':
        return trades.filter((t) => t.side === 'buy');
      case 'short':
        return trades.filter((t) => t.side === 'sell');
      case 'wins':
        return trades.filter((t) => t.pnl > 0);
      case 'losses':
        return trades.filter((t) => t.pnl < 0);
      default:
        return trades;
    }
  }, [trades, tradeFilter]);

  // Performance summary subsets fallback helper
  const allSub: TradeSubsetStats = stats.all || {
    netProfit: stats.netProfit,
    netProfitPercent: stats.netProfitPercent,
    grossProfit: Math.max(0, stats.netProfit),
    grossLoss: 0,
    totalTrades: stats.totalTrades,
    winningTrades: stats.wins,
    losingTrades: stats.losses,
    evenTrades: 0,
    winRate: stats.winRate,
    profitFactor: stats.profitFactor,
    avgTrade: stats.totalTrades > 0 ? Number((stats.netProfit / stats.totalTrades).toFixed(2)) : 0,
    avgWin: stats.averageWin,
    avgLoss: stats.averageLoss,
    winLossRatio: stats.averageLoss > 0 ? Number((stats.averageWin / stats.averageLoss).toFixed(2)) : 0,
    largestWin: stats.averageWin,
    largestLoss: stats.averageLoss,
    avgBarsInTrade: 0,
    avgBarsInWin: 0,
    avgBarsInLoss: 0,
    maxDrawdown: stats.maxDrawdown,
    maxDrawdownPercent: stats.maxDrawdownPercent,
    maxRunUp: 0,
    maxRunUpPercent: 0,
  };

  const longTradesList = trades.filter((t) => t.side === 'buy');
  const shortTradesList = trades.filter((t) => t.side === 'sell');
  const longSub: TradeSubsetStats = stats.long || {
    netProfit: longTradesList.reduce((acc, t) => acc + t.pnl, 0),
    netProfitPercent: 0,
    grossProfit: longTradesList.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0),
    grossLoss: longTradesList.filter((t) => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0),
    totalTrades: longTradesList.length,
    winningTrades: longTradesList.filter((t) => t.pnl > 0).length,
    losingTrades: longTradesList.filter((t) => t.pnl < 0).length,
    evenTrades: 0,
    winRate: longTradesList.length > 0 ? Number(((longTradesList.filter((t) => t.pnl > 0).length / longTradesList.length) * 100).toFixed(1)) : 0,
    profitFactor: 0,
    avgTrade: 0,
    avgWin: 0,
    avgLoss: 0,
    winLossRatio: 0,
    largestWin: 0,
    largestLoss: 0,
    avgBarsInTrade: 0,
    avgBarsInWin: 0,
    avgBarsInLoss: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    maxRunUp: 0,
    maxRunUpPercent: 0,
  };

  const shortSub: TradeSubsetStats = stats.short || {
    netProfit: shortTradesList.reduce((acc, t) => acc + t.pnl, 0),
    netProfitPercent: 0,
    grossProfit: shortTradesList.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0),
    grossLoss: shortTradesList.filter((t) => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0),
    totalTrades: shortTradesList.length,
    winningTrades: shortTradesList.filter((t) => t.pnl > 0).length,
    losingTrades: shortTradesList.filter((t) => t.pnl < 0).length,
    evenTrades: 0,
    winRate: shortTradesList.length > 0 ? Number(((shortTradesList.filter((t) => t.pnl > 0).length / shortTradesList.length) * 100).toFixed(1)) : 0,
    profitFactor: 0,
    avgTrade: 0,
    avgWin: 0,
    avgLoss: 0,
    winLossRatio: 0,
    largestWin: 0,
    largestLoss: 0,
    avgBarsInTrade: 0,
    avgBarsInWin: 0,
    avgBarsInLoss: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    maxRunUp: 0,
    maxRunUpPercent: 0,
  };

  const heightClass =
    panelHeight === 'minimized'
      ? 'h-9'
      : panelHeight === 'expanded'
      ? 'h-[420px]'
      : 'h-72';

  return (
    <div
      className={`${heightClass} border-t border-[#1e222d] bg-[#131722] text-[#d1d4dc] flex flex-col select-none text-xs transition-[height] duration-200 z-10 shrink-0`}
    >
      {/* =========================================================================
          TOP LEVEL TAB HEADER STRIP (TRADINGVIEW AUTHENTIC STYLE)
          ========================================================================= */}
      <div className="h-9 border-b border-[#1e222d] bg-[#171b26] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {/* 1. Strategy Tester Main Tab */}
          <button
            type="button"
            onClick={() => {
              if (mainTab === 'strategyTester' && panelHeight !== 'minimized') {
                handleSetPanelHeight('minimized');
              } else {
                setMainTab('strategyTester');
                handleSetPanelHeight('normal');
              }
            }}
            className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
              mainTab === 'strategyTester' && panelHeight !== 'minimized'
                ? 'bg-[#2a2e39] text-[#2962ff] shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
            title={mainTab === 'strategyTester' && panelHeight !== 'minimized' ? 'Click to close Strategy Tester' : 'Click to open Strategy Tester'}
          >
            <span className="material-symbols-outlined text-sm">query_stats</span>
            <span>Strategy Tester</span>
            {panelHeight === 'minimized' && (
              <span className="material-symbols-outlined text-xs text-[#787b86]">expand_less</span>
            )}
            {trades.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                stats.netProfit >= 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
              }`}>
                {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit}
              </span>
            )}
          </button>

          {/* 2. Live Terminal (MT5 Mobile Trades) */}
          <button
            type="button"
            onClick={() => {
              if (mainTab === 'liveTerminal' && panelHeight !== 'minimized') {
                handleSetPanelHeight('minimized');
              } else {
                setMainTab('liveTerminal');
                handleSetPanelHeight('normal');
              }
            }}
            className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
              mainTab === 'liveTerminal' && panelHeight !== 'minimized'
                ? 'bg-[#2a2e39] text-sky-400 shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
            title={mainTab === 'liveTerminal' && panelHeight !== 'minimized' ? 'Click to close Live Terminal' : 'Click to open Live Terminal'}
          >
            <span className="material-symbols-outlined text-sm">swap_vert</span>
            <span>Live Terminal</span>
            {runningPosition ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            ) : (
              <span className="text-[10px] text-[#787b86] font-mono">(0)</span>
            )}
          </button>

          {/* 3. Versions Tab */}
          <button
            type="button"
            onClick={() => {
              if (mainTab === 'versions' && panelHeight !== 'minimized') {
                handleSetPanelHeight('minimized');
              } else {
                setMainTab('versions');
                handleSetPanelHeight('normal');
              }
            }}
            className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
              mainTab === 'versions' && panelHeight !== 'minimized'
                ? 'bg-[#2a2e39] text-purple-400 shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
            title={mainTab === 'versions' && panelHeight !== 'minimized' ? 'Click to close Versions' : 'Click to open Versions'}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Versions ({versions.length})</span>
          </button>

          {/* 4. Generated Script Tab */}
          <button
            type="button"
            onClick={() => {
              if (mainTab === 'code' && panelHeight !== 'minimized') {
                handleSetPanelHeight('minimized');
              } else {
                setMainTab('code');
                handleSetPanelHeight('normal');
              }
            }}
            className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
              mainTab === 'code' && panelHeight !== 'minimized'
                ? 'bg-[#2a2e39] text-amber-400 shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
            title={mainTab === 'code' && panelHeight !== 'minimized' ? 'Click to close Script' : 'Click to open Script'}
          >
            <span className="material-symbols-outlined text-sm">code</span>
            <span>Pine / JS Script</span>
          </button>
        </div>

        {/* Right Action & Summary Strip */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div>
            <span className="text-[#787b86] uppercase mr-1">Net PnL:</span>
            <span className={`font-bold ${stats.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {stats.netProfit >= 0 ? `+$${stats.netProfit}` : `-$${Math.abs(stats.netProfit)}`} ({stats.netProfitPercent}%)
            </span>
          </div>

          <div>
            <span className="text-[#787b86] uppercase mr-1">Win Rate:</span>
            <span className="font-bold text-[#d1d4dc]">{stats.winRate}%</span>
          </div>

          <div>
            <span className="text-[#787b86] uppercase mr-1">PF:</span>
            <span className="font-bold text-amber-400">{stats.profitFactor}</span>
          </div>

          {onClearTest && (trades.length > 0 || runningPosition != null) && (
            <button
              type="button"
              onClick={onClearTest}
              className="px-2 py-0.5 rounded text-[10px] text-[#787b86] hover:text-[#ef5350] hover:bg-rose-950/40 border border-[#2a2e39] transition-colors flex items-center gap-1 font-sans"
              title="Clear current backtest results & remove trades from chart"
            >
              <span className="material-symbols-outlined text-xs">mop</span>
              <span>Clear</span>
            </button>
          )}

          <div className="w-px h-4 bg-[#2a2e39]" />

          {/* Height Expand/Collapse Controls */}
          <div className="flex items-center gap-1 font-sans">
            <button
              type="button"
              onClick={() => handleSetPanelHeight(panelHeight === 'minimized' ? 'normal' : 'minimized')}
              className="px-2 py-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors flex items-center gap-1 text-[11px]"
              title={panelHeight === 'minimized' ? 'Open Strategy Tester' : 'Close / Minimize Strategy Tester'}
            >
              <span className="material-symbols-outlined text-sm">
                {panelHeight === 'minimized' ? 'expand_less' : 'expand_more'}
              </span>
              <span>{panelHeight === 'minimized' ? 'Open' : 'Close'}</span>
            </button>
            {panelHeight !== 'minimized' && (
              <button
                type="button"
                onClick={() => handleSetPanelHeight(panelHeight === 'expanded' ? 'normal' : 'expanded')}
                className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
                title={panelHeight === 'expanded' ? 'Restore Normal Height' : 'Maximize Panel'}
              >
                <span className="material-symbols-outlined text-sm">
                  {panelHeight === 'expanded' ? 'close_fullscreen' : 'open_in_full'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {panelHeight !== 'minimized' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* =========================================================================
              1. STRATEGY TESTER PANEL (TRADINGVIEW SUB-TABS)
              ========================================================================= */}
          {mainTab === 'strategyTester' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Strategy Tester Sub-navigation Bar */}
              <div className="h-8 border-b border-[#1e222d] bg-[#131722] px-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTesterSubTab('overview')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      testerSubTab === 'overview'
                        ? 'text-[#2962ff] bg-[#2a2e39]/60 border-b-2 border-[#2962ff]'
                        : 'text-[#787b86] hover:text-[#d1d4dc]'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setTesterSubTab('performance')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      testerSubTab === 'performance'
                        ? 'text-[#2962ff] bg-[#2a2e39]/60 border-b-2 border-[#2962ff]'
                        : 'text-[#787b86] hover:text-[#d1d4dc]'
                    }`}
                  >
                    Performance Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setTesterSubTab('trades')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                      testerSubTab === 'trades'
                        ? 'text-[#2962ff] bg-[#2a2e39]/60 border-b-2 border-[#2962ff]'
                        : 'text-[#787b86] hover:text-[#d1d4dc]'
                    }`}
                  >
                    <span>List of Trades</span>
                    <span className="text-[10px] px-1.5 py-0.1 rounded-full bg-[#1e222d] font-mono text-[#d1d4dc]">
                      {trades.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTesterSubTab('properties')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      testerSubTab === 'properties'
                        ? 'text-[#2962ff] bg-[#2a2e39]/60 border-b-2 border-[#2962ff]'
                        : 'text-[#787b86] hover:text-[#d1d4dc]'
                    }`}
                  >
                    Properties
                  </button>
                </div>

                {/* Sub-tab Context Info */}
                <div className="text-[11px] text-[#787b86] font-mono">
                  Initial Capital: ${startingCapital.toLocaleString()} • Currency: USD • Symbol: {symbol}
                </div>
              </div>

              {/* Sub-tab Body */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* -------------------------------------------------------------
                    SUB-TAB 1: OVERVIEW (METRICS TILES + PERFORMANCE CURVE)
                    ------------------------------------------------------------- */}
                {testerSubTab === 'overview' && (
                  <div className="space-y-3">
                    {/* 6 Key Metric Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Net Profit</span>
                        <div className={`text-base font-bold font-mono mt-0.5 ${stats.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                          {stats.netProfit >= 0 ? `+$${stats.netProfit}` : `-$${Math.abs(stats.netProfit)}`}
                        </div>
                        <span className={`text-[10px] font-mono ${stats.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                          {stats.netProfit >= 0 ? '+' : ''}{stats.netProfitPercent}%
                        </span>
                      </div>

                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Total Closed Trades</span>
                        <div className="text-base font-bold font-mono text-[#d1d4dc] mt-0.5">
                          {stats.totalTrades}
                        </div>
                        <span className="text-[10px] text-[#787b86] font-mono">
                          {stats.wins} W / {stats.losses} L
                        </span>
                      </div>

                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Percent Profitable</span>
                        <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                          {stats.winRate}%
                        </div>
                        <span className="text-[10px] text-[#787b86] font-mono">
                          Win Rate
                        </span>
                      </div>

                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Profit Factor</span>
                        <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                          {stats.profitFactor}
                        </div>
                        <span className="text-[10px] text-[#787b86] font-mono">
                          Expectancy: ${stats.expectancy}
                        </span>
                      </div>

                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Max Drawdown</span>
                        <div className="text-base font-bold font-mono text-[#ef5350] mt-0.5">
                          -${stats.maxDrawdown}
                        </div>
                        <span className="text-[10px] text-rose-400 font-mono">
                          -{stats.maxDrawdownPercent}%
                        </span>
                      </div>

                      <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-2.5">
                        <span className="text-[10px] text-[#787b86] uppercase block font-semibold">Avg Trade P&L</span>
                        <div className={`text-base font-bold font-mono mt-0.5 ${allSub.avgTrade >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                          {allSub.avgTrade >= 0 ? `+$${allSub.avgTrade}` : `-$${Math.abs(allSub.avgTrade)}`}
                        </div>
                        <span className="text-[10px] text-[#787b86] font-mono">
                          Avg Win: ${stats.averageWin}
                        </span>
                      </div>
                    </div>

                    {/* Performance Curve (TradingView Equity Graph) */}
                    <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#d1d4dc]">Performance Graph</span>
                          <div className="flex items-center bg-[#131722] border border-[#1e222d] rounded p-0.5">
                            <button
                              type="button"
                              onClick={() => setChartMode('equity')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                chartMode === 'equity'
                                  ? 'bg-[#2962ff] text-white'
                                  : 'text-[#787b86] hover:text-[#d1d4dc]'
                              }`}
                            >
                              Equity ($)
                            </button>
                            <button
                              type="button"
                              onClick={() => setChartMode('drawdown')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                chartMode === 'drawdown'
                                  ? 'bg-[#ef5350] text-white'
                                  : 'text-[#787b86] hover:text-[#d1d4dc]'
                              }`}
                            >
                              Drawdown (%)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] font-mono text-[#787b86]">
                          <span>Start: <span className="text-[#d1d4dc]">${startingCapital.toLocaleString()}</span></span>
                          <span>Peak: <span className="text-emerald-400">${(startingCapital + Math.max(0, stats.netProfit)).toLocaleString()}</span></span>
                          <span>End: <span className={stats.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}>${(startingCapital + stats.netProfit).toLocaleString()}</span></span>
                        </div>
                      </div>

                      {/* SVG Canvas Area Chart */}
                      <div className="w-full h-40 relative bg-[#131722] rounded border border-[#1e222d] p-2 overflow-hidden">
                        {equityCurve.length > 1 ? (
                          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <defs>
                              <linearGradient id="equityGradientProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#26a69a" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#26a69a" stopOpacity="0.0" />
                              </linearGradient>
                              <linearGradient id="equityGradientLoss" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef5350" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#ef5350" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {(() => {
                              if (chartMode === 'equity') {
                                const minEq = Math.min(...equityCurve.map((e) => e.equity), startingCapital * 0.98);
                                const maxEq = Math.max(...equityCurve.map((e) => e.equity), startingCapital * 1.02);
                                const range = maxEq - minEq || 1;

                                const coords = equityCurve.map((e, idx) => {
                                  const x = (idx / (equityCurve.length - 1)) * 100;
                                  const y = 95 - ((e.equity - minEq) / range) * 90;
                                  return { x, y, equity: e.equity, drawdown: e.drawdown, time: e.time };
                                });

                                const pointsString = coords.map((c) => `${c.x},${c.y}`).join(' ');
                                const areaString = `${pointsString} 100,100 0,100`;

                                // Baseline y for startingCapital
                                const baselineY = 95 - ((startingCapital - minEq) / range) * 90;

                                return (
                                  <>
                                    {/* Baseline starting capital */}
                                    <line
                                      x1="0"
                                      y1={baselineY}
                                      x2="100"
                                      y2={baselineY}
                                      stroke="#2a2e39"
                                      strokeWidth="1"
                                      strokeDasharray="2 2"
                                    />

                                    {/* Filled gradient area */}
                                    <polygon
                                      fill={stats.netProfit >= 0 ? 'url(#equityGradientProfit)' : 'url(#equityGradientLoss)'}
                                      points={areaString}
                                    />

                                    {/* Main line */}
                                    <polyline
                                      fill="none"
                                      stroke={stats.netProfit >= 0 ? '#26a69a' : '#ef5350'}
                                      strokeWidth="2"
                                      points={pointsString}
                                    />

                                    {/* Clickable trade circles */}
                                    {coords.map((c, idx) => (
                                      <circle
                                        key={idx}
                                        cx={c.x}
                                        cy={c.y}
                                        r={hoveredPointIdx === idx ? 4 : 2}
                                        fill={hoveredPointIdx === idx ? '#38bdf8' : stats.netProfit >= 0 ? '#26a69a' : '#ef5350'}
                                        stroke="#131722"
                                        strokeWidth="1"
                                        className="cursor-pointer transition-all"
                                        onMouseEnter={() => setHoveredPointIdx(idx)}
                                        onMouseLeave={() => setHoveredPointIdx(null)}
                                        onClick={() => {
                                          if (idx > 0 && trades[idx - 1]) {
                                            onSelectTrade(trades[idx - 1]);
                                          }
                                        }}
                                      />
                                    ))}
                                  </>
                                );
                              } else {
                                // Drawdown Mode
                                const maxDdVal = Math.max(...equityCurve.map((e) => e.drawdown), 10);
                                const coords = equityCurve.map((e, idx) => {
                                  const x = (idx / (equityCurve.length - 1)) * 100;
                                  const y = 5 + (e.drawdown / maxDdVal) * 90;
                                  return { x, y, drawdown: e.drawdown, time: e.time };
                                });

                                const pointsString = coords.map((c) => `${c.x},${c.y}`).join(' ');
                                const areaString = `0,5 ${pointsString} 100,5`;

                                return (
                                  <>
                                    <polygon
                                      fill="url(#equityGradientLoss)"
                                      points={areaString}
                                    />
                                    <polyline
                                      fill="none"
                                      stroke="#ef5350"
                                      strokeWidth="2"
                                      points={pointsString}
                                    />
                                  </>
                                );
                              }
                            })()}
                          </svg>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#787b86] text-xs">
                            <span className="material-symbols-outlined text-2xl text-[#2a2e39] mb-1">show_chart</span>
                            <span>Run the strategy to generate the TradingView equity curve.</span>
                          </div>
                        )}

                        {/* Interactive Tooltip on Hover */}
                        {hoveredPointIdx !== null && equityCurve[hoveredPointIdx] && (
                          <div className="absolute top-2 right-2 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 shadow-lg pointer-events-none font-mono text-[10px]">
                            <div className="text-white font-bold">Trade #{hoveredPointIdx}</div>
                            <div className="text-[#38bdf8]">Equity: ${equityCurve[hoveredPointIdx].equity.toLocaleString()}</div>
                            <div className="text-[#ef5350]">Drawdown: -${equityCurve[hoveredPointIdx].drawdown.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 2: PERFORMANCE SUMMARY (TRADINGVIEW 3-COLUMN TABLE)
                    ------------------------------------------------------------- */}
                {testerSubTab === 'performance' && (
                  <div className="border border-[#1e222d] rounded-lg overflow-x-auto bg-[#171b26]">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-[#131722] text-[#787b86] uppercase text-[10px] border-b border-[#1e222d]">
                        <tr>
                          <th className="p-2.5 font-semibold">Performance Metric</th>
                          <th className="p-2.5 font-semibold text-right">All Trades</th>
                          <th className="p-2.5 font-semibold text-right text-emerald-400">Long Trades</th>
                          <th className="p-2.5 font-semibold text-right text-rose-400">Short Trades</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e222d]/60 bg-[#171b26]">
                        {/* Net Profit */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors font-bold">
                          <td className="p-2.5 text-[#d1d4dc]">Net Profit</td>
                          <td className={`p-2.5 text-right ${allSub.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                            {allSub.netProfit >= 0 ? `+$${allSub.netProfit}` : `-$${Math.abs(allSub.netProfit)}`} ({allSub.netProfitPercent}%)
                          </td>
                          <td className={`p-2.5 text-right ${longSub.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                            {longSub.netProfit >= 0 ? `+$${longSub.netProfit}` : `-$${Math.abs(longSub.netProfit)}`}
                          </td>
                          <td className={`p-2.5 text-right ${shortSub.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                            {shortSub.netProfit >= 0 ? `+$${shortSub.netProfit}` : `-$${Math.abs(shortSub.netProfit)}`}
                          </td>
                        </tr>

                        {/* Gross Profit */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Gross Profit</td>
                          <td className="p-2.5 text-right text-[#26a69a]">+${allSub.grossProfit}</td>
                          <td className="p-2.5 text-right text-[#26a69a]">+${longSub.grossProfit}</td>
                          <td className="p-2.5 text-right text-[#26a69a]">+${shortSub.grossProfit}</td>
                        </tr>

                        {/* Gross Loss */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Gross Loss</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${allSub.grossLoss}</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${longSub.grossLoss}</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${shortSub.grossLoss}</td>
                        </tr>

                        {/* Max Drawdown */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Max Drawdown</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${allSub.maxDrawdown} (-{allSub.maxDrawdownPercent}%)</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${longSub.maxDrawdown}</td>
                          <td className="p-2.5 text-right text-[#ef5350]">-${shortSub.maxDrawdown}</td>
                        </tr>

                        {/* Buy & Hold Return */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Buy & Hold Return</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            {stats.buyAndHoldReturn != null ? `${stats.buyAndHoldReturn >= 0 ? '+' : ''}$${stats.buyAndHoldReturn} (${stats.buyAndHoldReturnPercent}%)` : '—'}
                          </td>
                          <td className="p-2.5 text-right text-[#787b86]">—</td>
                          <td className="p-2.5 text-right text-[#787b86]">—</td>
                        </tr>

                        {/* Sharpe & Sortino */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Sharpe Ratio / Sortino</td>
                          <td className="p-2.5 text-right text-blue-400 font-bold">{stats.sharpeRatio ?? '—'} / {stats.sortinoRatio ?? '—'}</td>
                          <td className="p-2.5 text-right text-[#787b86]">—</td>
                          <td className="p-2.5 text-right text-[#787b86]">—</td>
                        </tr>

                        {/* Profit Factor */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Profit Factor</td>
                          <td className="p-2.5 text-right text-amber-400 font-bold">{allSub.profitFactor}</td>
                          <td className="p-2.5 text-right text-amber-400">{longSub.profitFactor}</td>
                          <td className="p-2.5 text-right text-amber-400">{shortSub.profitFactor}</td>
                        </tr>

                        {/* Total Closed Trades */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Total Closed Trades</td>
                          <td className="p-2.5 text-right text-[#d1d4dc] font-bold">{allSub.totalTrades}</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{longSub.totalTrades}</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{shortSub.totalTrades}</td>
                        </tr>

                        {/* Winning Trades */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Winning Trades (%)</td>
                          <td className="p-2.5 text-right text-emerald-400">{allSub.winningTrades} ({allSub.winRate}%)</td>
                          <td className="p-2.5 text-right text-emerald-400">{longSub.winningTrades} ({longSub.winRate}%)</td>
                          <td className="p-2.5 text-right text-emerald-400">{shortSub.winningTrades} ({shortSub.winRate}%)</td>
                        </tr>

                        {/* Losing Trades */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Losing Trades</td>
                          <td className="p-2.5 text-right text-rose-400">{allSub.losingTrades}</td>
                          <td className="p-2.5 text-right text-rose-400">{longSub.losingTrades}</td>
                          <td className="p-2.5 text-right text-rose-400">{shortSub.losingTrades}</td>
                        </tr>

                        {/* Avg Trade */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Average Trade</td>
                          <td className={`p-2.5 text-right ${allSub.avgTrade >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                            {allSub.avgTrade >= 0 ? `+$${allSub.avgTrade}` : `-$${Math.abs(allSub.avgTrade)}`}
                          </td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{longSub.avgTrade}</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{shortSub.avgTrade}</td>
                        </tr>

                        {/* Avg Win / Avg Loss */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Avg Win / Avg Loss</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${allSub.avgWin}</span> / <span className="text-rose-400">-${allSub.avgLoss}</span>
                          </td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${longSub.avgWin}</span> / <span className="text-rose-400">-${longSub.avgLoss}</span>
                          </td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${shortSub.avgWin}</span> / <span className="text-rose-400">-${shortSub.avgLoss}</span>
                          </td>
                        </tr>

                        {/* Ratio Avg Win / Avg Loss */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Ratio Avg Win / Avg Loss</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{allSub.winLossRatio}</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{longSub.winLossRatio}</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{shortSub.winLossRatio}</td>
                        </tr>

                        {/* Largest Win / Largest Loss */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Largest Win / Largest Loss</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${allSub.largestWin}</span> / <span className="text-rose-400">-${allSub.largestLoss}</span>
                          </td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${longSub.largestWin}</span> / <span className="text-rose-400">-${longSub.largestLoss}</span>
                          </td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">
                            <span className="text-emerald-400">+${shortSub.largestWin}</span> / <span className="text-rose-400">-${shortSub.largestLoss}</span>
                          </td>
                        </tr>

                        {/* Avg Bars in Trades */}
                        <tr className="hover:bg-[#1e222d]/40 transition-colors">
                          <td className="p-2.5 text-[#787b86]">Avg # Bars in Trades</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{allSub.avgBarsInTrade} bars</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{longSub.avgBarsInTrade} bars</td>
                          <td className="p-2.5 text-right text-[#d1d4dc]">{shortSub.avgBarsInTrade} bars</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 3: LIST OF TRADES (TRADINGVIEW TRADE LOG)
                    ------------------------------------------------------------- */}
                {testerSubTab === 'trades' && (
                  <div className="space-y-2">
                    {/* Filter Pills */}
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTradeFilter('all')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            tradeFilter === 'all'
                              ? 'bg-[#2962ff] text-white'
                              : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]'
                          }`}
                        >
                          All ({trades.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTradeFilter('long')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            tradeFilter === 'long'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]'
                          }`}
                        >
                          Long ({trades.filter((t) => t.side === 'buy').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTradeFilter('short')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            tradeFilter === 'short'
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]'
                          }`}
                        >
                          Short ({trades.filter((t) => t.side === 'sell').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTradeFilter('wins')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            tradeFilter === 'wins'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]'
                          }`}
                        >
                          Wins ({trades.filter((t) => t.pnl > 0).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTradeFilter('losses')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            tradeFilter === 'losses'
                              ? 'bg-rose-700 text-white'
                              : 'bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]'
                          }`}
                        >
                          Losses ({trades.filter((t) => t.pnl < 0).length})
                        </button>
                      </div>

                      <span className="text-[10px] text-[#787b86]">
                        💡 Click any trade row to jump and highlight it on the chart.
                      </span>
                    </div>

                    {/* Trade Log Table */}
                    <div className="border border-[#1e222d] rounded-lg overflow-x-auto bg-[#171b26]">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#131722] text-[#787b86] uppercase text-[10px] border-b border-[#1e222d]">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Signal / Reason</th>
                            <th className="p-2">Date / Time</th>
                            <th className="p-2">Entry → Exit Price</th>
                            <th className="p-2">Lots</th>
                            <th className="p-2 text-right">Profit ($)</th>
                            <th className="p-2 text-right">Cum Profit</th>
                            <th className="p-2 text-right">Run-up (MFE)</th>
                            <th className="p-2 text-right">Drawdown (MAE)</th>
                            <th className="p-2 text-center">Bars</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e222d]/60 bg-[#171b26]">
                          {filteredTrades.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="p-6 text-center text-[#787b86]">
                                No trades matched the current filter.
                              </td>
                            </tr>
                          ) : (
                            filteredTrades.map((t, idx) => {
                              const isSelected = selectedTrade?.id === t.id;
                              const isWin = t.pnl >= 0;
                              const isBuy = t.side === 'buy';

                              const entryDate = new Date(t.entryTime < 1e11 ? t.entryTime * 1000 : t.entryTime);

                              return (
                                <tr
                                  key={t.id}
                                  onClick={() => onSelectTrade(isSelected ? null : t)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-950/60 border-l-2 border-[#2962ff] text-white'
                                      : 'hover:bg-[#1e222d]'
                                  }`}
                                >
                                  <td className="p-2 text-[#787b86] font-semibold">{idx + 1}</td>
                                  <td className="p-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                        isBuy
                                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                      }`}
                                    >
                                      {isBuy ? '▲ Entry Long' : '▼ Entry Short'}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        t.reason === 'TP'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                          : t.reason === 'SL'
                                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                          : 'bg-[#1e222d] text-[#d1d4dc]'
                                      }`}
                                    >
                                      {t.reason === 'TP'
                                        ? '🎯 Take Profit'
                                        : t.reason === 'SL'
                                        ? '🛑 Stop Loss'
                                        : t.reason === 'SIGNAL_CLOSE'
                                        ? '✕ Signal Close'
                                        : t.reason === 'REVERSE'
                                        ? '↻ Reverse'
                                        : 'End of Data'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-[#787b86]">
                                    {entryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {entryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="p-2 text-[#d1d4dc]">
                                    <span className="text-[#787b86]">{t.entryPrice.toFixed(2)}</span>
                                    <span className="mx-1 text-[#787b86]">→</span>
                                    <span className="font-bold">{t.exitPrice.toFixed(2)}</span>
                                  </td>
                                  <td className="p-2 text-[#787b86]">{t.contracts ?? 1.0}</td>
                                  <td className={`p-2 text-right font-bold ${isWin ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                    {isWin ? `+$${t.pnl}` : `-$${Math.abs(t.pnl)}`} ({t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent}%)
                                  </td>
                                  <td className={`p-2 text-right font-mono ${t.cumulativeProfit != null && t.cumulativeProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                                    {t.cumulativeProfit != null ? `${t.cumulativeProfit >= 0 ? '+' : ''}$${t.cumulativeProfit}` : '—'}
                                  </td>
                                  <td className="p-2 text-right text-emerald-400/80 font-mono">
                                    {t.runUp != null ? `+$${t.runUp}` : '—'}
                                  </td>
                                  <td className="p-2 text-right text-rose-400/80 font-mono">
                                    {t.drawdown != null ? `-$${t.drawdown}` : '—'}
                                  </td>
                                  <td className="p-2 text-center text-[#787b86] font-mono">
                                    {t.barsInTrade ?? 1}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 4: PROPERTIES (BACKTEST SETTINGS)
                    ------------------------------------------------------------- */}
                {testerSubTab === 'properties' && (
                  <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-4 space-y-4 max-w-2xl font-sans">
                    <h4 className="font-bold text-sm text-white">Strategy Backtest Properties</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Initial Capital</label>
                        <div className="flex items-center bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-[#d1d4dc]">
                          <span className="text-[#787b86] mr-1">$</span>
                          <span>{startingCapital.toLocaleString()}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Base Currency</label>
                        <div className="bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-[#d1d4dc]">
                          USD
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Order Sizing</label>
                        <div className="bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-[#d1d4dc]">
                          1.00 Contract / Lot (Fixed)
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Pyramiding</label>
                        <div className="bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-[#d1d4dc]">
                          1 Order (Standard)
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Default Execution</label>
                        <div className="bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-[#d1d4dc]">
                          On Bar Close (Fills on Next Bar Open)
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#787b86] mb-1 font-medium">Intrabar SL/TP Check</label>
                        <div className="bg-[#131722] border border-[#1e222d] rounded px-3 py-1.5 font-mono text-emerald-400 font-semibold">
                          Enabled (High / Low Evaluation)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              2. LIVE TERMINAL TAB (MT5 MOBILE BALANCE, EQUITY & POSITIONS)
              ========================================================================= */}
          {mainTab === 'liveTerminal' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-[#171b26] border border-[#1e222d] rounded-xl p-3.5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                {/* Account Capital Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                  <div>
                    <span className="text-[#787b86] block text-[11px]">Balance:</span>
                    <span className="text-white font-bold text-sm">
                      {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#787b86] block text-[11px]">Equity:</span>
                    <span className="text-white font-bold text-sm">
                      {equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#787b86] block text-[11px]">Free margin:</span>
                    <span className="text-white font-bold text-sm">
                      {freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#787b86] block text-[11px]">Margin:</span>
                    <span className="text-[#d1d4dc] font-bold text-sm">
                      {margin > 0 ? margin.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Floating Profit Badge */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#1e222d] pt-2 md:pt-0 md:pl-6 text-right">
                  <div>
                    <div className="text-[10px] text-[#787b86] uppercase tracking-wider">Floating P/L</div>
                    <div
                      className={`text-lg font-bold ${
                        floatingPnl >= 0 ? 'text-blue-400' : 'text-rose-400'
                      }`}
                    >
                      {floatingPnl >= 0 ? '+' : ''}
                      {floatingPnl.toFixed(2)} USD
                    </div>
                  </div>
                  {runningPosition && margin > 0 && (
                    <div className="text-[11px] text-[#787b86] hidden lg:block">
                      <span className="block text-[#787b86] text-[10px]">Margin level:</span>
                      <span className="text-emerald-400 font-bold">{marginLevel.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Open Positions List */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[#787b86] text-[11px] font-bold uppercase tracking-wider">
                  Open Positions ({runningPosition ? 1 : 0})
                </span>
                <span className="text-[#787b86] text-[10px] font-mono">
                  Leverage 1:100 • Hedging
                </span>
              </div>

              {runningPosition ? (
                <div className="bg-[#171b26] border border-[#1e222d] rounded-xl p-3.5 shadow-md font-mono">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{symbol}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            runningPosition.side === 'buy'
                              ? 'bg-blue-950 border border-blue-800 text-blue-400'
                              : 'bg-rose-950 border border-rose-800 text-rose-400'
                          }`}
                        >
                          {runningPosition.side} 1.00
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#787b86]">{runningPosition.entryPrice.toFixed(2)}</span>
                        <span className="text-[#787b86]">→</span>
                        <span className="text-white font-bold">{livePrice.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#787b86] pt-0.5">
                        <span>SL: {runningPosition.sl != null ? runningPosition.sl.toFixed(2) : '—'}</span>
                        <span>•</span>
                        <span>TP: {runningPosition.tp != null ? runningPosition.tp.toFixed(2) : '—'}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div
                        className={`text-base font-bold ${
                          floatingPnl >= 0 ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      >
                        {floatingPnl >= 0 ? '+' : ''}
                        {floatingPnl.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#787b86]">
                        {new Date(runningPosition.entryTime < 1e11 ? runningPosition.entryTime * 1000 : runningPosition.entryTime).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#171b26]/60 border border-[#1e222d] rounded-xl flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#787b86] mb-2">
                    account_balance_wallet
                  </span>
                  <span className="text-[#d1d4dc] font-semibold text-xs">No Active Open Positions</span>
                  <span className="text-[#787b86] text-[11px] mt-1 max-w-md">
                    {trades.length > 0 ? (
                      <>
                        All {trades.length} trades are completed. Use <span className="text-[#2962ff] font-medium">Bar Replay (▶ Play / Step)</span> in the toolbar to step bar-by-bar and watch live positions execute with ticking floating equity!
                      </>
                    ) : (
                      'Click "Run Strategy" to execute a backtest across history.'
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              3. VERSIONS TAB
              ========================================================================= */}
          {mainTab === 'versions' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {versions.map((v) => (
                <div
                  key={v.version}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    v.version === activeVersion
                      ? 'bg-blue-950/30 border-blue-800 text-white'
                      : 'bg-[#171b26] border-[#1e222d] text-[#d1d4dc]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 font-mono font-bold text-xs">
                      v{v.version}
                    </span>
                    <div>
                      <span className="font-bold block">{v.name}</span>
                      <span className="text-[10px] text-[#787b86]">
                        Created by {v.createdBy} • {new Date(v.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {v.version !== activeVersion && onRollbackVersion && (
                    <button
                      type="button"
                      onClick={() => onRollbackVersion(v.version)}
                      className="px-2.5 py-1 rounded bg-[#2a2e39] hover:bg-[#323644] text-[#d1d4dc] text-xs font-semibold transition-colors"
                    >
                      Restore v{v.version}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* =========================================================================
              4. CODE TAB
              ========================================================================= */}
          {mainTab === 'code' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="bg-[#171b26] border border-[#1e222d] rounded-lg p-3 font-mono text-xs text-[#d1d4dc] overflow-x-auto whitespace-pre leading-relaxed">
                {strategyCode}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
