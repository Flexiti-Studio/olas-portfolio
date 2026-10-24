"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LIBRARY_STRATEGIES } from '@/lib/trading/libraryData';
import { toast } from 'sonner';

export type ChecklistPhase =
  | 'normal'
  | 'volatility'
  | 'session'
  | 'economiccalender'
  | 'performance analytics'
  | 'position manager';

export interface ChecklistItem {
  id: string;
  phase: ChecklistPhase;
  phaseTitle: string;
  title: string;
  description: string;
  severity: 'critical' | 'recommended' | 'standard';
  checked: boolean;
  notes?: string;
}

export const CHECKLIST_PHASES: {
  id: ChecklistPhase;
  label: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
}[] = [
  {
    id: 'normal',
    label: 'Normal',
    title: 'Normal / Core Mechanical Rules',
    description: 'Systematic trade setup rules, trigger quantification, trend filters, and discretion elimination.',
    icon: 'tune',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-950/30',
  },
  {
    id: 'volatility',
    label: 'Volatility',
    title: 'Volatility Regimes & Filters',
    description: 'Dynamic ATR stop distance, range expansion/compression guards, and whipsaw protection.',
    icon: 'show_chart',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-950/30',
  },
  {
    id: 'session',
    label: 'Session',
    title: 'Session Timing & Openings',
    description: 'London, New York, and Asian session boundaries, opening ranges, and end-of-session auto closes.',
    icon: 'schedule',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-950/30',
  },
  {
    id: 'economiccalender',
    label: 'Economic Calendar',
    title: 'Economic Calendar & News Blackouts',
    description: 'Pre/post event blackout buffers, Tier 1 news filters, bank holidays, and slippage guards.',
    icon: 'calendar_month',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    bgColor: 'bg-rose-950/30',
  },
  {
    id: 'performance analytics',
    label: 'Performance Analytics',
    title: 'Performance Analytics & Quant Edge',
    description: 'Win rate benchmarks, expectancy (+Avg R), profit factor, trade sample size, and Monte Carlo ruin checks.',
    icon: 'analytics',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-950/30',
  },
  {
    id: 'position manager',
    label: 'Position Manager',
    title: 'Position Manager & Risk Guardrails',
    description: 'Position sizing, breakeven triggers, trailing stops, hard SL/TP, and daily drawdown circuit breakers.',
    icon: 'shield',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-950/30',
  },
];

// Starts empty as requested
const DEFAULT_CHECKLIST: ChecklistItem[] = [];

