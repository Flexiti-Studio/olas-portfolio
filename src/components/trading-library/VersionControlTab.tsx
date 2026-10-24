"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LIBRARY_STRATEGIES } from '@/lib/trading/libraryData';
import { VersionItem } from '@/components/ea-lab/CodeTab';
import { RunLike } from '@/lib/ea-lab/metrics';
import { toast } from 'sonner';

export interface VersionChange {
  type: 'feat' | 'fix' | 'param' | 'risk';
  text: string;
}

export interface VersionChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category?: 'entry' | 'exit' | 'risk' | 'filter' | 'general';
  notes?: string;
}

export interface StrategyVersionItem {
  id: string;
  strategyId: string;
  strategyName: string;
  version: string;
  title: string;
  status: 'production' | 'testing' | 'backtest' | 'deprecated';
  releasedAt: string;
  author: string;
  timeframe: string;
  market: string;
  targetPairs: string[];
  summary: string;
  checklist: VersionChecklistItem[];
  changes: VersionChange[];
  metrics?: {
    winRate?: number;
    profitFactor?: number;
    maxDrawdown?: number;
    totalTrades?: number;
  };
  codeReference?: string;
}

const COMMON_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'US30', 'NAS100', 'USDJPY', 'BTCUSD', 'AUDUSD'];

const CHECKLIST_TEMPLATES = [
  { text: 'Higher-Timeframe Trend Filter (H4/H1 EMA 50/200)', category: 'entry' as const },
  { text: 'Mechanical Pullback / Retest Entry Trigger', category: 'entry' as const },
  { text: 'Dynamic ATR Trailing Stop (1.5x - 2.0x ATR)', category: 'exit' as const },
  { text: 'Breakeven Stop Activation after 1.0R Profit', category: 'exit' as const },
  { text: 'Maximum 2.5% Daily Drawdown Hard Cap', category: 'risk' as const },
  { text: 'Spread Protection Filter (< 2.5 pips max)', category: 'filter' as const },
  { text: 'News Event Blackout (30 min pre/post high impact)', category: 'filter' as const },
  { text: 'Session Window Restriction (London / NY Open only)', category: 'filter' as const },
];

