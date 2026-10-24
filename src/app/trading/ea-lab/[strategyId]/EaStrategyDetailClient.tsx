"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnalysisTab } from '@/components/ea-lab/AnalysisTab';
import { DailyLogTab } from '@/components/ea-lab/DailyLogTab';
import { CodeTab, VersionItem } from '@/components/ea-lab/CodeTab';
import { PairsTab, PairPerformanceItem } from '@/components/ea-lab/PairsTab';
import { AddRunModal, StrategyOption } from '@/components/ea-lab/AddRunModal';
import { AddVersionModal } from '@/components/ea-lab/AddVersionModal';
import { VersionControlTab } from '@/components/trading-library/VersionControlTab';
import { ChecklistTab } from '@/components/trading-library/ChecklistTab';
import {
  AggregatedMetrics,
  VersionComparisonRow,
  RunLike,
} from '@/lib/ea-lab/metrics';
import { StrategyVerdict } from '@/lib/ea-lab/heuristics';

interface EaStrategyDetailClientProps {
  strategy: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    categoryId?: string | null;
    categoryNumber?: number | null;
  };
  metrics: AggregatedMetrics;
  verdict: StrategyVerdict;
  versionComparisons: VersionComparisonRow[];
  pairBreakdowns: PairPerformanceItem[];
  runs: RunLike[];
  versions: VersionItem[];
  dayJournals: { id: string; date: string; notes: string }[];
  strategyOptions: StrategyOption[];
  initialTab?: string;
}

export function EaStrategyDetailClient({
  strategy,
  metrics,
  verdict,
  versionComparisons,
  pairBreakdowns,
  runs,
  versions,
  dayJournals,
  strategyOptions,
  initialTab = 'analysis',
}: EaStrategyDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analysis' | 'daily' | 'code' | 'pairs' | 'versions' | 'checklist'>(
    (initialTab as any) || 'analysis'
  );

  const availablePairs = useMemo(() => pairBreakdowns.map((p) => p.symbol), [pairBreakdowns]);

  const [isAddRunModalOpen, setIsAddRunModalOpen] = useState(false);
  const [isAddVersionModalOpen, setIsAddVersionModalOpen] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDescClamped, setIsDescClamped] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!strategy.description) return;
    const checkClamped = () => {
      const el = descRef.current;
      if (!el) return;
      // scrollHeight > 64px means content is taller than ~3 lines (at text-xs with relaxed line height)
      setIsDescClamped(el.scrollHeight > 64);
    };

    checkClamped();
    window.addEventListener('resize', checkClamped);
    return () => window.removeEventListener('resize', checkClamped);
  }, [strategy.description]);

  const tabs = [
    { id: 'analysis', label: 'Analysis', icon: 'analytics' },
    { id: 'daily', label: 'Daily Log', icon: 'calendar_month' },
    { id: 'code', label: 'Code', icon: 'terminal' },
    { id: 'pairs', label: 'Pairs', icon: 'currency_exchange' },
    { id: 'versions', label: 'Version Control', icon: 'commit' },
    { id: 'checklist', label: 'Checklist', icon: 'task_alt' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="pb-6 border-b border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/trading" className="hover:text-blue-400 transition-colors">
            Trading
          </Link>
          <span>/</span>
          <Link href="/trading/ea-lab" className="hover:text-blue-400 transition-colors">
            EA Lab
          </Link>
          <span>/</span>
          <span className="text-zinc-300 font-bold">{strategy.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-blue-500 text-2xl">science</span>
              </div>
              <div className="flex-1 min-w-0">
                {strategy.category && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/40 inline-flex items-center gap-1.5 shadow-sm">
                      <span className="material-symbols-outlined text-xs">category</span>
                      {strategy.categoryNumber ? `#${strategy.categoryNumber} ` : ''}
                      {strategy.category}
                    </span>
                  </div>
                )}
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  {strategy.name}
                </h1>
                {strategy.description && (
                  <div className="mt-2">
                    <div
                      ref={descRef}
                      className={`relative overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                        isDescExpanded ? 'max-h-[1400px]' : 'max-h-[3.9rem]'
                      }`}
                    >
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                        {strategy.description}
                      </p>
                      {/* Gradient fade mask on bottom when collapsed */}
                      {!isDescExpanded && isDescClamped && (
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none transition-opacity duration-300" />
                      )}
                    </div>

                    {isDescClamped && (
                      <button
                        type="button"
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors group cursor-pointer"
                      >
                        <span>{isDescExpanded ? 'Show less' : 'Read more'}</span>
                        <span
                          className={`material-symbols-outlined text-base transition-transform duration-300 ${
                            isDescExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddVersionModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">terminal</span>
              New Version
            </button>

            <button
              onClick={() => setIsAddRunModalOpen(true)}
              disabled={versions.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">add_chart</span>
              Add Test Run
            </button>
          </div>
        </div>

        {/* Warning if no versions */}
        {versions.length === 0 && (
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-base">info</span>
              <span>This strategy doesn&apos;t have an EA source code version yet. Add your initial version (v1) to enable logging backtest runs.</span>
            </div>
            <button
              onClick={() => setIsAddVersionModalOpen(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs"
            >
              Add v1 Code
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-900">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
                {tab.id === 'daily' && runs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 ml-1">
                    {runs.length}
                  </span>
                )}
                {tab.id === 'code' && versions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 ml-1">
                    {versions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panes */}
      <div className="pt-2">
        {activeTab === 'analysis' && (
          <AnalysisTab
            strategyName={strategy.name}
            metrics={metrics}
            verdict={verdict}
            versionComparisons={versionComparisons}
            pairBreakdowns={pairBreakdowns}
            runs={runs}
          />
        )}

        {activeTab === 'daily' && (
          <DailyLogTab
            strategyId={strategy.id}
            runs={runs}
            dayJournals={dayJournals}
            versions={versions}
          />
        )}

        {activeTab === 'code' && (
          <CodeTab
            strategyId={strategy.id}
            strategyName={strategy.name}
            versions={versions}
            runs={runs}
          />
        )}

        {activeTab === 'pairs' && (
          <PairsTab
            strategyId={strategy.id}
            pairs={pairBreakdowns}
            runs={runs}
          />
        )}

        {activeTab === 'versions' && (
          <div className="animate-in fade-in duration-150">
            <VersionControlTab
              initialStrategyId={strategy.id}
              strategyName={strategy.name}
              strategyVersions={versions}
              strategyOptions={strategyOptions}
              defaultPairs={pairBreakdowns.map((p) => p.symbol)}
              runs={runs}
            />
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="animate-in fade-in duration-150">
            <ChecklistTab initialStrategyId={strategy.id} />
          </div>
        )}
      </div>

      {/* Modals */}
      <AddVersionModal
        isOpen={isAddVersionModalOpen}
        onClose={() => setIsAddVersionModalOpen(false)}
        strategyId={strategy.id}
        strategyName={strategy.name}
        defaultLabel={`v${versions.length + 1}`}
        existingHashes={versions.map((v) => ({ label: v.label, codeHash: v.codeHash }))}
        availableVersions={versions.map((v) => ({ id: v.id, label: v.label }))}
        onCreated={() => {
          window.location.reload();
        }}
      />

      <AddRunModal
        isOpen={isAddRunModalOpen}
        onClose={() => setIsAddRunModalOpen(false)}
        strategies={strategyOptions}
        defaultStrategyId={strategy.id}
        defaultVersionId={versions[0]?.id}
        availablePairs={availablePairs}
        onSaved={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