function normalizeChecklistItem(item: any): ChecklistItem {
  let phase: ChecklistPhase = 'normal';
  if (item.phase === 1 || item.phase === '1' || item.phase === 'normal') {
    phase = 'normal';
  } else if (item.phase === 2 || item.phase === '2' || item.phase === 'volatility') {
    phase = 'volatility';
  } else if (item.phase === 3 || item.phase === '3' || item.phase === 'session') {
    phase = 'session';
  } else if (item.phase === 'economiccalender' || item.phase === 'economic_calendar') {
    phase = 'economiccalender';
  } else if (item.phase === 'performance analytics' || item.phase === 'performance_analytics') {
    phase = 'performance analytics';
  } else if (item.phase === 4 || item.phase === '4' || item.phase === 'position manager' || item.phase === 'position_manager') {
    phase = 'position manager';
  }

  const phaseConfig = CHECKLIST_PHASES.find((p) => p.id === phase) || CHECKLIST_PHASES[0];

  return {
    id: item.id || `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    phase,
    phaseTitle: phaseConfig.title,
    title: item.title || 'Untitled Check',
    description: item.description || '',
    severity: item.severity || 'recommended',
    checked: Boolean(item.checked),
    notes: item.notes || '',
  };
}

const DELETED_IDS_KEY = 'trading_library_checklist_deleted_ids';

function getDeletedChecklistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordDeletedChecklistId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDeletedChecklistIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
    }
  } catch (e) {
    console.error('Failed to record deleted checklist ID', e);
  }
}

export function ChecklistTab({ initialStrategyId }: { initialStrategyId?: string } = {}) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(initialStrategyId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<ChecklistPhase | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);

  // Quick inline add check input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSeverity, setQuickSeverity] = useState<'critical' | 'recommended' | 'standard'>('recommended');

  // Add Custom Check Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPhase, setNewPhase] = useState<ChecklistPhase>('normal');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'recommended' | 'standard'>('recommended');

  // Load from localStorage (v3 starts empty by default)
  useEffect(() => {
    try {
      const storageKey = `trading_library_checklist_v3_${selectedStrategyId}`;
      const stored = localStorage.getItem(storageKey);

      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deletedIds = getDeletedChecklistIds();
          const cleaned = parsed
            .map(normalizeChecklistItem)
            .filter((item) => !deletedIds.includes(item.id));
          setItems(cleaned);
          return;
        }
      }

      // Check v2 storage key only if user had custom added items
      const v2Key = `trading_library_checklist_v2_${selectedStrategyId}`;
      const v2Stored = localStorage.getItem(v2Key);
      if (v2Stored !== null) {
        const parsed = JSON.parse(v2Stored);
        if (Array.isArray(parsed)) {
          const deletedIds = getDeletedChecklistIds();
          // Filter out seed dummy items (chk_norm_, chk_vol_, chk_sess_, chk_cal_, chk_perf_, chk_pos_)
          const customOnly = parsed
            .filter((item: any) => item && typeof item.id === 'string' && !item.id.startsWith('chk_norm_') && !item.id.startsWith('chk_vol_') && !item.id.startsWith('chk_sess_') && !item.id.startsWith('chk_cal_') && !item.id.startsWith('chk_perf_') && !item.id.startsWith('chk_pos_'))
            .map(normalizeChecklistItem)
            .filter((item) => !deletedIds.includes(item.id));

          setItems(customOnly);
          localStorage.setItem(storageKey, JSON.stringify(customOnly));
          return;
        }
      }

      // Default to empty checklist
      setItems([]);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {
      setItems([]);
    }
  }, [selectedStrategyId]);

  function saveItems(updated: ChecklistItem[]) {
    setItems(updated);
    try {
      const storageKey = `trading_library_checklist_v3_${selectedStrategyId}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save checklist to storage', e);
    }
  }

  // Toggle item checked state
  function handleToggle(id: string) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveItems(updated);
  }

  // Update item notes
  function handleUpdateNotes(id: string, notes: string) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, notes } : item
    );
    saveItems(updated);
  }

  // Clear all items to empty
  function handleClearAll() {
    if (!items.length) {
      toast.info('Checklist is already empty');
      return;
    }
    if (!confirm('Are you sure you want to clear all checklist items?')) return;
    items.forEach((item) => recordDeletedChecklistId(item.id));
    saveItems([]);
    toast.success('All checklist items cleared');
  }

  // Delete single checklist item
  function handleDeleteItem(id: string) {
    const itemToDelete = items.find((i) => i.id === id);
    const updated = items.filter((i) => i.id !== id);
    recordDeletedChecklistId(id);
    saveItems(updated);
    if (notesOpenId === id) setNotesOpenId(null);
    toast.success(itemToDelete ? `Deleted "${itemToDelete.title}"` : 'Checklist item deleted');
  }

  // Mark all visible items as checked
  function handleCheckAll() {
    if (!items.length) return;
    const targetPhase = selectedCategory;
    const updated = items.map((item) => {
      if (targetPhase === 'all' || item.phase === targetPhase) {
        return { ...item, checked: true };
      }
      return item;
    });
    saveItems(updated);
    toast.success('Items marked as checked');
  }

  // Quick inline add check
  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;

    const phase: ChecklistPhase = selectedCategory === 'all' ? 'normal' : selectedCategory;
    const phaseConfig = CHECKLIST_PHASES.find((p) => p.id === phase) || CHECKLIST_PHASES[0];

    const newItem: ChecklistItem = {
      id: `chk_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      phase,
      phaseTitle: phaseConfig.title,
      title,
      description: '',
      severity: quickSeverity,
      checked: false,
    };

    saveItems([...items, newItem]);
    setQuickTitle('');
    toast.success(`Added check to ${phaseConfig.label}!`);
  }

  // Modal custom check submit
  function handleAddCheckSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const phaseConfig = CHECKLIST_PHASES.find((p) => p.id === newPhase) || CHECKLIST_PHASES[0];

    const newItem: ChecklistItem = {
      id: `chk_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      phase: newPhase,
      phaseTitle: phaseConfig.title,
      title: newTitle.trim(),
      description: newDesc.trim(),
      severity: newSeverity,
      checked: false,
    };

    saveItems([...items, newItem]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    toast.success(`Added "${newItem.title}" to ${phaseConfig.label}`);
  }

  // Filtered items based on selected category & search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.phase === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.phase.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Overall Metrics
  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const criticalCount = items.filter((i) => i.severity === 'critical').length;
  const criticalPassed = items.filter((i) => i.severity === 'critical' && i.checked).length;

  // Active Category Config
  const activePhaseConfig = CHECKLIST_PHASES.find((p) => p.id === selectedCategory);

  // Active Category Metrics
  const activeCategoryItems = selectedCategory === 'all' ? items : items.filter((i) => i.phase === selectedCategory);
  const activeCategoryChecked = activeCategoryItems.filter((i) => i.checked).length;
  const activeCategoryPercent = activeCategoryItems.length > 0 ? Math.round((activeCategoryChecked / activeCategoryItems.length) * 100) : 0;

  // Readiness status badge
  const readiness =
    totalCount === 0
      ? {
          status: 'NO CRITERIA DEFINED',
          color: 'text-zinc-400 bg-zinc-900 border-zinc-800',
          desc: 'Start by adding strategy verification criteria using the categories on the left.',
          icon: 'pending',
        }
      : percentage >= 85 && criticalPassed === criticalCount
      ? {
          status: 'READY FOR LIVE / PROP FIRM',
          color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
          desc: 'All critical risk and statistical validation criteria successfully passed.',
          icon: 'verified',
        }
      : percentage >= 50
      ? {
          status: 'FORWARD TESTING STAGE',
          color: 'text-blue-400 bg-blue-950/60 border-blue-800',
          desc: 'Core formulation solid. Forward tick validation and execution audit in progress.',
          icon: 'science',
        }
      : {
          status: 'NEEDS STATISTICAL RIGOR',
          color: 'text-amber-400 bg-amber-950/60 border-amber-800',
          desc: 'Critical check requirements or risk guardrails pending validation.',
          icon: 'warning',
        };

  // Copy audit report to clipboard
  function handleCopyAudit() {
    const stratName =
      selectedStrategyId === 'all'
        ? 'Global Algorithmic Bot'
        : LIBRARY_STRATEGIES.find((s) => s.id === selectedStrategyId)?.name || 'Strategy';

    const text = `=== BOT PRE-FLIGHT AUDIT REPORT ===
Target: ${stratName}
Readiness: ${readiness.status} (${percentage}% - ${checkedCount}/${totalCount} Passed)
Critical Checks: ${criticalPassed}/${criticalCount} Passed

Checklist Summary:
${CHECKLIST_PHASES.map((p) => {
  const phaseItems = items.filter((i) => i.phase === p.id);
  if (phaseItems.length === 0) return '';
  return `\n[${p.title.toUpperCase()}]\n${phaseItems
    .map((i) => `  [${i.checked ? 'PASS' : 'FAIL'}] [${i.severity.toUpperCase()}] ${i.title}${i.notes ? ` (Notes: ${i.notes})` : ''}`)
    .join('\n')}`;
})
  .filter(Boolean)
  .join('\n')}

Generated via EA Lab Playbook`;

    navigator.clipboard.writeText(text);
    toast.success('Full audit report copied to clipboard!');
  }

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 relative animate-in fade-in duration-150">
      {/* LEFT COLUMN: Categories Navigation Tab Sidebar */}
      <aside className="w-full lg:w-72 shrink-0 sticky top-6 z-20 space-y-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-lg">category</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Checklist Categories
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              {items.length} Total
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-zinc-500 text-xs">
              search
            </span>
            <input
              type="text"
              placeholder="Search checks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          {/* Vertical Categories Tab Navigation */}
          <div className="space-y-1.5 pt-1">
            {/* All Categories Tab */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border group ${
                selectedCategory === 'all'
                  ? 'bg-blue-600/15 border-blue-500/80 text-white shadow-md shadow-blue-900/20'
                  : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/70 text-zinc-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 group-hover:text-blue-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">checklist</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">All Categories</div>
                  <div className="text-[10px] text-zinc-500 truncate">Entire strategy QA scope</div>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-blue-950 text-blue-400 border border-blue-800/60'
                  : 'bg-black/40 text-zinc-400'
              }`}>
                {checkedCount}/{totalCount}
              </span>
            </button>

            {/* 6 Individual Phase Tabs */}
            {CHECKLIST_PHASES.map((phase) => {
              const isSelected = selectedCategory === phase.id;
              const phaseItems = items.filter((i) => i.phase === phase.id);
              const phaseChecked = phaseItems.filter((i) => i.checked).length;

              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSelectedCategory(phase.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border group ${
                    isSelected
                      ? `${phase.bgColor} ${phase.borderColor} text-white shadow-md`
                      : 'bg-zinc-900/30 hover:bg-zinc-900 border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? `bg-zinc-900 ${phase.color} border border-zinc-700`
                          : 'bg-zinc-800/70 text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{phase.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs truncate ${isSelected ? 'font-bold text-white' : 'font-medium'}`}>
                        {phase.label}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                      isSelected
                        ? 'bg-black/50 text-white border border-white/10'
                        : 'bg-black/30 text-zinc-500'
                    }`}
                  >
                    {phaseChecked}/{phaseItems.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons in Sidebar */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <button
              type="button"
              onClick={() => {
                if (selectedCategory !== 'all') {
                  setNewPhase(selectedCategory);
                }
                setIsAddModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <span className="material-symbols-outlined text-sm">add_task</span>
              Add Custom Check
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900/60 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/60 text-zinc-500 border border-zinc-800 text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">delete_sweep</span>
              Clear All Checks
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: Active Category Content & Checklist Items */}
      <div className="flex-1 min-w-0 space-y-6 w-full">
        {/* Category Spotlight Hero Banner */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  {selectedCategory === 'all' ? 'All QA Categories' : `Category: ${activePhaseConfig?.label}`}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-xs text-zinc-400">
                  {activeCategoryChecked} of {activeCategoryItems.length} checks completed
                </span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-2xl ${activePhaseConfig?.color || 'text-blue-400'}`}>
                  {activePhaseConfig?.icon || 'task_alt'}
                </span>
                {selectedCategory === 'all' ? 'Algorithmic Strategy QA & Deployment Checklist' : activePhaseConfig?.title}
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                {selectedCategory === 'all'
                  ? 'Standardized mechanical validation protocol across 6 quantitative development phases: Normal, Volatility, Session, Economic Calendar, Performance Analytics, and Position Manager.'
                  : activePhaseConfig?.description}
              </p>
            </div>

            {/* Readiness or Category Progress Badge */}
            <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-2 ${readiness.color}`}
              >
                <span className="material-symbols-outlined text-sm">{readiness.icon}</span>
                {readiness.status}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Critical: {criticalPassed} / {criticalCount} Passed
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">
                {selectedCategory === 'all' ? 'Global Audit Completion' : `${activePhaseConfig?.label} Completion`}
              </span>
              <span className="font-bold text-white">
                {selectedCategory === 'all' ? percentage : activeCategoryPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/80">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  (selectedCategory === 'all' ? percentage : activeCategoryPercent) >= 85
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : (selectedCategory === 'all' ? percentage : activeCategoryPercent) >= 50
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                }`}
                style={{ width: `${selectedCategory === 'all' ? percentage : activeCategoryPercent}%` }}
              />
            </div>
          </div>

          {/* Control Bar: Strategy Selector, Copy Report, and Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-400 font-medium">Strategy Scope:</span>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Global Checklist (All Bots)</option>
                {LIBRARY_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.number} {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAudit}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
                Copy Report
              </button>

              <button
                type="button"
                onClick={handleCheckAll}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">done_all</span>
                Check All
              </button>
            </div>
          </div>
        </div>

        {/* Quick Inline Check Creator */}
        <form
          onSubmit={handleQuickAdd}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md"
        >
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-500 text-sm">
              add_task
            </span>
            <input
              type="text"
              placeholder={
                selectedCategory === 'all'
                  ? 'Add new check criteria (e.g. Higher-Timeframe Trend Confirmation)...'
                  : `Add new check for ${activePhaseConfig?.label} (e.g. Dynamic ATR Trailing Stop)...`
              }
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={quickSeverity}
              onChange={(e) => setQuickSeverity(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
            >
              <option value="critical">Critical</option>
              <option value="recommended">Recommended</option>
              <option value="standard">Standard</option>
            </select>

            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              Add Check
            </button>
          </div>
        </form>

        {/* Checklist Items Display */}
        {filteredItems.length > 0 ? (
          <div className="space-y-6">
            {CHECKLIST_PHASES.filter(
              (phaseConfig) => selectedCategory === 'all' || selectedCategory === phaseConfig.id
            ).map((phaseConfig) => {
              const phaseItems = filteredItems.filter((i) => i.phase === phaseConfig.id);
              if (phaseItems.length === 0) return null;

              const phasePassed = phaseItems.filter((i) => i.checked).length;

              return (
                <div key={phaseConfig.id} className="space-y-3">
                  {/* Phase Section Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${phaseConfig.color}`}>
                        {phaseConfig.icon}
                      </span>
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                        {phaseConfig.title}
                      </h4>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[11px] text-zinc-400 hidden sm:inline">
                        {phaseConfig.description}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 font-bold shrink-0">
                      {phasePassed} / {phaseItems.length} Passed
                    </span>
                  </div>

                  {/* Items in this Phase */}
                  <div className="space-y-2.5">
                    {phaseItems.map((item) => {
                      const isNotesOpen = notesOpenId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            item.checked
                              ? 'bg-zinc-950/80 border-zinc-800/90 hover:border-zinc-700'
                              : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggle(item.id)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                item.checked
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                                  : 'bg-zinc-900 border border-zinc-700 text-transparent hover:border-zinc-500'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm font-bold">check</span>
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span
                                  onClick={() => handleToggle(item.id)}
                                  className={`text-sm font-bold cursor-pointer transition-colors ${
                                    item.checked ? 'text-zinc-400 line-through' : 'text-white hover:text-blue-300'
                                  }`}
                                >
                                  {item.title}
                                </span>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      item.severity === 'critical'
                                        ? 'bg-rose-950/60 text-rose-400 border-rose-800/70'
                                        : item.severity === 'recommended'
                                        ? 'bg-blue-950/60 text-blue-400 border-blue-800/70'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                    }`}
                                  >
                                    {item.severity}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setNotesOpenId(isNotesOpen ? null : item.id)}
                                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                                      item.notes
                                        ? 'text-blue-400 bg-blue-950/40 hover:bg-blue-900/40'
                                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                                    }`}
                                    title="Add or edit notes"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                                    title="Delete this checklist item"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              </div>

                              {item.description && (
                                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                                  {item.description}
                                </p>
                              )}

                              {/* Audit Notes Drawer */}
                              {isNotesOpen && (
                                <div className="pt-2 animate-in fade-in duration-150">
                                  <textarea
                                    rows={2}
                                    placeholder="Record notes, verification data, or parameter values for this check..."
                                    value={item.notes || ''}
                                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State when no items exist in current view */
          <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-blue-400">
              <span className="material-symbols-outlined text-2xl">
                {activePhaseConfig?.icon || 'checklist'}
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {selectedCategory === 'all'
                  ? 'Your Checklist is Currently Empty'
                  : `No Checks in ${activePhaseConfig?.title} Yet`}
              </h4>
              <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
                {selectedCategory === 'all'
                  ? 'Build your customized algorithmic trading validation criteria from scratch. Select a category on the left or use the quick-add bar above.'
                  : 'Add your rules, parameters, and verification requirements for this phase using the quick-add bar above.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedCategory !== 'all') {
                    setNewPhase(selectedCategory);
                  }
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add First Check
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD CUSTOM CHECK MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-xl">fact_check</span>
                <h3 className="text-base font-bold text-white">Add Verification Check</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCheckSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Check Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher-Timeframe Trend Confirmation (H1 EMA 50/200)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Category Phase
                  </label>
                  <select
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {CHECKLIST_PHASES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Severity Tier
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="critical">Critical (Must Pass)</option>
                    <option value="recommended">Recommended</option>
                    <option value="standard">Standard / Best Practice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Requirement Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain the mechanical rule, trigger threshold, or safety parameters required..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
                >
                  Add Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
