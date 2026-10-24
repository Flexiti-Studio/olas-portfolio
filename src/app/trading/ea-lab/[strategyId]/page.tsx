import React from 'react';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EaStrategyDetailClient } from './EaStrategyDetailClient';
import {
  aggregateRuns,
  evaluateStrategyVerdict,
  compareVersions,
  calculateTradeMetrics,
} from '@/lib/ea-lab/metrics';
import { deserializeCategoryDescription, getStrategyCategory } from '@/lib/ea-lab/categories';

export const dynamic = 'force-dynamic';

export default async function StrategyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ strategyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { strategyId } = await params;
  const { tab } = await searchParams;

  const strategy = await withPrismaRetry(() =>
    prisma.eaStrategy.findUnique({
      where: { id: strategyId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { createdAt: 'asc' },
        },
        testRuns: {
          select: {
            id: true,
            strategyId: true,
            versionId: true,
            testedAt: true,
            symbol: true,
            timeframe: true,
            periodFrom: true,
            periodTo: true,
            initialDeposit: true,
            currency: true,
            leverage: true,
            finalBalance: true,
            inputsJson: true,
            journal: true,
            netProfit: true,
            returnPct: true,
            tradesCount: true,
            winRate: true,
            profitFactor: true,
            avgR: true,
            maxDrawdownR: true,
            maxConsecLosses: true,
            tpCount: true,
            slCount: true,
            errorCount: true,
            breakCount: true,
            retestCount: true,
            skipCounts: true,
            createdAt: true,
            updatedAt: true,
            trades: {
              select: {
                id: true,
                ticket: true,
                openedAt: true,
                closedAt: true,
                direction: true,
                lots: true,
                entry: true,
                sl: true,
                tp: true,
                exitPrice: true,
                exitReason: true,
                tag: true,
                rMultiple: true,
                profit: true,
              },
              orderBy: { openedAt: 'asc' },
            },
          },
          orderBy: { testedAt: 'asc' },
        },
        dayJournals: {
          orderBy: { date: 'desc' },
        },
        pairNotes: true,
      },
    })
  );

  if (!strategy) {
    notFound();
  }

  // All strategies for modal dropdown
  const allStrategies = await withPrismaRetry(() =>
    prisma.eaStrategy.findMany({
      select: {
        id: true,
        name: true,
        versions: {
          select: { id: true, label: true },
          orderBy: { createdAt: 'desc' },
        },
        pairNotes: {
          select: { symbol: true },
        },
        testRuns: {
          select: { symbol: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  );

  const strategyOptions = allStrategies.map((s) => {
    const pairSet = new Set<string>();
    s.pairNotes?.forEach((pn) => {
      if (pn.symbol && pn.symbol !== 'UNKNOWN') pairSet.add(pn.symbol.trim());
    });
    s.testRuns?.forEach((tr) => {
      if (tr.symbol && tr.symbol !== 'UNKNOWN') pairSet.add(tr.symbol.trim());
    });
    return {
      id: s.id,
      name: s.name,
      versions: s.versions,
      pairs: Array.from(pairSet),
    };
  });

  // 1. Overall Strategy Metrics & Verdict
  const overallMetrics = aggregateRuns(strategy.testRuns);
  const verdict = evaluateStrategyVerdict(overallMetrics, strategy.testRuns);

  // 2. Version Comparison
  const versionsWithRuns = strategy.versions.map((v) => ({
    id: v.id,
    label: v.label,
    createdAt: v.createdAt,
    testRuns: strategy.testRuns.filter((r) => r.versionId === v.id),
  }));
  const versionComparisons = compareVersions(versionsWithRuns);

  // 3. Pair Performance & Notes Breakdown
  const symbolMap = new Map<string, typeof strategy.testRuns>();
  strategy.testRuns.forEach((r) => {
    const sym = r.symbol || 'UNKNOWN';
    if (!symbolMap.has(sym)) {
      symbolMap.set(sym, []);
    }
    symbolMap.get(sym)!.push(r);
  });

  // Also include any symbols from pairNotes that might not have runs yet
  strategy.pairNotes.forEach((pn) => {
    if (!symbolMap.has(pn.symbol)) {
      symbolMap.set(pn.symbol, []);
    }
  });

  const pairBreakdowns = Array.from(symbolMap.entries()).map(([sym, pairRuns]) => {
    const pairMetrics = aggregateRuns(pairRuns);
    const existingNote = strategy.pairNotes.find((pn) => pn.symbol === sym);

    return {
      symbol: sym,
      runsCount: pairRuns.length,
      tradesCount: pairMetrics.tradesCount,
      winRate: pairMetrics.winRate,
      avgR: pairMetrics.avgR,
      profitFactor: pairMetrics.profitFactor,
      netProfit: pairMetrics.netProfit,
      returnPct: pairMetrics.returnPct,
      notes: existingNote?.notes || null,
    };
  });

  // Sort pairs by test count desc
  pairBreakdowns.sort((a, b) => b.runsCount - a.runsCount);

  const { category: rawCategory, description: cleanDesc } = deserializeCategoryDescription(strategy.description);
  const matchedCategory = getStrategyCategory({
    name: strategy.name,
    description: cleanDesc,
    category: rawCategory,
  });

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] mx-auto">
        <EaStrategyDetailClient
          strategy={{
            id: strategy.id,
            name: strategy.name,
            description: cleanDesc,
            category: matchedCategory?.name || rawCategory || null,
            categoryId: matchedCategory?.id || null,
            categoryNumber: matchedCategory?.number || null,
          }}
          metrics={overallMetrics}
          verdict={verdict}
          versionComparisons={versionComparisons}
          pairBreakdowns={pairBreakdowns}
          runs={strategy.testRuns}
          versions={strategy.versions}
          dayJournals={strategy.dayJournals}
          strategyOptions={strategyOptions}
          initialTab={tab}
        />
      </div>
    </div>
  );
}