const INITIAL_VERSIONS: StrategyVersionItem[] = [
  {
    id: 'ver_1',
    strategyId: 'ema-trend-following',
    strategyName: 'EMA Trend Following',
    version: 'v1.2.0',
    title: 'Adaptive Volatility ATR Trailing Stop & M15 Pullback Calibration',
    status: 'production',
    releasedAt: '2026-10-12',
    author: 'Quant Team',
    timeframe: 'M15 (H1 Filter)',
    market: 'XAUUSD, US30, EURUSD',
    targetPairs: ['XAUUSD', 'US30', 'EURUSD'],
    summary:
      'Replaced static pips stop loss with a 1.8x ATR dynamic trailing stop to capture extended trends while cutting whipsaw losses in ranging sessions. Built for London/NY trending market regimes.',
    checklist: [
      { id: 'c1_1', text: 'H1 Higher-Timeframe Trend Filter (EMA 200 slope alignment)', completed: true, category: 'entry' },
      { id: 'c1_2', text: 'M15 Pullback into Fibonacci EMA 21/55 dynamic zone', completed: true, category: 'entry' },
      { id: 'c1_3', text: 'Dynamic 1.8x ATR Trailing Stop engine activated after 1.2R', completed: true, category: 'exit' },
      { id: 'c1_4', text: 'Automatic Breakeven stop move on first 1:1 reward milestone', completed: true, category: 'exit' },
      { id: 'c1_5', text: 'Maximum 2.5% Daily Loss hard circuit breaker', completed: true, category: 'risk' },
      { id: 'c1_6', text: 'Spread guard check: Reject execution if spread > 2.5 pips', completed: false, category: 'filter' },
      { id: 'c1_7', text: 'Red folder economic news blackout buffer (30 mins)', completed: false, category: 'filter' },
    ],
    changes: [
      { type: 'feat', text: 'Added 1.8x ATR trailing stop engine activated after reaching 1.2R in profit.' },
      { type: 'param', text: 'Shifted EMA baseline from 20/50 to Fibonacci 21/55 for smoother slope filter.' },
      { type: 'fix', text: 'Fixed trade re-entry bug after breakeven stop out within the same candle.' },
      { type: 'risk', text: 'Max daily loss cap set to 2.5% of account balance.' },
    ],
    metrics: {
      winRate: 58.4,
      profitFactor: 1.88,
      maxDrawdown: 6.2,
      totalTrades: 142,
    },
    codeReference: 'EA_TrendRider_v1.2.mq5 (commit: 8fa4b9)',
  },
  {
    id: 'ver_2',
    strategyId: 'opening-range-breakout',
    strategyName: 'Opening Range Breakout (ORB)',
    version: 'v1.1.0',
    title: 'New York Session 15-Min ORB with Spread Guard Filter',
    status: 'testing',
    releasedAt: '2026-10-08',
    author: 'Algo Architect',
    timeframe: 'M5 (15-min Opening Window)',
    market: 'NAS100, US30, GER40',
    targetPairs: ['NAS100', 'US30', 'GER40'],
    summary:
      'Integrated pre-market spread widening checks and implemented volume expansion confirmation thresholds for opening candle breaks on index futures.',
    checklist: [
      { id: 'c2_1', text: 'Establish high & low of 09:30-09:45 EST opening range bar', completed: true, category: 'entry' },
      { id: 'c2_2', text: 'Candle body close > 60% outside opening range boundaries', completed: true, category: 'entry' },
      { id: 'c2_3', text: 'Volume expansion filter > 1.5x 20-period moving average', completed: false, category: 'entry' },
      { id: 'c2_4', text: 'Max 1 executed trade per session direction', completed: true, category: 'risk' },
      { id: 'c2_5', text: 'End of session auto-flatten rule at 15:45 EST', completed: true, category: 'exit' },
      { id: 'c2_6', text: 'Pre-market index spread filter threshold check', completed: true, category: 'filter' },
    ],
    changes: [
      { type: 'feat', text: 'Calculates high/low of 09:30-09:45 EST with automated entry triggers on M5 close.' },
      { type: 'risk', text: 'Spread filter prevents order execution if spread exceeds 1.5x normal average.' },
      { type: 'fix', text: 'Added end-of-session auto close at 15:45 EST to avoid overnight swap and gap risk.' },
    ],
    metrics: {
      winRate: 51.8,
      profitFactor: 1.64,
      maxDrawdown: 7.9,
      totalTrades: 98,
    },
    codeReference: 'ORB_Breakout_v1.1.mq5 (commit: 3e2d1c)',
  },
  {
    id: 'ver_3',
    strategyId: 'liquidity-sweep-mss',
    strategyName: 'Liquidity Sweep + Market Structure Shift',
    version: 'v2.0.0-rc1',
    title: 'Mechanical FVG Entry Mitigation & Swing Liquidity Sweep Rules',
    status: 'backtest',
    releasedAt: '2026-10-02',
    author: 'SMC Research',
    timeframe: 'M15',
    market: 'EURUSD, GBPUSD, XAUUSD',
    targetPairs: ['EURUSD', 'GBPUSD', 'XAUUSD'],
    summary:
      'Overhauled subjective swing detection with mechanical 3-bar fractals, Fair Value Gap (FVG) retest entry orders, and strict 1:2.5 minimum R:R target.',
    checklist: [
      { id: 'c3_1', text: 'Session High / Low Liquidity Sweep identification', completed: true, category: 'entry' },
      { id: 'c3_2', text: 'M5 Change of Character (CHOCH) / Market Structure Shift', completed: true, category: 'entry' },
      { id: 'c3_3', text: '50% Midpoint Mitigation limit order on unmitigated FVG', completed: false, category: 'entry' },
      { id: 'c3_4', text: 'Invalidation stop placed 2 pips beyond liquidity sweep wick', completed: true, category: 'risk' },
      { id: 'c3_5', text: 'Minimum 2.5R Take Profit target milestone', completed: false, category: 'exit' },
      { id: 'c3_6', text: 'High impact FOMC/CPI news event filter', completed: false, category: 'filter' },
    ],
    changes: [
      { type: 'feat', text: 'Automated 3-bar fractal swing identification to eliminate hindsight bias.' },
      { type: 'feat', text: 'Entry triggers on 50% midpoint mitigation of M15 Fair Value Gap following MSS.' },
      { type: 'param', text: 'Minimum reward-to-risk ratio requirement raised to 2.5R.' },
      { type: 'risk', text: 'Invalidation placed 2 pips beyond the liquidity sweep wick extreme.' },
    ],
    metrics: {
      winRate: 46.2,
      profitFactor: 2.15,
      maxDrawdown: 8.4,
      totalTrades: 116,
    },
    codeReference: 'SMC_Sweep_v2.0_rc1.mq5 (commit: 91b0f4)',
  },
  {
    id: 'ver_4',
    strategyId: 'donchian-channel-breakout',
    strategyName: 'Donchian Channel Breakout',
    version: 'v1.0.0',
    title: 'Turtle-Inspired Dual-Channel 20/55 System with Volatility Sizing',
    status: 'production',
    releasedAt: '2026-09-20',
    author: 'Systematic Dev',
    timeframe: 'H1',
    market: 'XAUUSD, BTCUSD, NAS100',
    targetPairs: ['XAUUSD', 'BTCUSD', 'NAS100'],
    summary:
      'Baseline implementation of Richard Donchian channel breakout: 20-bar breakout entry with 10-bar exit channel and ATR-normalized position sizing.',
    checklist: [
      { id: 'c4_1', text: '20-bar High breakout Buy order / 20-bar Low breakout Sell order', completed: true, category: 'entry' },
      { id: 'c4_2', text: '10-bar Exit Channel trailing stop liquidation', completed: true, category: 'exit' },
      { id: 'c4_3', text: 'ATR(20) normalized risk sizing (1.0% equity allocation)', completed: true, category: 'risk' },
      { id: 'c4_4', text: 'Maximum 2 pyramiding units allowed on confirmed trend', completed: false, category: 'risk' },
      { id: 'c4_5', text: 'Weekend holding filter (close crypto before Friday close or hold)', completed: true, category: 'filter' },
    ],
    changes: [
      { type: 'feat', text: 'Initial baseline release of classic dual Donchian Channel system.' },
      { type: 'feat', text: 'Normalized position sizing: Risk = 1.0% account equity divided by ATR(20).' },
      { type: 'risk', text: 'Maximum open positions capped at 2 pyramiding units.' },
    ],
    metrics: {
      winRate: 43.8,
      profitFactor: 1.72,
      maxDrawdown: 9.8,
      totalTrades: 184,
    },
    codeReference: 'Donchian_Rider_v1.0.mq5 (commit: 11a4c8)',
  },
];

