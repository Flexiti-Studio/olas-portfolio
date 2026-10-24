"use client";

import React, { useState, useMemo } from 'react';
import {
  AggregatedMetrics,
  VersionComparisonRow,
  RunLike,
  aggregateRuns,
  calculateTradeMetrics,
  compareVersions,
  evaluateStrategyVerdict,
} from '@/lib/ea-lab/metrics';
import { StrategyVerdict } from '@/lib/ea-lab/heuristics';
import { generateAiSummary } from '@/app/actions/eaLab';
import { formatLagosDateTimeDisplay } from '@/lib/ea-lab/timezone';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface AnalysisTabProps {
  strategyName: string;
  metrics: AggregatedMetrics;
  verdict: StrategyVerdict;
  versionComparisons: VersionComparisonRow[];
  pairBreakdowns: {
    symbol: string;
    runsCount: number;
    tradesCount: number;
    winRate: number;
    avgR: number;
    profitFactor: number;
    netProfit: number;
  }[];
  runs: RunLike[];
}

export function AnalysisTab({
  strategyName,
  metrics,
  verdict,
  versionComparisons,
  pairBreakdowns,
  runs,
}: AnalysisTabProps) {
  // Focus filter: selectedPair ('all' or specific pair symbol) and selectedRunId ('all' or specific runId)
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [isPairAccordionOpen, setIsPairAccordionOpen] = useState(false);
  const [isVerdictAccordionOpen, setIsVerdictAccordionOpen] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Chronologically sorted runs with numbering
  const numberedRuns = useMemo(() => {
    const sorted = [...runs].sort(
      (a, b) => new Date(a.testedAt || 0).getTime() - new Date(b.testedAt || 0).getTime()
    );
    return sorted.map((r, idx) => ({
      ...r,
      runNumber: idx + 1,
      testedAtDate: r.testedAt ? formatLagosDateTimeDisplay(r.testedAt) : 'Unknown date',
    }));
  }, [runs]);

  // Unique list of pairs with their runs (no duplicates)
  const pairGroups = useMemo(() => {
    const map = new Map<string, typeof numberedRuns>();
    numberedRuns.forEach((r) => {
      const sym = (r.symbol || 'UNKNOWN').trim();
      if (!map.has(sym)) {
        map.set(sym, []);
      }
      map.get(sym)!.push(r);
    });
    return Array.from(map.entries()).map(([symbol, runsList]) => ({
      symbol,
      runs: runsList,
      runsCount: runsList.length,
      netProfit: Number(runsList.reduce((acc, r) => acc + (r.netProfit || 0), 0).toFixed(2)),
    }));
  }, [numberedRuns]);

  // Runs filtered by selected pair
  const runsForSelectedPair = useMemo(() => {
    if (selectedPair === 'all') return numberedRuns;
    return numberedRuns.filter(
      (r) => (r.symbol || 'UNKNOWN').trim().toLowerCase() === selectedPair.trim().toLowerCase()
    );
  }, [numberedRuns, selectedPair]);

  const handlePairChange = (newPair: string) => {
    setSelectedPair(newPair);
    setSelectedRunId('all');
    setIsPairAccordionOpen(false);
  };

  const handleRunChange = (newRunId: string) => {
    setSelectedRunId(newRunId);
  };

  const isAllFocus = selectedPair === 'all' && selectedRunId === 'all';

  // Determine active runs based on pair and run focus
  const activeRuns = useMemo(() => {
    let result = numberedRuns;
    if (selectedPair !== 'all') {
      result = result.filter(
        (r) => (r.symbol || 'UNKNOWN').trim().toLowerCase() === selectedPair.trim().toLowerCase()
      );
    }
    if (selectedRunId !== 'all') {
      result = result.filter((r) => r.id === selectedRunId);
    }
    return result;
  }, [numberedRuns, selectedPair, selectedRunId]);

  // Dynamically compute metrics for the active focus
  const activeMetrics: AggregatedMetrics = useMemo(() => {
    if (isAllFocus) return metrics;
    return aggregateRuns(activeRuns);
  }, [activeRuns, isAllFocus, metrics]);

  // Dynamically compute verdict for the active focus
  const activeVerdict: StrategyVerdict = useMemo(() => {
    if (isAllFocus) return verdict;
    return evaluateStrategyVerdict(activeMetrics, activeRuns);
  }, [activeMetrics, activeRuns, isAllFocus, verdict]);

  // Dynamically compute pair breakdowns for active focus
  const activePairBreakdowns = useMemo(() => {
    if (isAllFocus) return pairBreakdowns;
    const symMap = new Map<string, RunLike[]>();
    activeRuns.forEach((r) => {
      const sym = r.symbol || 'UNKNOWN';
      if (!symMap.has(sym)) symMap.set(sym, []);
      symMap.get(sym)!.push(r);
    });

    return Array.from(symMap.entries()).map(([symbol, rList]) => {
      const m = aggregateRuns(rList);
      return {
        symbol,
        runsCount: rList.length,
        tradesCount: m.tradesCount,
        winRate: m.winRate,
        avgR: m.avgR,
        profitFactor: m.profitFactor,
        netProfit: m.netProfit,
      };
    });
  }, [activeRuns, isAllFocus, pairBreakdowns]);

  // Pair Edge Analysis: Doing Well vs Doing Worse
  const [pairFilter, setPairFilter] = useState<'all' | 'well' | 'worse'>('all');

  const rankedPairs = useMemo(() => {
    return [...activePairBreakdowns].sort((a, b) => {
      // Primary: Net Profit descending
      if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit;
      // Secondary: Expectancy (Avg R) descending
      if (b.avgR !== a.avgR) return b.avgR - a.avgR;
      // Tertiary: Win Rate descending
      return b.winRate - a.winRate;
    });
  }, [activePairBreakdowns]);

  const bestPair = useMemo(() => {
    if (rankedPairs.length === 0) return null;
    return rankedPairs[0];
  }, [rankedPairs]);

  const worstPair = useMemo(() => {
    if (rankedPairs.length <= 1) return null;
    return rankedPairs[rankedPairs.length - 1];
  }, [rankedPairs]);

  const doingWellPairs = useMemo(() => {
    return rankedPairs.filter((p) => p.netProfit > 0 || (p.avgR > 0 && p.winRate >= 50));
  }, [rankedPairs]);

  const doingWorsePairs = useMemo(() => {
    return rankedPairs.filter((p) => p.netProfit < 0 || p.avgR < 0 || (p.tradesCount > 0 && p.winRate < 45));
  }, [rankedPairs]);

  const filteredPairs = useMemo(() => {
    if (pairFilter === 'well') return doingWellPairs;
    if (pairFilter === 'worse') return doingWorsePairs;
    return rankedPairs;
  }, [pairFilter, doingWellPairs, doingWorsePairs, rankedPairs]);

  // Code Version lookup map
  const versionMap = useMemo(() => {
    const map = new Map<string, string>();
    versionComparisons.forEach((vc) => {
      if (vc.versionId) {
        map.set(vc.versionId, vc.label);
      }
    });
    return map;
  }, [versionComparisons]);

  // Run Duration & Period helper
  const formatRunDuration = (r: RunLike) => {
    let pFrom = r.periodFrom;
    let pTo = r.periodTo;
    if (!pFrom && r.trades && r.trades.length > 0) {
      pFrom = r.trades[0].openedAt;
      pTo = r.trades[r.trades.length - 1].closedAt || r.trades[r.trades.length - 1].openedAt;
    }

    if (pFrom && pTo) {
      const parseTime = (val: string | Date) => {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.getTime();
        return new Date(String(val).replace(/\./g, '-')).getTime();
      };
      const tStart = parseTime(pFrom);
      const tEnd = parseTime(pTo);

      if (!isNaN(tStart) && !isNaN(tEnd) && tEnd >= tStart) {
        const diffMs = tEnd - tStart;
        const totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        let durationLabel = '';

        if (totalDays === 1) {
          durationLabel = '1 Day';
        } else if (totalDays < 30) {
          durationLabel = `${totalDays} Days`;
        } else if (totalDays < 365) {
          const months = (totalDays / 30.4375).toFixed(1);
          const cleanMonths = months.endsWith('.0') ? Math.round(totalDays / 30.4375) : months;
          durationLabel = `${cleanMonths} Months`;
        } else {
          const years = (totalDays / 365.25).toFixed(1);
          const cleanYears = years.endsWith('.0') ? Math.round(totalDays / 365.25) : years;
          durationLabel = `${cleanYears} Years`;
        }

        const formatShort = (v: string | Date) => {
          if (typeof v === 'string') {
            return v.split(' ')[0].replace(/-/g, '.');
          }
          return v.toISOString().split('T')[0].replace(/-/g, '.');
        };
        const periodText = `${formatShort(pFrom)} → ${formatShort(pTo)}`;
        return { durationLabel, periodText, totalDays };
      }
    }

    return { durationLabel: 'Not specified', periodText: 'No date range', totalDays: 0 };
  };

  // Helper to safely extract stats for a single run
  const getRunStats = (r: typeof numberedRuns[0]) => {
    if (r.trades && r.trades.length > 0) {
      const tm = calculateTradeMetrics(r.trades, r.initialDeposit || 10000, r.finalBalance || 10000);
      return {
        netProfit: r.netProfit !== undefined ? r.netProfit : tm.netProfit,
        winRate: r.winRate !== undefined ? r.winRate : tm.winRate,
        avgR: r.avgR !== undefined ? r.avgR : tm.avgR,
        profitFactor: r.profitFactor !== undefined ? r.profitFactor : tm.profitFactor,
        tradesCount: r.tradesCount ?? tm.tradesCount,
        returnPct: r.returnPct ?? tm.returnPct,
      };
    }
    const netProfit = r.netProfit ?? Number(((r.finalBalance || 10000) - (r.initialDeposit || 10000)).toFixed(2));
    const returnPct = r.returnPct ?? ((r.initialDeposit || 10000) > 0 ? Number(((netProfit / (r.initialDeposit || 10000)) * 100).toFixed(2)) : 0);
    return {
      netProfit,
      winRate: r.winRate ?? 0,
      avgR: r.avgR ?? 0,
      profitFactor: r.profitFactor ?? 0,
      tradesCount: r.tradesCount ?? 0,
      returnPct,
    };
  };

  // Single-pair run-level analysis states & memos
  const [runFilter, setRunFilter] = useState<'all' | 'well' | 'worse'>('all');

  const rankedRunsForPair = useMemo(() => {
    return [...runsForSelectedPair].map((r) => {
      const stats = getRunStats(r);
      const duration = formatRunDuration(r);
      const versionLabel = (r.versionId && versionMap.get(r.versionId)) ? versionMap.get(r.versionId)! : 'v1';
      return {
        ...r,
        stats,
        duration,
        versionLabel,
      };
    }).sort((a, b) => {
      // Primary: Net Profit descending
      if (b.stats.netProfit !== a.stats.netProfit) return b.stats.netProfit - a.stats.netProfit;
      // Secondary: Avg R descending
      if (b.stats.avgR !== a.stats.avgR) return b.stats.avgR - a.stats.avgR;
      // Tertiary: Win Rate descending
      return b.stats.winRate - a.stats.winRate;
    });
  }, [runsForSelectedPair, versionMap]);

  const bestRunForPair = useMemo(() => {
    if (rankedRunsForPair.length === 0) return null;
    return rankedRunsForPair[0];
  }, [rankedRunsForPair]);

  const worstRunForPair = useMemo(() => {
    if (rankedRunsForPair.length <= 1) return null;
    return rankedRunsForPair[rankedRunsForPair.length - 1];
  }, [rankedRunsForPair]);

  const doingWellRunsForPair = useMemo(() => {
    return rankedRunsForPair.filter(
      (r) => r.stats.netProfit > 0 || (r.stats.avgR > 0 && r.stats.winRate >= 50)
    );
  }, [rankedRunsForPair]);

  const doingWorseRunsForPair = useMemo(() => {
    return rankedRunsForPair.filter(
      (r) => r.stats.netProfit < 0 || r.stats.avgR < 0 || (r.stats.tradesCount > 0 && r.stats.winRate < 45)
    );
  }, [rankedRunsForPair]);

  const filteredRunsForPair = useMemo(() => {
    if (runFilter === 'well') return doingWellRunsForPair;
    if (runFilter === 'worse') return doingWorseRunsForPair;
    return rankedRunsForPair;
  }, [runFilter, doingWellRunsForPair, doingWorseRunsForPair, rankedRunsForPair]);

  // Dynamically computed version comparisons for the active scope (selected pair or run)
  const activeVersionComparisons = useMemo(() => {
    if (isAllFocus) return versionComparisons;

    const targetRuns = selectedRunId !== 'all' ? activeRuns : runsForSelectedPair;
    const versionsWithFilteredRuns = versionComparisons.map((vc, idx) => {
      const vRuns = targetRuns.filter((r) => {
        if (r.versionId) return r.versionId === vc.versionId;
        return idx === 0; // attribute unassigned runs to first version
      });
      return {
        id: vc.versionId,
        label: vc.label,
        createdAt: vc.createdAt,
        testRuns: vRuns,
      };
    });

    const rawRows = compareVersions(versionsWithFilteredRuns);

    // Re-calculate deltas so they only compare against the previous tested version (runsCount > 0)
    let lastTestedRow: (typeof rawRows)[0] | null = null;
    return rawRows.map((row) => {
      if (row.runsCount === 0) {
        return {
          ...row,
          deltaWinRate: undefined,
          deltaAvgR: undefined,
          deltaProfitFactor: undefined,
          deltaNetProfit: undefined,
        };
      }
      const prev = lastTestedRow;
      lastTestedRow = row;
      if (!prev) {
        return {
          ...row,
          deltaWinRate: undefined,
          deltaAvgR: undefined,
          deltaProfitFactor: undefined,
          deltaNetProfit: undefined,
        };
      }
      return {
        ...row,
        deltaWinRate: Number((row.winRate - prev.winRate).toFixed(1)),
        deltaAvgR: Number((row.avgR - prev.avgR).toFixed(2)),
        deltaProfitFactor: Number((row.profitFactor - prev.profitFactor).toFixed(2)),
        deltaNetProfit: Number((row.netProfit - prev.netProfit).toFixed(2)),
      };
    });
  }, [isAllFocus, versionComparisons, activeRuns, runsForSelectedPair, selectedRunId]);

  const focusedPair = useMemo(() => {
    if (selectedPair === 'all') return null;
    return pairGroups.find(
      (p) => p.symbol.trim().toLowerCase() === selectedPair.trim().toLowerCase()
    ) || null;
  }, [pairGroups, selectedPair]);

  const focusedRun = useMemo(() => {
    if (selectedRunId === 'all') return null;
    return numberedRuns.find((r) => r.id === selectedRunId) || null;
  }, [numberedRuns, selectedRunId]);

  // Capital, Risk & Duration Profile for active focus
  const capitalProfile = useMemo(() => {
    const currency = focusedRun?.currency || activeRuns[0]?.currency || 'USD';
    const leverage = focusedRun?.leverage || activeRuns[0]?.leverage || '1:100';

    let initialDeposit = 0;
    let finalBalance = 0;
    let netProfit = 0;
    let returnPct = 0;

    if (focusedRun) {
      initialDeposit = focusedRun.initialDeposit || 10000;
      finalBalance = focusedRun.finalBalance || 10000;
      netProfit = focusedRun.netProfit ?? Number((finalBalance - initialDeposit).toFixed(2));
      returnPct = focusedRun.returnPct ?? (initialDeposit > 0 ? Number(((netProfit / initialDeposit) * 100).toFixed(2)) : 0);
    } else {
      // On All Runs: combine all account sizes across runs
      const sumDeposits = activeRuns.reduce((acc, r) => acc + (r.initialDeposit || 10000), 0);
      initialDeposit = sumDeposits > 0 ? sumDeposits : 10000;
      netProfit = activeMetrics.netProfit;
      finalBalance = Number((initialDeposit + netProfit).toFixed(2));
      returnPct = initialDeposit > 0 ? Number(((netProfit / initialDeposit) * 100).toFixed(2)) : 0;
    }

    // Risk per trade (% and $)
    let riskPct = 1.0;
    let riskAmount = (riskPct / 100) * initialDeposit;
    let riskModeDescription = '1.0% per trade';

    const targetRun = focusedRun || activeRuns[0];
    if (targetRun) {
      const inputs = typeof targetRun.inputsJson === 'string'
        ? JSON.parse(targetRun.inputsJson || '{}')
        : targetRun.inputsJson || {};
      const parsedPct = parseFloat(
        inputs['InpRiskPct'] ||
        inputs['RiskPercent'] ||
        inputs['InpRiskPercent'] ||
        inputs['InpRisk'] ||
        '1.0'
      );
      if (!isNaN(parsedPct) && parsedPct > 0) {
        riskPct = parsedPct;
      }
      riskAmount = Number(((riskPct / 100) * initialDeposit).toFixed(2));
      const useRiskPct = inputs['InpUseRiskPct'] !== 'false';
      if (!useRiskPct && inputs['InpFixedLot']) {
        riskModeDescription = `Fixed Lot (${inputs['InpFixedLot']})`;
      } else {
        riskModeDescription = `${riskPct}% of account`;
      }
    }

    // Period calculation (Days, Months, Years)
    let pFrom: string | Date | undefined;
    let pTo: string | Date | undefined;

    if (focusedRun) {
      pFrom = focusedRun.periodFrom || undefined;
      pTo = focusedRun.periodTo || undefined;
      if (!pFrom && focusedRun.trades && focusedRun.trades.length > 0) {
        pFrom = focusedRun.trades[0].openedAt || undefined;
        pTo = focusedRun.trades[focusedRun.trades.length - 1].closedAt || focusedRun.trades[focusedRun.trades.length - 1].openedAt || undefined;
      }
    } else {
      const allFroms: number[] = [];
      const allTos: number[] = [];
      activeRuns.forEach((r) => {
        if (r.periodFrom) {
          const t = new Date(String(r.periodFrom).replace(/\./g, '-')).getTime();
          if (!isNaN(t)) allFroms.push(t);
        }
        if (r.periodTo) {
          const t = new Date(String(r.periodTo).replace(/\./g, '-')).getTime();
          if (!isNaN(t)) allTos.push(t);
        }
        if (r.trades && r.trades.length > 0) {
          r.trades.forEach((tr) => {
            if (tr.openedAt) {
              const t = new Date(String(tr.openedAt).replace(/\./g, '-')).getTime();
              if (!isNaN(t)) allFroms.push(t);
            }
            if (tr.closedAt) {
              const t = new Date(String(tr.closedAt).replace(/\./g, '-')).getTime();
              if (!isNaN(t)) allTos.push(t);
            }
          });
        }
      });
      if (allFroms.length > 0) pFrom = new Date(Math.min(...allFroms));
      if (allTos.length > 0) pTo = new Date(Math.max(...allTos));
    }

    let durationLabel = 'Not specified';
    let durationSubtext = 'No date range in log';
    let durationBadge = '';

    if (pFrom && pTo) {
      const parseTime = (val: string | Date) => {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.getTime();
        return new Date(String(val).replace(/\./g, '-')).getTime();
      };
      const tStart = parseTime(pFrom);
      const tEnd = parseTime(pTo);

      if (!isNaN(tStart) && !isNaN(tEnd) && tEnd >= tStart) {
        const diffMs = tEnd - tStart;
        const totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

        if (totalDays === 1) {
          durationLabel = '1 Day';
          durationBadge = '1 Day (Intraday)';
        } else if (totalDays < 30) {
          durationLabel = `${totalDays} Days`;
          durationBadge = `${totalDays} Days`;
        } else if (totalDays < 365) {
          const months = (totalDays / 30.4375).toFixed(1);
          const cleanMonths = months.endsWith('.0') ? Math.round(totalDays / 30.4375) : months;
          durationLabel = `${cleanMonths} Months`;
          durationBadge = `${totalDays} Days`;
        } else {
          const years = (totalDays / 365.25).toFixed(1);
          const cleanYears = years.endsWith('.0') ? Math.round(totalDays / 365.25) : years;
          durationLabel = `${cleanYears} Years`;
          durationBadge = `${totalDays} Days`;
        }

        const formatShort = (v: string | Date) => {
          if (typeof v === 'string') {
            return v.split(' ')[0].replace(/-/g, '.');
          }
          return v.toISOString().split('T')[0].replace(/-/g, '.');
        };
        durationSubtext = `${formatShort(pFrom)} → ${formatShort(pTo)}`;
      }
    }

    return {
      currency,
      leverage,
      initialDeposit,
      finalBalance,
      netProfit,
      returnPct,
      riskPct,
      riskAmount,
      riskModeDescription,
      durationLabel,
      durationSubtext,
      durationBadge,
    };
  }, [focusedRun, activeRuns, activeMetrics]);

  async function handleGenerateAiSummary() {
    setIsGeneratingAi(true);
    const journals = activeRuns
      .map((r) => r.journal)
      .filter((j): j is string => Boolean(j && j.trim()));

    const titlePrefix = focusedRun
      ? `${strategyName} (Run #${focusedRun.runNumber}: ${focusedRun.symbol})`
      : focusedPair
      ? `${strategyName} (${focusedPair.symbol} · ${focusedPair.runsCount} Runs)`
      : strategyName;

    const res = await generateAiSummary({
      strategyName: titlePrefix,
      stats: {
        focusScope: focusedRun
          ? `Run #${focusedRun.runNumber} (${focusedRun.symbol})`
          : focusedPair
          ? `Pair: ${focusedPair.symbol} (${focusedPair.runsCount} runs)`
          : 'All Backtests',
        tradesCount: activeMetrics.tradesCount,
        winRate: activeMetrics.winRate,
        netProfit: activeMetrics.netProfit,
        returnPct: activeMetrics.returnPct,
        profitFactor: activeMetrics.profitFactor,
        avgR: activeMetrics.avgR,
        maxDrawdownR: activeMetrics.maxDrawdownR,
        maxConsecLosses: activeMetrics.maxConsecLosses,
        bestTradeR: activeMetrics.bestTradeR,
        worstTradeR: activeMetrics.worstTradeR,
        pairsTested: activePairBreakdowns.map((p) => p.symbol),
      },
      journals,
      warnings: activeVerdict.warnings,
      verdict: activeVerdict.verdict,
    });

    setIsGeneratingAi(false);
    if (res.success && res.summary) {
      setAiSummary(res.summary);
    }
  }

  // Verdict style mapping
  const verdictConfig = {
    Promising: {
      bg: 'bg-emerald-950/40 border-emerald-800/80',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-600/40',
      icon: 'check_circle',
      textColor: 'text-emerald-300',
    },
    'Needs work': {
      bg: 'bg-amber-950/40 border-amber-800/80',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-600/40',
      icon: 'tune',
      textColor: 'text-amber-300',
    },
    'Not enough data': {
      bg: 'bg-zinc-900/60 border-zinc-800',
      badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      icon: 'hourglass_empty',
      textColor: 'text-zinc-300',
    },
  }[activeVerdict.verdict] || {
    bg: 'bg-zinc-900 border-zinc-800',
    badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    icon: 'help',
    textColor: 'text-zinc-300',
  };

  // Exit reason chart data
  const exitData = [
    { name: 'Take Profit (TP)', count: activeMetrics.exitSplit.TP, fill: '#10b981' },
    { name: 'Stop Loss (SL)', count: activeMetrics.exitSplit.SL, fill: '#f43f5e' },
    { name: 'End of Test', count: activeMetrics.exitSplit.END_OF_TEST, fill: '#64748b' },
    { name: 'Other', count: activeMetrics.exitSplit.OTHER, fill: '#a855f7' },
  ].filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Focus Scope Toolbar (Select specific pair and/or run vs All runs) */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-400 text-lg">filter_alt</span>
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Analysis Focus Scope</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {isAllFocus
                  ? `All Backtests (${numberedRuns.length} runs)`
                  : focusedRun
                  ? `Run #${focusedRun.runNumber} · ${focusedRun.symbol} (${focusedRun.timeframe || 'H1'})`
                  : `Pair: ${focusedPair?.symbol} (${focusedPair?.runsCount} runs combined)`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Filter analysis by pair or isolate a specific backtest run to inspect its R curve and statistics.
            </p>
          </div>
        </div>

        {/* Dropdowns in toolbar */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Pair Dropdown: Each unique pair shown once */}
          <div className="relative">
            <select
              value={selectedPair}
              onChange={(e) => handlePairChange(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white text-xs rounded-xl pl-8 pr-9 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"
              title="Select pair to analyze"
            >
              <option value="all">🌐 All Pairs ({pairGroups.length} pairs · {numberedRuns.length} runs)</option>
              {pairGroups.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.symbol} ({p.runsCount} test{p.runsCount > 1 ? 's' : ''})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-purple-400 text-base absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              currency_exchange
            </span>
            <span className="material-symbols-outlined text-zinc-400 text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>

          {/* Test Run Dropdown: Always rendered as a select dropdown */}
          <div className="relative">
            <select
              value={selectedRunId}
              onChange={(e) => handleRunChange(e.target.value)}
              className="appearance-none bg-zinc-900 border border-blue-600/70 hover:border-blue-400 text-white text-xs rounded-xl pl-8 pr-9 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm transition-colors"
              title={selectedPair !== 'all' ? `Select test run for ${selectedPair}` : 'Select test run to analyze'}
            >
              {selectedPair !== 'all' ? (
                <>
                  <option value="all">
                    ⚡ All {selectedPair} Tests ({runsForSelectedPair.length} run{runsForSelectedPair.length !== 1 ? 's' : ''} combined)
                  </option>
                  {runsForSelectedPair.map((r) => {
                    const profit = r.netProfit ?? 0;
                    return (
                      <option key={r.id || `run-${r.runNumber}`} value={r.id || ''}>
                        Run #{r.runNumber}: {r.timeframe || 'H1'} · {r.testedAtDate} · {profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`} ({r.trades?.length || 0} trades)
                      </option>
                    );
                  })}
                </>
              ) : (
                <>
                  <option value="all">⚡ All Backtests ({numberedRuns.length} runs aggregate)</option>
                  {numberedRuns.map((r) => {
                    const profit = r.netProfit ?? 0;
                    return (
                      <option key={r.id || `run-${r.runNumber}`} value={r.id || ''}>
                        Run #{r.runNumber}: {r.symbol} ({r.timeframe || 'H1'}) · {profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
            <span className="material-symbols-outlined text-blue-400 text-base absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              science
            </span>
            <span className="material-symbols-outlined text-zinc-400 text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>

          {/* Reset button */}
          {!isAllFocus && (
            <button
              onClick={() => {
                setSelectedPair('all');
                setSelectedRunId('all');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset to All Pairs & Runs"
            >
              <span className="material-symbols-outlined text-sm">clear_all</span>
              Show All
            </button>
          )}
        </div>
      </div>

      {/* Focused Pair Context Banner (Accordion #1) */}
      {!focusedRun && selectedPair !== 'all' && focusedPair && (
        <div className="rounded-2xl bg-zinc-950 border border-purple-800/60 overflow-hidden shadow-lg transition-all animate-in fade-in duration-200">
          {/* Clickable Accordion Header Bar */}
          <div
            onClick={() => setIsPairAccordionOpen(!isPairAccordionOpen)}
            className="p-4 bg-purple-950/25 hover:bg-purple-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">currency_exchange</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  Focused on Pair: <span className="text-purple-300 font-mono">{focusedPair.symbol}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[11px] border border-purple-700/50">
                  {focusedPair.runsCount} Test Run{focusedPair.runsCount > 1 ? 's' : ''} Combined
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800">
                  {activeMetrics.tradesCount} Trades · {activeMetrics.winRate}% Win Rate · Avg R: {activeMetrics.avgR > 0 ? '+' : ''}{activeMetrics.avgR}R
                </span>
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${activeMetrics.netProfit >= 0 ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border-rose-800/60'}`}>
                  {activeMetrics.netProfit >= 0 ? `+$${activeMetrics.netProfit}` : `-$${Math.abs(activeMetrics.netProfit)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPair('all');
                  setSelectedRunId('all');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-medium px-2 py-1 cursor-pointer"
              >
                Show All Pairs
              </button>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span>{isPairAccordionOpen ? 'Hide Details' : 'View Details'}</span>
                <span
                  className={`material-symbols-outlined text-base text-zinc-400 transition-transform duration-300 ${
                    isPairAccordionOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Accordion Body */}
          {isPairAccordionOpen && (
            <div className="p-5 border-t border-purple-900/40 bg-zinc-950 space-y-4 animate-in fade-in duration-200">
              {/* Aggregated Stats Strip */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 text-zinc-300 text-xs flex-wrap">
                  <span>Combined Profit: <strong className={`font-mono font-bold ${activeMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeMetrics.netProfit >= 0 ? `+$${activeMetrics.netProfit}` : `-$${Math.abs(activeMetrics.netProfit)}`}
                  </strong></span>
                  <span className="text-zinc-600">·</span>
                  <span>Profit Factor: <strong className="font-mono text-white">{activeMetrics.profitFactor}</strong></span>
                  <span className="text-zinc-600">·</span>
                  <span>Max Drawdown: <strong className="font-mono text-rose-400">-{activeMetrics.maxDrawdownR}R</strong></span>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  {focusedPair.runsCount > 1
                    ? 'Showing aggregated statistics for this instrument. Use the Test Run dropdown above to focus on a specific run.'
                    : 'Single test run recorded for this pair.'}
                </div>
              </div>

              {/* Quick Run Breakdown Chips for this Pair */}
              {runsForSelectedPair.length > 1 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Executed Runs for {focusedPair.symbol} ({runsForSelectedPair.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {runsForSelectedPair.map((r) => {
                      const profit = r.netProfit ?? 0;
                      return (
                        <button
                          key={r.id || `run-card-${r.runNumber}`}
                          type="button"
                          onClick={() => setSelectedRunId(r.id || '')}
                          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold">
                            <span className="text-white group-hover:text-blue-400">Run #{r.runNumber}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{r.timeframe || 'H1'}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                            <span className="text-zinc-400">{r.trades?.length || 0} trades</span>
                            <span className={profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Focused Run Context Banner when focusing on a single log */}
      {focusedRun && (
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-400 text-xl shrink-0 mt-0.5">center_focus_strong</span>
            <div>
              <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Focused on Run #{focusedRun.runNumber}</span>
                <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono text-[11px] border border-blue-700/50">
                  {focusedRun.symbol} · {focusedRun.timeframe}
                </span>
                <span className="text-zinc-400 text-[11px] font-normal">
                  Tested: {focusedRun.testedAtDate}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 font-mono text-[11px] border border-purple-800/50">
                  {capitalProfile.durationLabel} ({capitalProfile.durationSubtext})
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-zinc-300 text-[11px] flex-wrap">
                <span>Deposit: <strong className="font-mono text-white">{capitalProfile.currency} {capitalProfile.initialDeposit.toLocaleString()}</strong></span>
                <span className="text-zinc-600">·</span>
                <span>Final Balance: <strong className="font-mono text-white">{capitalProfile.currency} {capitalProfile.finalBalance.toLocaleString()}</strong></span>
                <span className="text-zinc-600">·</span>
                <span>Risk: <strong className="font-mono text-amber-300">{capitalProfile.riskPct}% ({capitalProfile.currency} {capitalProfile.riskAmount})</strong></span>
              </div>
              {focusedRun.journal ? (
                <div className="mt-1.5 text-zinc-300 italic text-[11px]">
                  &ldquo;{focusedRun.journal}&rdquo;
                </div>
              ) : (
                <div className="mt-1 text-zinc-500 text-[11px]">No journal notes for this test run.</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 uppercase font-mono">Run Profit &amp; Return</div>
              <div className={`font-mono font-bold text-sm ${capitalProfile.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {capitalProfile.netProfit >= 0 ? `+$${capitalProfile.netProfit}` : `-$${Math.abs(capitalProfile.netProfit)}`}
                <span className="text-xs font-normal ml-1">
                  ({capitalProfile.returnPct >= 0 ? `+${capitalProfile.returnPct}%` : `${capitalProfile.returnPct}%`})
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedPair('all');
                setSelectedRunId('all');
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
            >
              Switch to All
            </button>
          </div>
        </div>
      )}

      {/* Strategy Verdict & Heuristic Diagnostics (Accordion #2) */}
      <div className={`rounded-2xl border ${verdictConfig.bg} backdrop-blur-sm overflow-hidden shadow-lg transition-all animate-in fade-in duration-200`}>
        {/* Clickable Accordion Header Bar */}
        <div
          onClick={() => setIsVerdictAccordionOpen(!isVerdictAccordionOpen)}
          className="p-4 bg-zinc-950/40 hover:bg-zinc-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`p-2 rounded-xl border ${verdictConfig.badge} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-lg">{verdictConfig.icon}</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${verdictConfig.badge} flex items-center gap-1.5`}>
                Verdict: {activeVerdict.verdict}
              </span>
              <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900/80 px-2.5 py-0.5 rounded border border-zinc-800">
                {focusedPair
                  ? `Pair: ${focusedPair.symbol} (${focusedPair.runsCount} Runs Combined)`
                  : focusedRun
                  ? `Run #${focusedRun.runNumber} (${focusedRun.symbol}) Isolated`
                  : `All Backtests (${numberedRuns.length} Runs Aggregate)`}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/80">
                {activeVerdict.reasons.length} criteria evaluated
              </span>
              {activeVerdict.warnings.length > 0 && (
                <span className="text-[11px] font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-400">warning</span>
                  {activeVerdict.warnings.length} warning{activeVerdict.warnings.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <span>{isVerdictAccordionOpen ? 'Hide Details' : 'View Verdict Details'}</span>
              <span
                className={`material-symbols-outlined text-base text-zinc-400 transition-transform duration-300 ${
                  isVerdictAccordionOpen ? 'rotate-180' : 'rotate-0'
                }`}
              >
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Accordion Body */}
        {isVerdictAccordionOpen && (
          <div className="p-5 border-t border-zinc-800/80 bg-zinc-950/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Quantitative Criteria &amp; Rules
                </div>
                <div className="space-y-1.5">
                  {activeVerdict.reasons.map((reason, idx) => (
                    <div key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                      <span className="text-zinc-500 font-mono">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={isGeneratingAi}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-sm ${isGeneratingAi ? 'animate-spin' : ''}`}>
                    {isGeneratingAi ? 'progress_activity' : 'psychology'}
                  </span>
                  {isGeneratingAi
                    ? 'Analyzing...'
                    : focusedRun
                    ? `AI Summary for Run #${focusedRun.runNumber}`
                    : focusedPair
                    ? `AI Summary for ${focusedPair.symbol}`
                    : 'Generate AI Summary'}
                </button>
                <span className="text-[10px] text-zinc-500 text-right">
                  Stats &amp; journals only (no raw code sent)
                </span>
              </div>
            </div>

            {/* Mandatory Heuristic Warnings */}
            {activeVerdict.warnings.length > 0 && (
              <div className="pt-3.5 border-t border-zinc-800/80 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Active Backtest Heuristic Warnings:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeVerdict.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200/90 text-xs flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-amber-400 text-sm mt-0.5 shrink-0">info</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Summary Card if generated */}
      {aiSummary && (
        <div className="p-6 rounded-2xl bg-zinc-950 border border-blue-900/40 shadow-2xl relative">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-xl">auto_awesome</span>
              <h4 className="text-sm font-bold text-white">AI Quantitative Verdict & Optimization Notes</h4>
            </div>
            <button
              onClick={() => setAiSummary(null)}
              className="text-zinc-500 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {aiSummary}
          </div>
        </div>
      )}

      {/* 2. Capital, Profit, Risk & Duration Profile Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trading Capital / Full Balance */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-400 text-base">account_balance_wallet</span>
              Trading Balance
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
              Lev: {capitalProfile.leverage}
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {capitalProfile.currency} {capitalProfile.finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {focusedRun ? 'Full account balance after test run' : `Combined balance across ${activeRuns.length} test runs`}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{focusedRun ? 'Starting Deposit:' : 'Combined Initial Deposit:'}</span>
            <span className="font-mono text-zinc-300 font-semibold">
              {capitalProfile.currency} {capitalProfile.initialDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Profit Made & % Against Balance */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-400 text-base">payments</span>
              Profit Made
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                capitalProfile.netProfit >= 0
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
              }`}
            >
              {capitalProfile.returnPct >= 0 ? `+${capitalProfile.returnPct}%` : `${capitalProfile.returnPct}%`} on Capital
            </span>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono ${
                capitalProfile.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {capitalProfile.netProfit >= 0
                ? `+$${capitalProfile.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-$${Math.abs(capitalProfile.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Net P/L across {activeMetrics.tradesCount} executed trades
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Return on Balance:</span>
            <span
              className={`font-mono font-bold ${
                capitalProfile.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {capitalProfile.returnPct >= 0 ? `+${capitalProfile.returnPct}%` : `${capitalProfile.returnPct}%`}
            </span>
          </div>
        </div>

        {/* Risk Per Trade & % of Account Size */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-base">shield</span>
              Risk Per Trade
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-300 border border-amber-800/50">
              {capitalProfile.riskModeDescription}
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1.5">
              <span>{capitalProfile.riskPct}%</span>
              <span className="text-xs font-normal text-zinc-400 font-sans">of account size</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Configured risk allocation per setup
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Max Dollar Risk:</span>
            <span className="font-mono text-amber-300 font-semibold">
              {capitalProfile.currency} {capitalProfile.riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / trade
            </span>
          </div>
        </div>

        {/* Period Trade Ran For (Days, Months, Years) */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-purple-400 text-base">calendar_month</span>
              Backtest Duration
            </span>
            {capitalProfile.durationBadge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/40 text-purple-300 border border-purple-800/50">
                {capitalProfile.durationBadge}
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-2">
              <span>{capitalProfile.durationLabel}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Time period evaluated in tester
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Period Range:</span>
            <span className="font-mono text-zinc-300 font-medium truncate ml-1 text-[11px]">
              {capitalProfile.durationSubtext}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Key Quantitative Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Net Profit</div>
          <div
            className={`text-xl font-bold mt-1 ${
              capitalProfile.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {capitalProfile.netProfit >= 0 ? `+$${capitalProfile.netProfit}` : `-$${Math.abs(capitalProfile.netProfit)}`}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Return: {capitalProfile.returnPct}%</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Win Rate</div>
          <div className="text-xl font-bold text-white mt-1">{activeMetrics.winRate}%</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {activeMetrics.winCount}W / {activeMetrics.lossCount}L
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Expectancy (Avg R)</div>
          <div
            className={`text-xl font-bold mt-1 ${
              activeMetrics.avgR > 0 ? 'text-emerald-400' : activeMetrics.avgR < 0 ? 'text-rose-400' : 'text-zinc-300'
            }`}
          >
            {activeMetrics.avgR > 0 ? `+${activeMetrics.avgR}R` : `${activeMetrics.avgR}R`}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Total: {activeMetrics.totalR}R</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Profit Factor</div>
          <div
            className={`text-xl font-bold mt-1 ${
              activeMetrics.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {activeMetrics.profitFactor > 0 ? activeMetrics.profitFactor : '0.00'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Benchmark: &gt; 1.3</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Max Drawdown</div>
          <div className="text-xl font-bold text-rose-400 mt-1">-{activeMetrics.maxDrawdownR}R</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">From cumulative peak</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-semibold text-zinc-400">Consecutive Losses</div>
          <div className="text-xl font-bold text-zinc-200 mt-1">{activeMetrics.maxConsecLosses}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Max losing streak</div>
        </div>
      </div>

      {/* 3. Cumulative R Chart */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-lg">stacked_line_chart</span>
              {focusedRun
                ? `Cumulative R Curve: Run #${focusedRun.runNumber} (${focusedRun.symbol} · ${focusedRun.timeframe || 'H1'})`
                : focusedPair
                ? `Cumulative R Curve: ${focusedPair.symbol} (${focusedPair.runsCount} Tests Combined)`
                : 'Cumulative R-Multiple Curve Across All Backtests'}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sequence of trade outcomes evaluated strictly by standardized risk-to-reward (R)
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
            {activeMetrics.tradesCount} Trades Evaluated
          </div>
        </div>

        {activeMetrics.cumulativeRCurve.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeMetrics.cumulativeRCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="index" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit="R" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}R`, 'Cumulative R']}
                  labelFormatter={(idx) => `Trade #${idx}`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeR"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#rGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-zinc-500 text-xs">
            No trade data available for this focus scope.
          </div>
        )}
      </div>

      {/* 4. Comparative Edge Analysis: Pair Edge (All Pairs) OR Run Edge (Single Pair Focus) */}
      {selectedPair !== 'all' ? (
        /* SINGLE PAIR FOCUS: Run Performance & Edge Analysis */
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-lg">currency_exchange</span>
                Run Performance &amp; Edge Analysis: <span className="text-purple-300 font-mono">{selectedPair}</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Run-by-run quantitative breakdown for {selectedPair} — evaluate which test runs performed well, which EA code version was used, and backtest duration.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                {runsForSelectedPair.length} Run{runsForSelectedPair.length !== 1 ? 's' : ''} on {selectedPair}
              </span>
              {selectedRunId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedRunId('all')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="View all runs combined for this pair"
                >
                  <span className="material-symbols-outlined text-xs">clear_all</span>
                  Show All {selectedPair}
                </button>
              )}
            </div>
          </div>

          {/* Best Performing Run vs Worst Performing Run Spotlight Cards */}
          {rankedRunsForPair.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BEST PERFORMING RUN ("Doing Well") */}
              {bestRunForPair && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/25 via-zinc-950 to-zinc-950 border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-950/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">workspace_premium</span>
                      </span>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span>Doing Well</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>• Top Run</span>
                        </div>
                        <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                          Run #{bestRunForPair.runNumber}
                          <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                            Rank #1
                          </span>
                          <span className="text-xs font-normal text-zinc-400 font-sans">
                            ({bestRunForPair.timeframe || 'H1'})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-extrabold font-mono ${bestRunForPair.stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {bestRunForPair.stats.netProfit >= 0
                          ? `+$${bestRunForPair.stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `-$${Math.abs(bestRunForPair.stats.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {bestRunForPair.stats.returnPct !== 0 ? `Return: ${bestRunForPair.stats.returnPct > 0 ? '+' : ''}${bestRunForPair.stats.returnPct}%` : 'Net Profit Generated'}
                      </div>
                    </div>
                  </div>

                  {/* Version & Duration Info Strip */}
                  <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-300 border border-purple-800/60 flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="material-symbols-outlined text-xs text-purple-400">code</span>
                      <span>Version: <strong className="text-purple-200">{bestRunForPair.versionLabel}</strong></span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-zinc-900/80 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="material-symbols-outlined text-xs text-blue-400">schedule</span>
                      <span>Duration: <strong className="text-white">{bestRunForPair.duration.durationLabel}</strong></span>
                      <span className="text-zinc-500">({bestRunForPair.duration.periodText})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80">
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</div>
                      <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{bestRunForPair.stats.winRate}%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg R</div>
                      <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                        {bestRunForPair.stats.avgR > 0 ? `+${bestRunForPair.stats.avgR}R` : `${bestRunForPair.stats.avgR}R`}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit Factor</div>
                      <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">
                        {bestRunForPair.stats.profitFactor > 0 ? bestRunForPair.stats.profitFactor : 'N/A'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trades</div>
                      <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">{bestRunForPair.stats.tradesCount}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-800/40 flex-1 min-w-[200px]">
                      <span className="material-symbols-outlined text-xs text-emerald-400 shrink-0">verified</span>
                      <span>
                        {bestRunForPair.stats.netProfit > 0
                          ? `Highest statistical edge on ${selectedPair} using ${bestRunForPair.versionLabel} tested for ${bestRunForPair.duration.durationLabel}. Recommended candidate for forward testing.`
                          : `Best performance recorded on ${selectedPair}.`}
                      </span>
                    </div>
                    {selectedRunId !== bestRunForPair.id && (
                      <button
                        type="button"
                        onClick={() => handleRunChange(bestRunForPair.id || '')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        title="Isolate this test run"
                      >
                        <span className="material-symbols-outlined text-xs">visibility</span>
                        Focus Run #{bestRunForPair.runNumber}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* WORST PERFORMING RUN ("Doing Worse") */}
              {worstRunForPair && rankedRunsForPair.length > 1 ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/25 via-zinc-950 to-zinc-950 border border-rose-500/30 relative overflow-hidden shadow-lg shadow-rose-950/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">trending_down</span>
                      </span>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5">
                          <span>Doing Worse</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                          <span>• Underperforming</span>
                        </div>
                        <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                          Run #{worstRunForPair.runNumber}
                          <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                            Rank #{rankedRunsForPair.length}
                          </span>
                          <span className="text-xs font-normal text-zinc-400 font-sans">
                            ({worstRunForPair.timeframe || 'H1'})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-extrabold font-mono ${worstRunForPair.stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {worstRunForPair.stats.netProfit >= 0
                          ? `+$${worstRunForPair.stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `-$${Math.abs(worstRunForPair.stats.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[10px] text-zinc-400">Net Profit / Drag</div>
                    </div>
                  </div>

                  {/* Version & Duration Info Strip */}
                  <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-300 border border-purple-800/60 flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="material-symbols-outlined text-xs text-purple-400">code</span>
                      <span>Version: <strong className="text-purple-200">{worstRunForPair.versionLabel}</strong></span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-zinc-900/80 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="material-symbols-outlined text-xs text-blue-400">schedule</span>
                      <span>Duration: <strong className="text-white">{worstRunForPair.duration.durationLabel}</strong></span>
                      <span className="text-zinc-500">({worstRunForPair.duration.periodText})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80">
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</div>
                      <div className={`text-sm font-bold font-mono mt-0.5 ${worstRunForPair.stats.winRate < 50 ? 'text-rose-400' : 'text-zinc-200'}`}>
                        {worstRunForPair.stats.winRate}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg R</div>
                      <div className={`text-sm font-bold font-mono mt-0.5 ${worstRunForPair.stats.avgR < 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                        {worstRunForPair.stats.avgR > 0 ? `+${worstRunForPair.stats.avgR}R` : `${worstRunForPair.stats.avgR}R`}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit Factor</div>
                      <div className={`text-sm font-bold font-mono mt-0.5 ${worstRunForPair.stats.profitFactor < 1.0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                        {worstRunForPair.stats.profitFactor > 0 ? worstRunForPair.stats.profitFactor : '0.00'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trades</div>
                      <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">{worstRunForPair.stats.tradesCount}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px] text-rose-300/90 bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-800/40 flex-1 min-w-[200px]">
                      <span className="material-symbols-outlined text-xs text-rose-400 shrink-0">warning</span>
                      <span>
                        {worstRunForPair.stats.netProfit < 0
                          ? `Generated capital drag on ${selectedPair} using ${worstRunForPair.versionLabel} tested for ${worstRunForPair.duration.durationLabel}. Review exit rules or logic changes.`
                          : `Lowest return among runs tested on ${selectedPair}.`}
                      </span>
                    </div>
                    {selectedRunId !== worstRunForPair.id && (
                      <button
                        type="button"
                        onClick={() => handleRunChange(worstRunForPair.id || '')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        title="Isolate this test run"
                      >
                        <span className="material-symbols-outlined text-xs">visibility</span>
                        Focus Run #{worstRunForPair.runNumber}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-blue-400 text-3xl mb-1.5">tune</span>
                  <div className="text-xs font-bold text-white">Single Test Run on {selectedPair}</div>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                    Only 1 backtest run (Run #{bestRunForPair?.runNumber}) has been recorded for {selectedPair}. Import or run additional tests to compare EA code versions (v1 vs v2) and durations side-by-side.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 1. Full-Width Run Edge Leaderboard */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-zinc-800/80">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-xl">leaderboard</span>
                  Run Edge Leaderboard: <span className="font-mono text-purple-300">{selectedPair}</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Side-by-side performance comparison of all test runs executed on {selectedPair} across code versions and timeframes.
                </p>
              </div>

              {/* Filter Pills: All, Doing Well, Doing Worse */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRunFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    runFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({rankedRunsForPair.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRunFilter('well')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    runFilter === 'well' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm font-semibold' : 'text-zinc-400 hover:text-emerald-400'
                  }`}
                >
                  <span>Doing Well</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">{doingWellRunsForPair.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRunFilter('worse')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    runFilter === 'worse' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm font-semibold' : 'text-zinc-400 hover:text-rose-400'
                  }`}
                >
                  <span>Doing Worse</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-mono">{doingWorseRunsForPair.length}</span>
                </button>
              </div>
            </div>

            {filteredRunsForPair.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[860px]">
                  <thead className="text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="pb-3 px-3">Run &amp; Timeframe</th>
                      <th className="pb-3 px-3">EA Version</th>
                      <th className="pb-3 px-3">Duration &amp; Period</th>
                      <th className="pb-3 px-3">Edge Status</th>
                      <th className="pb-3 px-3">Win Rate</th>
                      <th className="pb-3 px-3">Avg R</th>
                      <th className="pb-3 px-3">Profit Factor</th>
                      <th className="pb-3 px-3 text-right">Net Profit</th>
                      <th className="pb-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredRunsForPair.map((r) => {
                      const isBest = r.id === bestRunForPair?.id && rankedRunsForPair.length > 1;
                      const isWorst = r.id === worstRunForPair?.id && rankedRunsForPair.length > 1;
                      const rankIndex = rankedRunsForPair.findIndex((rp) => rp.id === r.id) + 1;
                      const isFocused = selectedRunId === r.id;

                      return (
                        <tr key={r.id || `run-${r.runNumber}`} className={`transition-colors ${isFocused ? 'bg-blue-950/30 ring-1 ring-inset ring-blue-500/40' : 'hover:bg-zinc-900/40'}`}>
                          <td className="py-3.5 px-3 font-sans">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-zinc-500 w-5">
                                #{rankIndex}
                              </span>
                              <div>
                                <span className="font-bold text-white text-sm font-mono">Run #{r.runNumber}</span>
                                <span className="text-[11px] text-zinc-400 font-sans block">{r.timeframe || 'H1'} · {r.testedAtDate}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-800/60 inline-flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs">code</span>
                              {r.versionLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="text-zinc-200 font-semibold text-xs">{r.duration.durationLabel}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[160px]" title={r.duration.periodText}>
                              {r.duration.periodText}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            {isBest ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                Best Run
                              </span>
                            ) : isWorst ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span className="material-symbols-outlined text-xs">trending_down</span>
                                Worst Run
                              </span>
                            ) : r.stats.netProfit > 0 || (r.stats.avgR > 0 && r.stats.winRate >= 50) ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-emerald-950/40 text-emerald-400/90 border border-emerald-800/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Doing Well
                              </span>
                            ) : r.stats.netProfit < 0 || r.stats.avgR < 0 ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-rose-950/40 text-rose-400/90 border border-rose-800/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span className="material-symbols-outlined text-xs">warning</span>
                                Doing Worse
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 whitespace-nowrap">
                                Neutral
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`text-sm font-bold ${r.stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {r.stats.winRate}%
                            </span>
                            <span className="text-[10px] text-zinc-500 block">{r.stats.tradesCount} trades</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`text-sm font-bold ${r.stats.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {r.stats.avgR > 0 ? `+${r.stats.avgR}R` : `${r.stats.avgR}R`}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`text-sm font-bold ${r.stats.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                              {r.stats.profitFactor > 0 ? r.stats.profitFactor : '0.00'}
                            </span>
                          </td>
                          <td className={`py-3.5 px-3 text-right font-bold text-sm ${r.stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.stats.netProfit >= 0
                              ? `+$${r.stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `-$${Math.abs(r.stats.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-3.5 px-3 text-right font-sans">
                            {isFocused ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white inline-flex items-center gap-1.5 shadow-sm">
                                <span className="material-symbols-outlined text-xs">visibility</span>
                                Focused
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRunChange(r.id || '')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                                title="Isolate this test run"
                              >
                                <span className="material-symbols-outlined text-xs">filter_center_focus</span>
                                Isolate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-8 text-center">
                No test runs found matching the &ldquo;{runFilter}&rdquo; filter.
              </div>
            )}
          </div>

          {/* 2. Diagnostics & Exit Splits (Spacious card below leaderboard) */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">flaky</span>
                Diagnostics &amp; Exits Breakdown: <span className="font-mono text-amber-300">{selectedPair}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
              {/* Exits distribution */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 mb-2">Exits Distribution</div>
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">TP Triggered</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{activeMetrics.exitSplit.TP}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">SL Triggered</div>
                    <div className="text-base font-bold text-rose-400 mt-0.5">{activeMetrics.exitSplit.SL}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">End of Test</div>
                    <div className="text-base font-bold text-zinc-300 mt-0.5">{activeMetrics.exitSplit.END_OF_TEST}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Other / Manual</div>
                    <div className="text-base font-bold text-purple-400 mt-0.5">{activeMetrics.exitSplit.OTHER}</div>
                  </div>
                </div>
              </div>

              {/* Skip reasons */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 mb-2">Filter Skips Breakdown</div>
                {Object.keys(activeMetrics.skipBreakdown).length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {Object.entries(activeMetrics.skipBreakdown).map(([reason, count]) => (
                      <div
                        key={reason}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs"
                      >
                        <span className="text-zinc-300 font-mono truncate max-w-[280px]">{reason}</span>
                        <span className="font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 py-3">No signals or retests skipped in logs for {selectedPair}.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GLOBAL SCOPE: Pair Performance & Edge Analysis across all pairs */
        <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-lg">currency_exchange</span>
              Pair Performance & Edge Analysis
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Identify which instruments hold a verified quantitative edge and which ones cause capital drawdown with this strategy.
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {activePairBreakdowns.length} Instrument{activePairBreakdowns.length !== 1 ? 's' : ''} Tested
            {selectedRunId !== 'all' && ' (Filtered Scope)'}
          </span>
        </div>

        {/* Best Performing Pair vs Worst Performing Pair Spotlight Cards */}
        {rankedPairs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BEST PERFORMING PAIR ("Doing Well") */}
            {bestPair && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/25 via-zinc-950 to-zinc-950 border border-emerald-500/30 relative overflow-hidden shadow-lg shadow-emerald-950/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">workspace_premium</span>
                    </span>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span>Doing Well</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>• Top Performer</span>
                      </div>
                      <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                        {bestPair.symbol}
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                          Rank #1
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold font-mono ${bestPair.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {bestPair.netProfit >= 0 ? `+$${bestPair.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(bestPair.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-zinc-400">Net Profit Generated</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80">
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{bestPair.winRate}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg R</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      {bestPair.avgR > 0 ? `+${bestPair.avgR}R` : `${bestPair.avgR}R`}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit Factor</div>
                    <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">
                      {bestPair.profitFactor > 0 ? bestPair.profitFactor : 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trades</div>
                    <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">{bestPair.tradesCount}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300/90 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-800/40">
                  <span className="material-symbols-outlined text-xs text-emerald-400 shrink-0">verified</span>
                  <span>
                    {bestPair.netProfit > 0
                      ? `Highest statistical edge for this strategy. Recommended primary candidate for forward demo or live execution.`
                      : `Least drawdown among tested pairs for this strategy.`}
                  </span>
                </div>
              </div>
            )}

            {/* WORST PERFORMING PAIR ("Doing Worse") */}
            {worstPair && rankedPairs.length > 1 ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/25 via-zinc-950 to-zinc-950 border border-rose-500/30 relative overflow-hidden shadow-lg shadow-rose-950/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">trending_down</span>
                    </span>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5">
                        <span>Doing Worse</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>• Underperforming</span>
                      </div>
                      <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                        {worstPair.symbol}
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                          Rank #{rankedPairs.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold font-mono ${worstPair.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {worstPair.netProfit >= 0 ? `+$${worstPair.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(worstPair.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-zinc-400">Net Profit / Drag</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80">
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</div>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${worstPair.winRate < 50 ? 'text-rose-400' : 'text-zinc-200'}`}>{worstPair.winRate}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg R</div>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${worstPair.avgR < 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {worstPair.avgR > 0 ? `+${worstPair.avgR}R` : `${worstPair.avgR}R`}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit Factor</div>
                    <div className={`text-sm font-bold font-mono mt-0.5 ${worstPair.profitFactor < 1.0 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {worstPair.profitFactor > 0 ? worstPair.profitFactor : '0.00'}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trades</div>
                    <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">{worstPair.tradesCount}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-rose-300/90 bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-800/40">
                  <span className="material-symbols-outlined text-xs text-rose-400 shrink-0">warning</span>
                  <span>
                    {worstPair.netProfit < 0
                      ? `Generates capital drag on this strategy. Recommend reviewing spreads, tightening stop loss, or blacklisting this pair.`
                      : `Yields the lowest return among tested pairs. Verify if risk-to-reward settings need calibration.`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-center items-center text-center">
                <span className="material-symbols-outlined text-blue-400 text-3xl mb-1.5">tune</span>
                <div className="text-xs font-bold text-white">Comparative Edge Benchmark</div>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                  Only 1 pair ({rankedPairs[0]?.symbol}) has been tested. Add test runs on other pairs (e.g. EURUSD, GBPUSD, NAS100) to unlock automatic best vs. worst comparison.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Two columns: Pair Edge Leaderboard & Exit / Skip Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pair Edge Leaderboard */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-lg">leaderboard</span>
                Pair Edge Leaderboard
              </h4>

              {/* Filter Pills: All, Doing Well, Doing Worse */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPairFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    pairFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({rankedPairs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPairFilter('well')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    pairFilter === 'well' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm' : 'text-zinc-400 hover:text-emerald-400'
                  }`}
                >
                  <span>Doing Well</span>
                  <span className="text-[10px] px-1 rounded bg-emerald-900/60 text-emerald-300 font-mono">{doingWellPairs.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPairFilter('worse')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    pairFilter === 'worse' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm' : 'text-zinc-400 hover:text-rose-400'
                  }`}
                >
                  <span>Doing Worse</span>
                  <span className="text-[10px] px-1 rounded bg-rose-900/60 text-rose-300 font-mono">{doingWorsePairs.length}</span>
                </button>
              </div>
            </div>

            {filteredPairs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-zinc-500 uppercase text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="pb-2">Rank & Symbol</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Win Rate</th>
                      <th className="pb-2">Avg R</th>
                      <th className="pb-2">PF</th>
                      <th className="pb-2 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredPairs.map((p) => {
                      const isBest = p.symbol === bestPair?.symbol && rankedPairs.length > 1;
                      const isWorst = p.symbol === worstPair?.symbol && rankedPairs.length > 1;
                      const rankIndex = rankedPairs.findIndex((rp) => rp.symbol === p.symbol) + 1;

                      return (
                        <tr key={p.symbol} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-2.5 font-sans">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-zinc-500 w-4">
                                #{rankIndex}
                              </span>
                              <span className="font-bold text-white font-mono">{p.symbol}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            {isBest ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">workspace_premium</span>
                                Best Pair
                              </span>
                            ) : isWorst ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">trending_down</span>
                                Worst Pair
                              </span>
                            ) : p.netProfit > 0 || (p.avgR > 0 && p.winRate >= 50) ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-950/40 text-emerald-400/90 border border-emerald-800/40 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                Doing Well
                              </span>
                            ) : p.netProfit < 0 || p.avgR < 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-950/40 text-rose-400/90 border border-rose-800/40 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">warning</span>
                                Doing Worse
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
                                Neutral
                              </span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className={p.winRate >= 50 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                              {p.winRate}%
                            </span>
                            <span className="text-[10px] text-zinc-500 block">{p.tradesCount}t</span>
                          </td>
                          <td className="py-2.5">
                            <span className={p.avgR > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                              {p.avgR > 0 ? `+${p.avgR}R` : `${p.avgR}R`}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={p.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-zinc-400'}>
                              {p.profitFactor > 0 ? p.profitFactor : '0.00'}
                            </span>
                          </td>
                          <td className={`py-2.5 text-right font-semibold ${p.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.netProfit >= 0 ? `+$${p.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(p.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-6 text-center">
                No pairs found matching the &ldquo;{pairFilter}&rdquo; filter.
              </div>
            )}
          </div>

        {/* Diagnostics & Exit Splits */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">flaky</span>
              Diagnostics & Exits Breakdown
            </h4>
          </div>

          {/* Exits distribution */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-2">Exits Distribution</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500">TP Triggered</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{activeMetrics.exitSplit.TP}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500">SL Triggered</div>
                <div className="text-base font-bold text-rose-400 mt-0.5">{activeMetrics.exitSplit.SL}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500">End of Test</div>
                <div className="text-base font-bold text-zinc-300 mt-0.5">{activeMetrics.exitSplit.END_OF_TEST}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500">Other / Manual</div>
                <div className="text-base font-bold text-purple-400 mt-0.5">{activeMetrics.exitSplit.OTHER}</div>
              </div>
            </div>
          </div>

          {/* Skip reasons */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-2">Filter Skips Breakdown</div>
            {Object.keys(activeMetrics.skipBreakdown).length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {Object.entries(activeMetrics.skipBreakdown).map(([reason, count]) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs"
                  >
                    <span className="text-zinc-300 font-mono truncate max-w-[280px]">{reason}</span>
                    <span className="font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-2">No signals or retests skipped in logs.</div>
            )}
          </div>
        </div>
      </div>
    </div>
      )}

      {/* 5. Version Comparison Table (v1 vs v2) */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-lg">compare_arrows</span>
                Version Comparison (v1 vs v2...)
              </h4>
              {!isAllFocus && (
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">filter_alt</span>
                  {selectedRunId !== 'all'
                    ? `Run #${focusedRun?.runNumber} (${focusedRun?.symbol || selectedPair})`
                    : `Filtered: ${selectedPair}`}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isAllFocus
                ? 'Track quantitative improvements across EA code iterations (All Backtests combined)'
                : selectedRunId !== 'all'
                ? `Performance of versions isolated to Run #${focusedRun?.runNumber} (${focusedRun?.symbol})`
                : `Track quantitative improvements across EA code iterations for ${selectedPair}`}
            </p>
          </div>
          {!isAllFocus && (
            <button
              type="button"
              onClick={() => {
                setSelectedPair('all');
                setSelectedRunId('all');
              }}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Compare Across All Pairs
            </button>
          )}
        </div>

        {activeVersionComparisons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="text-zinc-500 uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="pb-2.5">Version</th>
                  <th className="pb-2.5">Tests</th>
                  <th className="pb-2.5">Trades</th>
                  <th className="pb-2.5">Win Rate</th>
                  <th className="pb-2.5">Avg R</th>
                  <th className="pb-2.5">Profit Factor</th>
                  <th className="pb-2.5">Max DD (R)</th>
                  <th className="pb-2.5">Net Profit</th>
                  <th className="pb-2.5">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {activeVersionComparisons.map((v) => {
                  const isUntested = v.runsCount === 0;

                  return (
                    <tr key={v.versionId} className="hover:bg-zinc-900/40">
                      <td className="py-3 font-sans font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-xs">
                          {v.label}
                        </span>
                      </td>
                      <td className={`py-3 ${isUntested ? 'text-zinc-600' : 'text-zinc-300 font-semibold'}`}>
                        {v.runsCount}
                      </td>
                      <td className={`py-3 ${isUntested ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {v.tradesCount}
                      </td>
                      <td className="py-3">
                        {isUntested ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          <>
                            <span className={v.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                              {v.winRate}%
                            </span>
                            {v.deltaWinRate != null && v.deltaWinRate !== 0 && (
                              <span className={`text-[10px] ml-1.5 ${v.deltaWinRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({v.deltaWinRate > 0 ? `+${v.deltaWinRate}` : v.deltaWinRate}%)
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3">
                        {isUntested ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          <>
                            <span className={v.avgR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {v.avgR > 0 ? `+${v.avgR}R` : `${v.avgR}R`}
                            </span>
                            {v.deltaAvgR != null && v.deltaAvgR !== 0 && (
                              <span className={`text-[10px] ml-1.5 ${v.deltaAvgR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({v.deltaAvgR > 0 ? `+${v.deltaAvgR}` : v.deltaAvgR}R)
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3">
                        {isUntested ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          <>
                            <span className={v.profitFactor >= 1.3 ? 'text-emerald-400' : 'text-amber-400'}>
                              {v.profitFactor}
                            </span>
                            {v.deltaProfitFactor != null && v.deltaProfitFactor !== 0 && (
                              <span className={`text-[10px] ml-1.5 ${v.deltaProfitFactor > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({v.deltaProfitFactor > 0 ? `+${v.deltaProfitFactor}` : v.deltaProfitFactor})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3">
                        {isUntested ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          <span className="text-rose-400">-{v.maxDrawdownR}R</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold">
                        {isUntested ? (
                          <span className="text-zinc-600 font-normal">$0.00</span>
                        ) : (
                          <>
                            <span className={v.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {v.netProfit >= 0 ? `+$${v.netProfit}` : `-$${Math.abs(v.netProfit)}`}
                            </span>
                            {v.deltaNetProfit != null && v.deltaNetProfit !== 0 && (
                              <span className="text-[10px] ml-1.5">
                                ({v.deltaNetProfit > 0 ? `+$${v.deltaNetProfit}` : `-$${Math.abs(v.deltaNetProfit)}`})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 font-sans">
                        {isUntested ? (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-900 text-zinc-500 border border-zinc-800">
                            Untested
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            v.verdict === 'Promising'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : v.verdict === 'Needs work'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {v.verdict}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 py-6 text-center">
            Upload multiple code versions and log runs to compare performance iterations.
          </div>
        )}
      </div>
    </div>
  );
}
