"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { CreateStrategyModal } from '@/components/ea-lab/CreateStrategyModal';
import { AddRunModal, StrategyOption } from '@/components/ea-lab/AddRunModal';
import {
  STRATEGY_CATEGORIES,
  StrategyCategory,
  matchStrategyCategory,
  getStrategyCategory,
} from '@/lib/ea-lab/categories';
import { updateEaStrategyCategory } from '@/app/actions/eaLab';
import { toast } from 'sonner';
import { VersionControlTab } from '@/components/trading-library/VersionControlTab';
import { ChecklistTab } from '@/components/trading-library/ChecklistTab';

export interface StrategyCardData {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  categoryId?: string | null;
  categoryNumber?: number | null;
  testsCount: number;
  tradesCount: number;
  winRate: number;
  avgR: number;
  profitFactor: number;
  netProfit: number;
  returnPct: number;
  verdict: 'Promising' | 'Needs work' | 'Not enough data';
  verdictReasons: string[];
  warningsCount: number;
  latestVersionLabel?: string;
  createdAt: Date | string;
}

interface EaLabOverviewClientProps {
  strategies: StrategyCardData[];
  strategyOptions: StrategyOption[];
}

export function EaLabOverviewClient({ strategies, strategyOptions }: EaLabOverviewClientProps) {
  const [activeTopTab, setActiveTopTab] = useState<'strategies' | 'version-control' | 'checklist'>('strategies');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreateStrategyOpen, setIsCreateStrategyOpen] = useState(false);
  const [createDefaultCategory, setCreateDefaultCategory] = useState<string | undefined>(undefined);
  const [isAddRunOpen, setIsAddRunOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('');

  // Reassign modal state
  const [reassignStrategy, setReassignStrategy] = useState<StrategyCardData | null>(null);
  const [newSelectedCat, setNewSelectedCat] = useState<string>('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Hydrate closeable sidebar state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ea_lab_sidebar_open');
      if (saved !== null) {
        setIsSidebarOpen(saved === 'true');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  function toggleSidebar() {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ea_lab_sidebar_open', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  // Precompute single-category counts so each strategy belongs to at most ONE category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: strategies.length,
      uncategorized: 0,
    };

    STRATEGY_CATEGORIES.forEach((cat) => {
      counts[cat.id] = 0;
    });

    strategies.forEach((s) => {
      const resolved = getStrategyCategory(s);
      if (resolved) {
        counts[resolved.id] = (counts[resolved.id] || 0) + 1;
      } else {
        counts.uncategorized = (counts.uncategorized || 0) + 1;
      }
    });

    return counts;
  }, [strategies]);

  // Active category object (if not 'all' or 'uncategorized')
  const activeCategory: StrategyCategory | undefined = useMemo(() => {
    if (selectedCategoryId === 'all' || selectedCategoryId === 'uncategorized') return undefined;
    return STRATEGY_CATEGORIES.find((c) => c.id === selectedCategoryId);
  }, [selectedCategoryId]);

  // Filtered strategies based on active category tab and search query
  const filteredStrategies = useMemo(() => {
    return strategies.filter((s) => {
      let matchesCategory = false;
      if (selectedCategoryId === 'all') {
        matchesCategory = true;
      } else if (selectedCategoryId === 'uncategorized') {
        matchesCategory = !getStrategyCategory(s);
      } else {
        matchesCategory = matchStrategyCategory(s, selectedCategoryId);
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [strategies, selectedCategoryId, searchQuery]);

  // Sidebar categories filtered by search inside sidebar
  const visibleCategories = useMemo(() => {
    if (!sidebarFilter.trim()) return STRATEGY_CATEGORIES;
    const q = sidebarFilter.toLowerCase();
    return STRATEGY_CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mainIdea.toLowerCase().includes(q) ||
        String(c.number).includes(q)
    );
  }, [sidebarFilter]);

  // Aggregate metrics across active scope
  const activeScopeMetrics = useMemo(() => {
    const tests = filteredStrategies.reduce((sum, s) => sum + s.testsCount, 0);
    const trades = filteredStrategies.reduce((sum, s) => sum + s.tradesCount, 0);
    const netProfit = filteredStrategies.reduce((sum, s) => sum + s.netProfit, 0);
    const avgWinRate =
      filteredStrategies.length > 0
        ? Math.round(
            filteredStrategies.reduce((sum, s) => sum + s.winRate, 0) / filteredStrategies.length
          )
        : 0;

    return { tests, trades, netProfit, avgWinRate };
  }, [filteredStrategies]);

  function handleOpenCreateWithCategory(catName?: string) {
    setCreateDefaultCategory(catName);
    setIsCreateStrategyOpen(true);
  }

  async function handleSaveCategoryReassign() {
    if (!reassignStrategy) return;
    setSavingCategory(true);
    const res = await updateEaStrategyCategory(
      reassignStrategy.id,
      newSelectedCat.trim() ? newSelectedCat.trim() : null
    );
    setSavingCategory(false);
    if (res.success) {
      toast.success(
        `Category updated for "${reassignStrategy.name}" to ${newSelectedCat || 'Uncategorized'}`
      );
      setReassignStrategy(null);
      window.location.reload();
    } else {
      toast.error(res.error || 'Failed to update category');
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Global Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5 uppercase tracking-wider">
            <span>Trading</span>
            <span>/</span>
            <span className="text-zinc-400">EA Lab</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500 text-3xl">science</span>
            EA Strategy Tester Lab
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Empirical benchmark engine for MetaTrader 5 Expert Advisors (.mq5). Categorized across core trading methodologies.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenCreateWithCategory(activeCategory?.name)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Strategy
          </button>

          <button
            type="button"
            onClick={() => setIsAddRunOpen(true)}
            disabled={strategyOptions.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">add_chart</span>
            Add Test Run
          </button>
        </div>
      </div>

      {/* Primary Page Navigation Tabs: EA Strategies, Version Control, Checklist */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTopTab('strategies')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTopTab === 'strategies'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">science</span>
          <span>EA Strategies</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            {strategies.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('version-control')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTopTab === 'version-control'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">commit</span>
          <span>Version Control</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            Releases
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('checklist')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTopTab === 'checklist'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">task_alt</span>
          <span>Bot QA Checklist</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            Pre-Flight
          </span>
        </button>
      </div>

      {/* Main Content Area based on Active Top Tab */}
      {activeTopTab === 'strategies' && (
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 relative">
          {/* LEFT COLUMN: Methodology / Category Tabs with smooth width transition and high z-index */}
          <aside
            className={`shrink-0 transition-[width] duration-300 ease-in-out relative z-40 ${
              isSidebarOpen ? 'w-full lg:w-80' : 'w-full lg:w-[68px]'
            }`}
          >
            <div
            className={`bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl transition-all duration-300 sticky top-6 z-40 ${
              isSidebarOpen ? 'p-4 space-y-3' : 'p-2 space-y-2'
            }`}
          >
            {/* Sidebar Header */}
            {isSidebarOpen ? (
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400 text-lg">category</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Strategy Categories
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                    {strategies.length} EAs
                  </span>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
                    title="Collapse to icons"
                  >
                    <span className="material-symbols-outlined text-sm">dock_to_left</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Collapsed Header: Centered Expand Button */
              <div className="flex flex-col items-center pb-2 border-b border-zinc-800/80">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-sm group"
                  title="Expand categories sidebar"
                >
                  <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                    dock_to_right
                  </span>
                </button>
              </div>
            )}

            {/* Quick Filter Input (only when expanded) */}
            {isSidebarOpen && (
              <div className="relative animate-in fade-in duration-200">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-zinc-500 text-xs">
                  filter_list
                </span>
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={sidebarFilter}
                  onChange={(e) => setSidebarFilter(e.target.value)}
                  className="w-full bg-zinc-900/70 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Scrollable Tabs List - Completely hidden scrollbar when expanded, overflow-visible when collapsed */}
            <div
              className={`space-y-1.5 ${
                isSidebarOpen
                  ? 'max-h-[calc(100vh-180px)] overflow-y-auto no-scrollbar hide-scrollbar scrollbar-none pr-0.5'
                  : 'overflow-visible'
              }`}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* TAB 0: "All Categories" (starts first) */}
              {isSidebarOpen ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border group ${
                    selectedCategoryId === 'all'
                      ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-md shadow-blue-900/10'
                      : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/70 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        selectedCategoryId === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 group-hover:text-blue-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">grid_view</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">All Categories</div>
                      <div className="text-[10px] text-zinc-500 truncate group-hover:text-zinc-400">
                        All documented EA benchmarks
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      selectedCategoryId === 'all'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {categoryCounts['all']}
                  </span>
                </button>
              ) : (
                /* Collapsed Icon-Only Mode for "All Categories" */
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center relative group hover:z-50 transition-all ${
                    selectedCategoryId === 'all'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                  title={`All Categories (${categoryCounts['all']} EAs)`}
                >
                  <span className="material-symbols-outlined text-lg">grid_view</span>

                  {/* Micro Count Badge */}
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-blue-900/90 text-[9px] font-mono text-blue-200 border border-blue-700 font-bold">
                    {categoryCounts['all']}
                  </span>

                  {/* Hover Floating Tooltip - Centered vertically and above cards */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-xl bg-zinc-950/98 backdrop-blur-md border border-zinc-700 text-xs shadow-2xl z-[100] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap flex flex-col gap-0.5 text-left ring-1 ring-white/10">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>All Categories</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                        {categoryCounts['all']} EAs
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">All documented EA benchmarks</div>
                  </div>
                </button>
              )}

              {/* TABS 1 through 14: Categories in specified order */}
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const count = categoryCounts[cat.id] || 0;

                return isSidebarOpen ? (
                  /* Expanded Mode with Text */
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border group ${
                      isSelected
                        ? `${cat.bgActive} ${cat.borderColor} text-white shadow-md`
                        : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/70 text-zinc-300 hover:text-white'
                    }`}
                    title={cat.mainIdea}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Number Badge */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-[11px] font-bold transition-colors ${
                          isSelected
                            ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                            : 'bg-zinc-800/70 text-zinc-400 group-hover:text-white group-hover:bg-zinc-800'
                        }`}
                      >
                        #{cat.number}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span
                            className={`material-symbols-outlined text-xs ${
                              isSelected ? cat.color : 'text-zinc-500 group-hover:text-zinc-300'
                            }`}
                          >
                            {cat.icon}
                          </span>
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate group-hover:text-zinc-400">
                          {cat.mainIdea}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-white/10 text-white border border-white/20'
                          : count > 0
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-zinc-800/60 text-zinc-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ) : (
                  /* Collapsed Icons-Only Mode */
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    title={`#${cat.number} ${cat.name} - ${cat.mainIdea}`}
                    className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center relative group hover:z-50 transition-all shrink-0 ${
                      isSelected
                        ? `${cat.bgActive} ${cat.borderColor} border text-white shadow-lg ring-1 ring-blue-500/30`
                        : 'bg-zinc-900/40 hover:bg-zinc-800/90 border border-zinc-800/80 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {/* Category Icon */}
                    <span
                      className={`material-symbols-outlined text-lg ${
                        isSelected ? cat.color : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {cat.icon}
                    </span>

                    {/* Micro Number Badge */}
                    <span className="absolute -top-1 -left-1 px-1 py-0.2 rounded-full bg-zinc-900 border border-zinc-700/80 text-[9px] font-mono font-bold text-zinc-400">
                      {cat.number}
                    </span>

                    {/* Micro Count Badge (if count > 0) */}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-[9px] font-mono text-white flex items-center justify-center font-bold shadow-sm">
                        {count}
                      </span>
                    )}

                    {/* Rich Hover Floating Tooltip - Centered vertically and above all cards */}
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3.5 py-2.5 rounded-xl bg-zinc-950/98 backdrop-blur-md border border-zinc-700 text-xs shadow-2xl z-[100] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1 w-64 text-left ring-1 ring-white/10">
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5 truncate">
                          <span className="font-mono text-zinc-400">#{cat.number}</span>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-blue-500/20 text-blue-300 shrink-0">
                          {count} EAs
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans line-clamp-3">
                        {cat.mainIdea}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Optional Uncategorized Tab (if any exist) */}
              {categoryCounts.uncategorized > 0 &&
                (isSidebarOpen ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('uncategorized')}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border group ${
                      selectedCategoryId === 'uncategorized'
                        ? 'bg-zinc-800 border-zinc-700 text-white shadow-md'
                        : 'bg-zinc-900/30 hover:bg-zinc-900 border-zinc-800/50 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-zinc-800/80 text-zinc-400 text-xs">
                        <span className="material-symbols-outlined text-sm">help_outline</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">Uncategorized</div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          EAs pending methodology assignment
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {categoryCounts.uncategorized}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('uncategorized')}
                    className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center relative group hover:z-50 transition-all shrink-0 ${
                      selectedCategoryId === 'uncategorized'
                        ? 'bg-zinc-800 border-zinc-700 text-white shadow-md'
                        : 'bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400'
                    }`}
                    title={`Uncategorized (${categoryCounts.uncategorized} EAs)`}
                  >
                    <span className="material-symbols-outlined text-lg">help_outline</span>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 text-[9px] font-mono text-zinc-300 flex items-center justify-center font-bold">
                      {categoryCounts.uncategorized}
                    </span>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-zinc-950/98 backdrop-blur-md border border-zinc-700 text-xs shadow-2xl z-[100] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap text-left ring-1 ring-white/10">
                      <span className="font-bold text-white">Uncategorized</span>
                      <span className="text-[10px] text-zinc-400 block">Pending methodology assignment</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Content Area (relative z-10 so tooltips from aside float above it) */}
        <main className="flex-1 min-w-0 space-y-6 transition-all duration-300 relative z-10">

          {/* Active Category Spotlight Hero Banner */}
          {activeCategory ? (
            <div
              className={`p-6 rounded-2xl bg-zinc-950 border ${activeCategory.borderColor} shadow-xl relative overflow-hidden`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 text-white border border-zinc-800">
                      Category #{activeCategory.number}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className={`text-xs font-semibold ${activeCategory.color} flex items-center gap-1`}>
                      <span className="material-symbols-outlined text-sm">{activeCategory.icon}</span>
                      {activeCategory.shortName}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    {activeCategory.name}
                  </h2>

                  {/* Main Idea Highlight Box */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                      lightbulb
                    </span>
                    <div>
                      <span className="font-semibold text-white">Main Idea: </span>
                      {activeCategory.mainIdea}
                    </div>
                  </div>
                </div>

                {/* Category Action Controls */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateWithCategory(activeCategory.name)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Create {activeCategory.shortName} EA
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    Clear Category Filter
                  </button>
                </div>
              </div>

              {/* Category Mini-KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-900 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Active EAs</span>
                  <span className="text-lg font-bold text-white">{filteredStrategies.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Backtests</span>
                  <span className="text-lg font-bold text-blue-400">{activeScopeMetrics.tests}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Total Trades</span>
                  <span className="text-lg font-bold text-zinc-200">{activeScopeMetrics.trades}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Net Profit</span>
                  <span
                    className={`text-lg font-bold ${
                      activeScopeMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {activeScopeMetrics.netProfit >= 0
                      ? `+$${activeScopeMetrics.netProfit.toFixed(2)}`
                      : `-$${Math.abs(activeScopeMetrics.netProfit).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Global KPI Strip (shown when 'all' is active) */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-sm">
                <div className="text-xs font-semibold text-zinc-400">Active Strategies</div>
                <div className="text-2xl font-bold text-white mt-1">{strategies.length}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">Across 14 categories</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-sm">
                <div className="text-xs font-semibold text-zinc-400">Total Backtest Runs</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{activeScopeMetrics.tests}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">Imported tester runs</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-sm">
                <div className="text-xs font-semibold text-zinc-400">Executed Trades</div>
                <div className="text-2xl font-bold text-white mt-1">{activeScopeMetrics.trades}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">Evaluated across all tests</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-sm">
                <div className="text-xs font-semibold text-zinc-400">Aggregate Net Profit</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    activeScopeMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeScopeMetrics.netProfit >= 0
                    ? `+$${activeScopeMetrics.netProfit.toFixed(2)}`
                    : `-$${Math.abs(activeScopeMetrics.netProfit).toFixed(2)}`}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">Sum of test run balances</div>
              </div>
            </div>
          )}

          {/* Search Filter Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-500 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder={
                  activeCategory
                    ? `Search within ${activeCategory.name}...`
                    : 'Search strategies by name, category, or thesis...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <span>
                Showing {filteredStrategies.length} of {strategies.length} strategies
              </span>
              {selectedCategoryId !== 'all' && (
                <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/50">
                  {activeCategory?.name || 'Uncategorized'}
                </span>
              )}
            </div>
          </div>

          {/* Strategies Grid */}
          {filteredStrategies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredStrategies.map((s) => {
                const verdictStyle = {
                  Promising: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
                  'Needs work': 'bg-amber-950/60 text-amber-400 border-amber-800',
                  'Not enough data': 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
                }[s.verdict] || 'bg-zinc-800 text-zinc-400 border-zinc-700';

                // Resolve matching category
                const catDef = getStrategyCategory(s);

                return (
                  <div
                    key={s.id}
                    className="group bg-zinc-950 border border-zinc-800/90 hover:border-blue-500/50 rounded-2xl p-5 shadow-lg transition-all hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div>
                      {/* Top Badges (Category Pill with Reassign Action + Verdict) */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReassignStrategy(s);
                            setNewSelectedCat(catDef?.name || s.category || '');
                          }}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center gap-1 max-w-[190px] truncate ${
                            catDef
                              ? 'bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 border-blue-900/50'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                          }`}
                          title="Click to assign or change category"
                        >
                          <span className="material-symbols-outlined text-[11px] shrink-0">
                            {catDef?.icon || 'category'}
                          </span>
                          <span className="truncate">
                            {catDef ? `#${catDef.number} ${catDef.shortName}` : 'Assign Category'}
                          </span>
                          <span className="material-symbols-outlined text-[10px] text-zinc-500 opacity-60 group-hover:opacity-100">
                            arrow_drop_down
                          </span>
                        </button>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${verdictStyle}`}
                        >
                          {s.verdict}
                        </span>
                      </div>

                      {/* Card Header & Title */}
                      <Link href={`/trading/ea-lab/${s.id}`} className="block mb-2">
                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                          {s.name}
                        </h3>
                        {s.latestVersionLabel && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800/80 mt-1 inline-block">
                            {s.latestVersionLabel}
                          </span>
                        )}
                      </Link>

                      {s.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                          {s.description}
                        </p>
                      )}
                    </div>

                    <div>
                      {/* Numbers Strip */}
                      <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-zinc-900 font-mono text-xs">
                        <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 block uppercase font-sans">Net P/L</span>
                          <span
                            className={`font-bold ${
                              s.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.netProfit >= 0 ? `+$${s.netProfit}` : `-$${Math.abs(s.netProfit)}`}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 block uppercase font-sans">Win Rate</span>
                          <span className="font-bold text-white">{s.winRate}%</span>
                        </div>

                        <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 block uppercase font-sans">Avg R</span>
                          <span
                            className={`font-bold ${
                              s.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.avgR > 0 ? `+${s.avgR}R` : `${s.avgR}R`}
                          </span>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2.5 border-t border-zinc-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-400">{s.testsCount} tests</span>
                          <span>•</span>
                          <span className="font-mono text-zinc-400">{s.tradesCount} trades</span>
                        </div>

                        <Link
                          href={`/trading/ea-lab/${s.id}`}
                          className="flex items-center gap-1 text-blue-400 font-semibold hover:translate-x-0.5 transition-transform"
                        >
                          <span>Inspect</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeCategory ? (
            /* Empty state for specific category */
            <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl mx-auto space-y-4">
              <div
                className={`w-14 h-14 rounded-2xl ${activeCategory.bgActive} border ${activeCategory.borderColor} flex items-center justify-center mx-auto ${activeCategory.color}`}
              >
                <span className="material-symbols-outlined text-3xl">{activeCategory.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  No strategies in &ldquo;{activeCategory.name}&rdquo; yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed italic bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 my-3">
                  💡 {activeCategory.mainIdea}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Build and benchmark your first Expert Advisor testing this specific trading thesis.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateWithCategory(activeCategory.name)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Create {activeCategory.shortName} Strategy
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                >
                  View All Strategies
                </button>
              </div>
            </div>
          ) : strategies.length === 0 ? (
            /* Global empty state */
            <div className="p-16 text-center bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                <span className="material-symbols-outlined text-4xl">science</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Welcome to EA Lab</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Create your first EA Strategy (e.g. Trend Following, Breakout, or Market Structure bot), upload your .mq5 code, and paste your MT5 Strategy Tester backtest logs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateWithCategory()}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create Your First Strategy
              </button>
            </div>
          ) : (
            /* Search yielded 0 results */
            <div className="p-12 text-center text-zinc-500 text-xs bg-zinc-950 border border-zinc-800 rounded-2xl">
              <p>No strategies match &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-400 hover:underline text-xs"
              >
                Clear Search
              </button>
            </div>
          )}
        </main>
      </div>
      )}

      {/* Tab Content: Version Control */}
      {activeTopTab === 'version-control' && (
        <div className="w-full">
          <VersionControlTab strategyOptions={strategyOptions} />
        </div>
      )}

      {/* Tab Content: Bot QA Checklist */}
      {activeTopTab === 'checklist' && (
        <div className="w-full">
          <ChecklistTab />
        </div>
      )}



      {/* Reassign Strategy Category Modal */}
      {reassignStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-xl">label</span>
                <h3 className="text-base font-bold text-white">Assign Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignStrategy(null)}
                className="text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="text-xs text-zinc-300">
              Select methodology archetype for{' '}
              <span className="font-bold text-white">&ldquo;{reassignStrategy.name}&rdquo;</span>:
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Category
              </label>
              <select
                value={newSelectedCat}
                onChange={(e) => setNewSelectedCat(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">None / Unassigned</option>
                {STRATEGY_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    #{cat.number} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {newSelectedCat && (
              <div className="p-3 rounded-xl bg-blue-950/25 border border-blue-900/40 text-[11px] text-blue-300">
                <span className="font-semibold text-white">Main Idea: </span>
                {
                  STRATEGY_CATEGORIES.find(
                    (c) => c.name.toLowerCase() === newSelectedCat.toLowerCase()
                  )?.mainIdea
                }
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setReassignStrategy(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCategory}
                onClick={handleSaveCategoryReassign}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {savingCategory ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation & Run Modals */}
      <CreateStrategyModal
        isOpen={isCreateStrategyOpen}
        onClose={() => {
          setIsCreateStrategyOpen(false);
          setCreateDefaultCategory(undefined);
        }}
        defaultCategory={createDefaultCategory}
      />

      <AddRunModal
        isOpen={isAddRunOpen}
        onClose={() => setIsAddRunOpen(false)}
        strategies={strategyOptions}
        onSaved={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