function normalizeVersionItem(item: any): StrategyVersionItem {
  let targetPairs: string[] = [];
  if (Array.isArray(item.targetPairs)) {
    targetPairs = item.targetPairs;
  } else if (typeof item.market === 'string' && item.market.trim()) {
    targetPairs = item.market.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else {
    targetPairs = ['XAUUSD', 'EURUSD'];
  }

  let checklist: VersionChecklistItem[] = [];
  if (Array.isArray(item.checklist)) {
    checklist = item.checklist;
  } else {
    checklist = [
      { id: `chk_${Date.now()}_1`, text: 'Higher-Timeframe Trend Confirmation (H1/H4 EMA)', completed: true, category: 'entry' },
      { id: `chk_${Date.now()}_2`, text: 'Mechanical Pullback / Retest Entry Trigger', completed: true, category: 'entry' },
      { id: `chk_${Date.now()}_3`, text: 'Dynamic ATR Trailing Stop or Invalidation SL', completed: true, category: 'exit' },
      { id: `chk_${Date.now()}_4`, text: 'Breakeven Stop Activation after 1.0R Profit', completed: false, category: 'exit' },
      { id: `chk_${Date.now()}_5`, text: 'Max Daily Loss Guardrail (2.5% Account Cap)', completed: false, category: 'risk' },
      { id: `chk_${Date.now()}_6`, text: 'Spread & Session Timing Filter (London / NY)', completed: false, category: 'filter' },
    ];
  }

  return {
    ...item,
    targetPairs,
    checklist,
    summary: item.summary || item.title || '',
  };
}

export interface VersionControlTabProps {
  initialStrategyId?: string;
  strategyName?: string;
  strategyVersions?: VersionItem[];
  strategyOptions?: { id: string; name: string; versions?: any[] }[];
  defaultPairs?: string[];
  runs?: RunLike[];
}

export function VersionControlTab({
  initialStrategyId,
  strategyName,
  strategyVersions,
  strategyOptions,
  defaultPairs,
  runs,
}: VersionControlTabProps = {}) {
  const [versions, setVersions] = useState<StrategyVersionItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [strategyFilter, setStrategyFilter] = useState<string>(initialStrategyId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combined list of strategies for selection/filtering
  const combinedStrategies = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    if (initialStrategyId) {
      map.set(initialStrategyId, {
        id: initialStrategyId,
        name: strategyName || 'Active EA Strategy',
      });
    }

    if (strategyOptions?.length) {
      strategyOptions.forEach((s) => {
        if (!map.has(s.id)) {
          map.set(s.id, { id: s.id, name: s.name });
        }
      });
    }

    LIBRARY_STRATEGIES.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, { id: s.id, name: s.name });
      }
    });

    return Array.from(map.values());
  }, [initialStrategyId, strategyName, strategyOptions]);

  // Keep strategyFilter in sync if initialStrategyId changes
  useEffect(() => {
    if (initialStrategyId) {
      setStrategyFilter(initialStrategyId);
      setFormStrategyId(initialStrategyId);
    }
  }, [initialStrategyId]);

  // Editable fields for the selected version
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [isDescDirty, setIsDescDirty] = useState(false);

  // New pair input
  const [newPairInput, setNewPairInput] = useState('');

  // New checklist item input
  const [newCheckText, setNewCheckText] = useState('');
  const [newCheckCategory, setNewCheckCategory] = useState<'entry' | 'exit' | 'risk' | 'filter' | 'general'>('entry');

  // New Version Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formStrategyId, setFormStrategyId] = useState(initialStrategyId || LIBRARY_STRATEGIES[0]?.id || '');
  const [formVersion, setFormVersion] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState<'production' | 'testing' | 'backtest' | 'deprecated'>('backtest');
  const [formTimeframe, setFormTimeframe] = useState('');
  const [formMarket, setFormMarket] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formCodeRef, setFormCodeRef] = useState('');
  const [formWinRate, setFormWinRate] = useState('');
  const [formProfitFactor, setFormProfitFactor] = useState('');
  const [formDrawdown, setFormDrawdown] = useState('');

  // Stable keys to avoid repeated useEffect runs
  const strategyVersionsKey = useMemo(
    () => strategyVersions?.map((v) => `${v.id}_${v.label}`).join('|') || '',
    [strategyVersions]
  );
  const defaultPairsKey = useMemo(
    () => (defaultPairs || []).join(','),
    [defaultPairs]
  );

  // Load from localStorage or initialize with seed data, and hydrate EA versions
  useEffect(() => {
    try {
      let currentList: StrategyVersionItem[] = [];
      const stored = localStorage.getItem('trading_library_versions_v2');
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          currentList = parsed.map(normalizeVersionItem);
        }
      } else {
        // Check legacy key
        const legacy = localStorage.getItem('trading_library_versions_v1');
        if (legacy !== null) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed)) {
            currentList = parsed.map(normalizeVersionItem);
            try {
              localStorage.setItem('trading_library_versions_v2', JSON.stringify(currentList));
              localStorage.removeItem('trading_library_versions_v1');
            } catch {
              // ignore
            }
          }
        }
      }

      if (currentList.length === 0) {
        currentList = [...INITIAL_VERSIONS];
      }

      // If initialStrategyId is provided, ensure this strategy has versions!
      if (initialStrategyId) {
        const targetStratName = strategyName || combinedStrategies.find((s) => s.id === initialStrategyId)?.name || 'EA Strategy';
        const initialPairs = (defaultPairs && defaultPairs.length > 0) ? defaultPairs : ['XAUUSD', 'EURUSD'];
        let addedAny = false;

        // 1. If strategyVersions was provided from database (Code tab / EaVersion)
        if (strategyVersions && strategyVersions.length > 0) {
          strategyVersions.forEach((sv) => {
            const versionLabel = sv.label.startsWith('v') ? sv.label : `v${sv.label}`;
            const exists = currentList.some(
              (v) =>
                v.strategyId === initialStrategyId &&
                (v.version.toLowerCase() === versionLabel.toLowerCase() ||
                  v.id === `ver_${sv.id}` ||
                  v.id === `ver_ea_${sv.id}`)
            );

            if (!exists) {
              const matchingRuns = runs?.filter((r) => r.versionId === sv.id) || [];
              const runPairs = Array.from(new Set(matchingRuns.map((r) => r.symbol).filter(Boolean)));
              const activePairs = runPairs.length > 0 ? runPairs : initialPairs;
              const stratTimeframe = matchingRuns[0]?.timeframe || 'M15';

              let versionMetrics = undefined;
              if (matchingRuns.length > 0) {
                const totalTrades = matchingRuns.reduce((acc, r) => acc + (r.trades?.length || r.tradesCount || 0), 0);
                const wins = matchingRuns.reduce((acc, r) => {
                  return acc + (r.trades?.filter((t) => (t.profit ?? 0) > 0 || (t.rMultiple ?? 0) > 0).length || 0);
                }, 0);
                const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0;
                versionMetrics = {
                  totalTrades,
                  winRate,
                };
              }

              const newVer: StrategyVersionItem = {
                id: `ver_ea_${sv.id}`,
                strategyId: initialStrategyId,
                strategyName: targetStratName,
                version: versionLabel,
                title: sv.changeNotes || `${targetStratName} - ${versionLabel} Source Implementation`,
                status: matchingRuns.length > 0 ? 'testing' : 'backtest',
                releasedAt: sv.createdAt ? new Date(sv.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                author: 'EA Developer',
                timeframe: stratTimeframe,
                market: activePairs.join(', '),
                targetPairs: activePairs,
                summary: sv.changeNotes || `Version ${versionLabel} implementation for ${targetStratName}. Configure checklist criteria and target benchmark pairs below.`,
                checklist: [
                  { id: `c_${sv.id}_1`, text: 'Higher-Timeframe Trend Confirmation (H1/H4 EMA)', completed: false, category: 'entry' },
                  { id: `c_${sv.id}_2`, text: 'Mechanical Pullback / Retest Entry Trigger', completed: false, category: 'entry' },
                  { id: `c_${sv.id}_3`, text: 'Dynamic ATR Trailing Stop or Invalidation SL', completed: false, category: 'exit' },
                  { id: `c_${sv.id}_4`, text: 'Breakeven Stop Activation after 1.0R Profit', completed: false, category: 'exit' },
                  { id: `c_${sv.id}_5`, text: 'Max Daily Loss Guardrail (2.5% Account Cap)', completed: false, category: 'risk' },
                  { id: `c_${sv.id}_6`, text: 'Spread & Session Timing Filter (London / NY)', completed: false, category: 'filter' },
                ],
                changes: [{ type: 'feat', text: sv.changeNotes || `Initial commit for version ${versionLabel}.` }],
                metrics: versionMetrics,
                codeReference: `${targetStratName.replace(/\s+/g, '_')}_${versionLabel}.mq5`,
              };

              currentList.push(newVer);
              addedAny = true;
            }
          });
        }

        // 2. If no versions exist at all for this strategy (even after checking strategyVersions)
        const hasStrategyVersion = currentList.some((v) => v.strategyId === initialStrategyId);
        if (!hasStrategyVersion) {
          const defaultInitialVer: StrategyVersionItem = {
            id: `ver_init_${initialStrategyId}`,
            strategyId: initialStrategyId,
            strategyName: targetStratName,
            version: 'v1.0.0',
            title: `${targetStratName} - Baseline v1.0.0`,
            status: 'backtest',
            releasedAt: new Date().toISOString().split('T')[0],
            author: 'Quant Dev',
            timeframe: 'M15',
            market: initialPairs.join(', '),
            targetPairs: initialPairs,
            summary: `Baseline implementation for ${targetStratName}. Use this version workspace to manage checklist requirements and target benchmark pairs.`,
            checklist: [
              { id: `chk_${Date.now()}_1`, text: 'Higher-Timeframe Trend Confirmation (H1/H4 EMA)', completed: false, category: 'entry' },
              { id: `chk_${Date.now()}_2`, text: 'Mechanical Pullback / Retest Entry Trigger', completed: false, category: 'entry' },
              { id: `chk_${Date.now()}_3`, text: 'Dynamic ATR Trailing Stop or Invalidation SL', completed: false, category: 'exit' },
              { id: `chk_${Date.now()}_4`, text: 'Breakeven Stop Activation after 1.0R Profit', completed: false, category: 'exit' },
              { id: `chk_${Date.now()}_5`, text: 'Max Daily Loss Guardrail (2.5% Account Cap)', completed: false, category: 'risk' },
              { id: `chk_${Date.now()}_6`, text: 'Spread & Session Timing Filter (London / NY)', completed: false, category: 'filter' },
            ],
            changes: [{ type: 'feat', text: 'Initial planning, test checklist, and target pairs setup.' }],
            codeReference: `${targetStratName.replace(/\s+/g, '_')}_v1.0.0.mq5`,
          };

          currentList.push(defaultInitialVer);
          addedAny = true;
        }

        if (addedAny) {
          try {
            localStorage.setItem('trading_library_versions_v2', JSON.stringify(currentList));
          } catch (e) {
            console.error('Failed to save initialized versions to localStorage', e);
          }
        }
      }

      setVersions(currentList);

      // Select initial version
      if (initialStrategyId) {
        const stratVersions = currentList.filter((v) => v.strategyId === initialStrategyId);
        if (stratVersions.length > 0) {
          setSelectedVersionId((prev) =>
            prev && stratVersions.some((v) => v.id === prev) ? prev : stratVersions[0].id
          );
          return;
        }
      }

      setSelectedVersionId((prev) =>
        prev && currentList.some((v) => v.id === prev) ? prev : currentList[0]?.id || null
      );
    } catch {
      setVersions(INITIAL_VERSIONS);
      setSelectedVersionId(INITIAL_VERSIONS[0]?.id || null);
    }
  }, [initialStrategyId, strategyName, strategyVersionsKey, defaultPairsKey, combinedStrategies]);

  function saveVersions(updated: StrategyVersionItem[]) {
    setVersions(updated);
    try {
      localStorage.setItem('trading_library_versions_v2', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save versions to localStorage', e);
    }
  }

  // Filtered versions for the left sidebar
  const filteredVersions = useMemo(() => {
    return versions.filter((v) => {
      const matchesStrat = strategyFilter === 'all' || v.strategyId === strategyFilter;
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.version.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q) ||
        v.strategyName.toLowerCase().includes(q) ||
        v.targetPairs.some((p) => p.toLowerCase().includes(q)) ||
        v.summary.toLowerCase().includes(q) ||
        v.checklist.some((c) => c.text.toLowerCase().includes(q));

      return matchesStrat && matchesStatus && matchesSearch;
    });
  }, [versions, strategyFilter, statusFilter, searchQuery]);

  // Active selected version
  const activeVersion = useMemo(() => {
    if (!filteredVersions.length) return null;
    const found = filteredVersions.find((v) => v.id === selectedVersionId);
    return found || filteredVersions[0];
  }, [filteredVersions, selectedVersionId]);

  // Sync editing description when active version changes
  useEffect(() => {
    if (activeVersion) {
      setEditingDescription(activeVersion.summary || '');
      setIsDescDirty(false);
    }
  }, [activeVersion?.id]);

  // Description actions
  function handleSaveDescription() {
    if (!activeVersion) return;
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return { ...v, summary: editingDescription.trim() };
      }
      return v;
    });
    saveVersions(updated);
    setIsDescDirty(false);
    toast.success('Version description updated!');
  }

  // Pair actions
  function handleAddPair(pairSymbol?: string) {
    if (!activeVersion) return;
    const sym = (pairSymbol || newPairInput).trim().toUpperCase();
    if (!sym) return;

    if (activeVersion.targetPairs.includes(sym)) {
      toast.info(`${sym} is already in the target pairs list`);
      setNewPairInput('');
      return;
    }

    const updatedPairs = [...activeVersion.targetPairs, sym];
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return {
          ...v,
          targetPairs: updatedPairs,
          market: updatedPairs.join(', '),
        };
      }
      return v;
    });

    saveVersions(updated);
    setNewPairInput('');
    toast.success(`Added ${sym} to ${activeVersion.version} pairs`);
  }

  function handleRemovePair(pairToRemove: string) {
    if (!activeVersion) return;
    const updatedPairs = activeVersion.targetPairs.filter((p) => p !== pairToRemove);
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return {
          ...v,
          targetPairs: updatedPairs,
          market: updatedPairs.join(', '),
        };
      }
      return v;
    });

    saveVersions(updated);
    toast.success(`Removed ${pairToRemove}`);
  }

  // Checklist actions
  function handleToggleChecklist(checkId: string) {
    if (!activeVersion) return;
    const updatedChecklist = activeVersion.checklist.map((c) => {
      if (c.id === checkId) {
        return { ...c, completed: !c.completed };
      }
      return c;
    });

    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return { ...v, checklist: updatedChecklist };
      }
      return v;
    });

    saveVersions(updated);
  }

  function handleAddChecklistItem(e?: React.FormEvent, templateText?: string, templateCat?: any) {
    if (e) e.preventDefault();
    if (!activeVersion) return;
    const text = (templateText || newCheckText).trim();
    if (!text) return;

    const newItem: VersionChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      completed: false,
      category: templateCat || newCheckCategory,
    };

    const updatedChecklist = [...activeVersion.checklist, newItem];
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return { ...v, checklist: updatedChecklist };
      }
      return v;
    });

    saveVersions(updated);
    setNewCheckText('');
    toast.success('Checklist requirement added!');
  }

  function handleDeleteChecklistItem(checkId: string) {
    if (!activeVersion) return;
    const updatedChecklist = activeVersion.checklist.filter((c) => c.id !== checkId);
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return { ...v, checklist: updatedChecklist };
      }
      return v;
    });

    saveVersions(updated);
    toast.success('Checklist item removed');
  }

  // Status toggle
  function handleUpdateStatus(newStatus: 'production' | 'testing' | 'backtest' | 'deprecated') {
    if (!activeVersion) return;
    const updated = versions.map((v) => {
      if (v.id === activeVersion.id) {
        return { ...v, status: newStatus };
      }
      return v;
    });
    saveVersions(updated);
    toast.success(`Version status set to ${newStatus.toUpperCase()}`);
  }

  // Delete version
  function handleDeleteVersion(id: string) {
    if (!confirm('Are you sure you want to delete this version entry?')) return;
    const updated = versions.filter((v) => v.id !== id);
    saveVersions(updated);
    if (selectedVersionId === id) {
      setSelectedVersionId(updated[0]?.id || null);
    }
    toast.success('Version deleted');
  }

  // Create new version
  function handleCreateVersionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const strat = combinedStrategies.find((s) => s.id === formStrategyId);
    if (!strat || !formVersion.trim() || !formTitle.trim()) return;

    const parsedPairs = formMarket
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    const initialPairs = parsedPairs.length > 0 ? parsedPairs : ['XAUUSD', 'EURUSD'];

    const newVersion: StrategyVersionItem = {
      id: `ver_${Date.now()}`,
      strategyId: strat.id,
      strategyName: strat.name,
      version: formVersion.trim().startsWith('v') ? formVersion.trim() : `v${formVersion.trim()}`,
      title: formTitle.trim(),
      status: formStatus,
      releasedAt: new Date().toISOString().split('T')[0],
      author: 'Strategy Dev',
      timeframe: formTimeframe.trim() || 'M15',
      market: initialPairs.join(', '),
      targetPairs: initialPairs,
      summary: formSummary.trim(),
      checklist: [
        { id: `c_${Date.now()}_1`, text: 'Higher-Timeframe Trend Filter Alignment', completed: false, category: 'entry' },
        { id: `c_${Date.now()}_2`, text: 'Mechanical Confirmation Entry Trigger', completed: false, category: 'entry' },
        { id: `c_${Date.now()}_3`, text: 'Dynamic Invalidation Stop Loss', completed: false, category: 'exit' },
        { id: `c_${Date.now()}_4`, text: 'Breakeven Stop Activation on 1:1 R', completed: false, category: 'exit' },
        { id: `c_${Date.now()}_5`, text: 'Max Daily Drawdown Protection Cap', completed: false, category: 'risk' },
      ],
      changes: [{ type: 'feat', text: 'Initial release of this code version.' }],
      metrics: {
        winRate: formWinRate ? parseFloat(formWinRate) : undefined,
        profitFactor: formProfitFactor ? parseFloat(formProfitFactor) : undefined,
        maxDrawdown: formDrawdown ? parseFloat(formDrawdown) : undefined,
      },
      codeReference: formCodeRef.trim() || undefined,
    };

    const nextVersions = [newVersion, ...versions];
    saveVersions(nextVersions);
    setSelectedVersionId(newVersion.id);
    setIsNewModalOpen(false);

    // Reset modal form
    setFormVersion('');
    setFormTitle('');
    setFormSummary('');
    setFormMarket('');
    setFormTimeframe('');
    setFormCodeRef('');
    setFormWinRate('');
    setFormProfitFactor('');
    setFormDrawdown('');
    toast.success(`Created code version ${newVersion.version}!`);
  }

  // Copy release summary
  function handleCopySummary(v: StrategyVersionItem) {
    const text = `[${v.version}] ${v.strategyName} - ${v.title}
Status: ${v.status.toUpperCase()} | Released: ${v.releasedAt} | Pairs: ${v.targetPairs.join(', ')} (${v.timeframe})
Summary: ${v.summary}
Checklist Coverage: ${v.checklist.filter((c) => c.completed).length}/${v.checklist.length} Completed
${v.checklist.map((c) => `[${c.completed ? 'X' : ' '}] ${c.text} (${c.category || 'general'})`).join('\n')}`;

    navigator.clipboard.writeText(text);
    toast.success('Version release notes copied to clipboard!');
  }

  return (
    <div className="space-y-6">
      {/* Top Header Strip with Overview KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1 uppercase tracking-wider">
            <span>Trading</span>
            <span>/</span>
            <span>Version Control</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-blue-500 text-2xl">commit</span>
            Code Versions & Coverage Matrix
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select any code version on the left to manage target benchmark pairs, custom rule checklists, and architectural descriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFormStrategyId(
                strategyFilter !== 'all' ? strategyFilter : initialStrategyId || combinedStrategies[0]?.id || ''
              );
              setIsNewModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Version
          </button>
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 relative">
        {/* LEFT COLUMN: Versions Tab Sidebar */}
        <aside className="w-full lg:w-84 shrink-0 space-y-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3 sticky top-6">
            {/* Sidebar Title & Count */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-lg">history_toggle_off</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Available Versions
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {filteredVersions.length} of {versions.length}
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-zinc-500 text-xs">
                search
              </span>
              <input
                type="text"
                placeholder="Search versions, pairs, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-[10px] font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: 'production', label: 'Prod' },
                { id: 'testing', label: 'Test' },
                { id: 'backtest', label: 'Backtest' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`flex-1 py-1 rounded-lg font-medium transition-colors text-center ${
                    statusFilter === st.id
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Strategy Filter Dropdown */}
            <div>
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Strategies ({versions.length})</option>
                {combinedStrategies.map((s) => {
                  const stratVersionCount = versions.filter((v) => v.strategyId === s.id).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({stratVersionCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Vertical Version Tab List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 no-scrollbar">
              {filteredVersions.length > 0 ? (
                filteredVersions.map((v) => {
                  const isSelected = activeVersion?.id === v.id;
                  const completedChecks = v.checklist.filter((c) => c.completed).length;
                  const totalChecks = v.checklist.length;
                  const pct = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

                  const statusConfig = {
                    production: { label: 'Prod', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
                    testing: { label: 'Test', color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
                    backtest: { label: 'Backtest', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
                    deprecated: { label: 'Depr', color: 'text-zinc-400 bg-zinc-900 border-zinc-800' },
                  }[v.status];

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVersionId(v.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all relative group ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-950/40'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/70 hover:border-zinc-700'
                      }`}
                    >
                      {/* Top strip: Version badge + Status tag */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {v.version}
                        </span>

                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Title & Strategy */}
                      <div className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {v.title || v.strategyName}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {v.strategyName}
                      </div>

                      {/* Footer: Pairs & Checklist Progress */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-2.5 pt-2 border-t border-zinc-800/60">
                        <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[140px]">
                          <span className="material-symbols-outlined text-[12px] text-purple-400">currency_exchange</span>
                          {v.targetPairs.slice(0, 2).join(', ')}
                          {v.targetPairs.length > 2 && ` +${v.targetPairs.length - 2}`}
                        </span>

                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            pct === 100 ? 'text-emerald-400' : pct >= 50 ? 'text-blue-400' : 'text-zinc-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">task_alt</span>
                          {completedChecks}/{totalChecks}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/50 space-y-3">
                  <p>No versions match your search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormStrategyId(
                        strategyFilter !== 'all' ? strategyFilter : initialStrategyId || combinedStrategies[0]?.id || ''
                      );
                      setIsNewModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    Create Version
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Selected Version Workspace */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {activeVersion ? (
            <>
              {/* 1. Version Header & Quick Controls */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-black px-3 py-1 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                      {activeVersion.version}
                    </span>

                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={activeVersion.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-xl border bg-zinc-900 focus:outline-none cursor-pointer ${
                          activeVersion.status === 'production'
                            ? 'text-emerald-400 border-emerald-800/80'
                            : activeVersion.status === 'testing'
                            ? 'text-blue-400 border-blue-800/80'
                            : activeVersion.status === 'backtest'
                            ? 'text-amber-400 border-amber-800/80'
                            : 'text-zinc-400 border-zinc-800'
                        }`}
                      >
                        <option value="production">● Production</option>
                        <option value="testing">● Demo Testing</option>
                        <option value="backtest">● Backtest Iteration</option>
                        <option value="deprecated">● Deprecated</option>
                      </select>
                    </div>

                    <span className="text-zinc-600">•</span>

                    <span className="text-xs font-bold text-zinc-300">
                      {activeVersion.strategyName}
                    </span>

                    <span className="text-zinc-600">•</span>

                    <span className="text-xs font-mono text-zinc-400">
                      {activeVersion.timeframe}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySummary(activeVersion)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center gap-1.5"
                      title="Copy version summary and checklist to clipboard"
                    >
                      <span className="material-symbols-outlined text-xs text-blue-400">content_copy</span>
                      Copy
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteVersion(activeVersion.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 transition-colors flex items-center gap-1.5"
                      title="Delete version"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>

                {/* Version Title */}
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {activeVersion.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-1">
                    <span>Released: {activeVersion.releasedAt}</span>
                    <span>•</span>
                    <span>Author: {activeVersion.author}</span>
                    {activeVersion.codeReference && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400">{activeVersion.codeReference}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Version Description Card (Editable) */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-lg">description</span>
                    <h4 className="text-sm font-bold text-white">
                      Version Description & Strategy Hypotheses
                    </h4>
                  </div>
                  {isDescDirty && (
                    <span className="text-[10px] font-mono text-amber-400 animate-pulse">
                      Unsaved edits
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400">
                  Document the architectural changes, quantitative hypotheses, and mechanical rules implemented in this version.
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editingDescription}
                    onChange={(e) => {
                      setEditingDescription(e.target.value);
                      setIsDescDirty(true);
                    }}
                    placeholder="Describe what this code version aims to solve, how it manages risk, and key trade logic..."
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 leading-relaxed font-sans transition-colors resize-y"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {editingDescription.length} characters
                    </span>

                    <button
                      type="button"
                      disabled={!isDescDirty}
                      onClick={handleSaveDescription}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-blue-600 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-xs">save</span>
                      Save Description
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Target Pairs / Instruments to Try Card */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-lg">currency_exchange</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Pairs to Try With This Version
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Define which instruments, metals, or indices this EA iteration is calibrated to trade.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-800/50 px-2.5 py-1 rounded-full">
                    {activeVersion.targetPairs.length} Pair{activeVersion.targetPairs.length !== 1 ? 's' : ''} Configured
                  </span>
                </div>

                {/* Active Pairs Tags */}
                <div className="flex items-center gap-2 flex-wrap min-h-[40px] p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  {activeVersion.targetPairs.length > 0 ? (
                    activeVersion.targetPairs.map((pair) => (
                      <span
                        key={pair}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-800/60 shadow-sm group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <span>{pair}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePair(pair)}
                          className="text-purple-400/60 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5"
                          title={`Remove ${pair}`}
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500">
                      No pairs added yet. Add instruments below to benchmark this version.
                    </span>
                  )}
                </div>

                {/* Add Pair Form & Quick Chips */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center gap-2 max-w-md">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-zinc-500 text-xs">
                        add
                      </span>
                      <input
                        type="text"
                        placeholder="Enter symbol (e.g. USDJPY, XAUUSD)..."
                        value={newPairInput}
                        onChange={(e) => setNewPairInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPair();
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 uppercase transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPair()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Add Pair
                    </button>
                  </div>

                  {/* Quick-Add Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-500 font-mono">Quick Add:</span>
                    {COMMON_PAIRS.map((sym) => {
                      const alreadyAdded = activeVersion.targetPairs.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddPair(sym)}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                            alreadyAdded
                              ? 'opacity-30 bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                              : 'bg-zinc-900 hover:bg-purple-950/40 text-zinc-300 hover:text-purple-300 border-zinc-800 hover:border-purple-800/60'
                          }`}
                        >
                          +{sym}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Strategy Coverage Checklist Card */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">checklist</span>
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Strategy Coverage Checklist
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Requirements, mechanical indicators, and risk guardrails this version must satisfy.
                      </p>
                    </div>
                  </div>

                  {/* Progress Badge */}
                  {(() => {
                    const completed = activeVersion.checklist.filter((c) => c.completed).length;
                    const total = activeVersion.checklist.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {completed} of {total} Covered
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                            pct === 100
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                              : pct >= 50
                              ? 'bg-blue-950/80 text-blue-400 border-blue-800/80'
                              : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Progress Bar */}
                {(() => {
                  const completed = activeVersion.checklist.filter((c) => c.completed).length;
                  const total = activeVersion.checklist.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800/80 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          pct === 100
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                            : pct >= 50
                            ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                })()}

                {/* Checklist Rows */}
                <div className="space-y-2">
                  {activeVersion.checklist.length > 0 ? (
                    activeVersion.checklist.map((item) => {
                      const categoryPill = {
                        entry: { label: 'Entry', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
                        exit: { label: 'Exit', color: 'bg-blue-950/60 text-blue-400 border-blue-800/60' },
                        risk: { label: 'Risk Guard', color: 'bg-rose-950/60 text-rose-400 border-rose-800/60' },
                        filter: { label: 'Filter', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
                        general: { label: 'General', color: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
                      }[item.category || 'general'];

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            item.completed
                              ? 'bg-emerald-950/15 border-emerald-800/30'
                              : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(item.id)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                item.completed
                                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-600/30'
                                  : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-transparent'
                              }`}
                            >
                              <span className="material-symbols-outlined text-xs font-bold">check</span>
                            </button>

                            <span
                              onClick={() => handleToggleChecklist(item.id)}
                              className={`text-xs cursor-pointer select-none truncate transition-colors ${
                                item.completed
                                  ? 'text-zinc-400 line-through'
                                  : 'text-zinc-200 font-medium hover:text-white'
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${categoryPill.color}`}
                            >
                              {categoryPill.label}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-zinc-900 transition-colors"
                              title="Delete requirement"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/60">
                      No checklist requirements added yet. Add rule requirements below to track strategy coverage.
                    </div>
                  )}
                </div>

                {/* Add Checklist Item Form */}
                <form
                  onSubmit={handleAddChecklistItem}
                  className="space-y-3 pt-3 border-t border-zinc-800/80"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-zinc-500 text-xs">
                        add_task
                      </span>
                      <input
                        type="text"
                        placeholder="Add rule or coverage requirement (e.g. 50 EMA Slope Filter)..."
                        value={newCheckText}
                        onChange={(e) => setNewCheckText(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <select
                      value={newCheckCategory}
                      onChange={(e) => setNewCheckCategory(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="entry">Entry Rule</option>
                      <option value="exit">Exit Rule</option>
                      <option value="risk">Risk Guard</option>
                      <option value="filter">Filter</option>
                      <option value="general">General</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!newCheckText.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Add Check
                    </button>
                  </div>

                  {/* Quick-Add Suggestion Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-500 font-mono">Suggested Checks:</span>
                    {CHECKLIST_TEMPLATES.map((tmpl) => {
                      const alreadyPresent = activeVersion.checklist.some((c) => c.text === tmpl.text);
                      return (
                        <button
                          key={tmpl.text}
                          type="button"
                          disabled={alreadyPresent}
                          onClick={() => handleAddChecklistItem(undefined, tmpl.text, tmpl.category)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                            alreadyPresent
                              ? 'opacity-30 bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                              : 'bg-zinc-900 hover:bg-blue-950/40 text-zinc-300 hover:text-blue-300 border-zinc-800 hover:border-blue-800/60'
                          }`}
                        >
                          +{tmpl.text.split('(')[0].trim()}
                        </button>
                      );
                    })}
                  </div>
                </form>
              </div>

              {/* 5. Metrics & Changelog Strip */}
              {activeVersion.metrics && (
                <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">monitoring</span>
                    Benchmarked Performance Metrics
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[10px] text-zinc-500 uppercase">Win Rate</div>
                      <div className="text-xl font-bold text-emerald-400 mt-0.5">
                        {activeVersion.metrics.winRate || '-'}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[10px] text-zinc-500 uppercase">Profit Factor</div>
                      <div className="text-xl font-bold text-white mt-0.5">
                        {activeVersion.metrics.profitFactor || '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[10px] text-zinc-500 uppercase">Max Drawdown</div>
                      <div className="text-xl font-bold text-rose-400 mt-0.5">
                        {activeVersion.metrics.maxDrawdown ? `-${activeVersion.metrics.maxDrawdown}%` : '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[10px] text-zinc-500 uppercase">Sample Trades</div>
                      <div className="text-xl font-bold text-zinc-300 mt-0.5">
                        {activeVersion.metrics.totalTrades || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-blue-400">commit</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Code Versions Available</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  {strategyFilter !== 'all'
                    ? 'No code versions have been logged for this strategy yet. Create your initial version (e.g. v1.0.0) to start managing target pairs and test checklists.'
                    : 'Select a version from the left sidebar to view its details, or log a new version.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormStrategyId(
                    strategyFilter !== 'all' ? strategyFilter : initialStrategyId || combinedStrategies[0]?.id || ''
                  );
                  setIsNewModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Log New Version
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Version Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-xl">commit</span>
                <h3 className="text-base font-bold text-white">Log New Code Version</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVersionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Strategy
                  </label>
                  <select
                    value={formStrategyId}
                    onChange={(e) => setFormStrategyId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {combinedStrategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Version Tag (e.g. v1.3.0)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="v1.3.0"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Version Title / Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic 2x ATR Trailing Stop & Asian Session Filter"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="backtest">Backtest Iteration</option>
                    <option value="testing">Demo Testing</option>
                    <option value="production">Production</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Timeframe
                  </label>
                  <input
                    type="text"
                    placeholder="M15, H1..."
                    value={formTimeframe}
                    onChange={(e) => setFormTimeframe(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Target Pairs (CSV)
                  </label>
                  <input
                    type="text"
                    placeholder="XAUUSD, US30..."
                    value={formMarket}
                    onChange={(e) => setFormMarket(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Version Description & Objective
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this version was created, changes in logic, and expected outcomes..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Win Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="58.5"
                    value={formWinRate}
                    onChange={(e) => setFormWinRate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Profit Factor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.85"
                    value={formProfitFactor}
                    onChange={(e) => setFormProfitFactor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Max Drawdown (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.5"
                    value={formDrawdown}
                    onChange={(e) => setFormDrawdown(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Code / Commit Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. EA_Strategy_v1.3.mq5 (commit: a4c891)"
                  value={formCodeRef}
                  onChange={(e) => setFormCodeRef(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
