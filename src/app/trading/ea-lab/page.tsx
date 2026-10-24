import React from 'react';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import { EaLabOverviewClient, StrategyCardData } from './EaLabOverviewClient';
import { aggregateRuns, evaluateStrategyVerdict } from '@/lib/ea-lab/metrics';

import { deserializeCategoryDescription, getStrategyCategory } from '@/lib/ea-lab/categories';

export const dynamic = 'force-dynamic';

export default async function EaLabOverviewPage() {
  const strategies = await withPrismaRetry(() =>
    prisma.eaStrategy.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { createdAt: 'desc' },
        },
        pairNotes: {
          select: { symbol: true },
        },
        testRuns: {
          select: {
            id: true,
            symbol: true,
            timeframe: true,
            testedAt: true,
            initialDeposit: true,
            finalBalance: true,
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
            trades: {
              select: {
                id: true,
                direction: true,
                lots: true,
                entry: true,
                exitPrice: true,
                rMultiple: true,
                profit: true,
                exitReason: true,
              },
            },
          },
          orderBy: { testedAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  );

  const strategyCards: StrategyCardData[] = strategies.map((s) => {
    const metrics = aggregateRuns(s.testRuns);
    const { verdict, reasons, warnings } = evaluateStrategyVerdict(metrics, s.testRuns);

    const latestVersion = s.versions[0]?.label;
    const { category: rawCategory, description: cleanDesc } = deserializeCategoryDescription(s.description);
    const matchedCategory = getStrategyCategory({
      name: s.name,
      description: cleanDesc,
      category: rawCategory,
    });

    return {
      id: s.id,
      name: s.name,
      description: cleanDesc,
      category: matchedCategory?.name || rawCategory || null,
      categoryId: matchedCategory?.id || null,
      categoryNumber: matchedCategory?.number || null,
      testsCount: s.testRuns.length,
      tradesCount: metrics.tradesCount,
      winRate: metrics.winRate,
      avgR: metrics.avgR,
      profitFactor: metrics.profitFactor,
      netProfit: metrics.netProfit,
      returnPct: metrics.returnPct,
      verdict,
      verdictReasons: reasons,
      warningsCount: warnings.length,
      latestVersionLabel: latestVersion,
      createdAt: s.createdAt,
    };
  });

  const strategyOptions = strategies.map((s) => {
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
      versions: s.versions.map((v) => ({ id: v.id, label: v.label })),
      pairs: Array.from(pairSet),
    };
  });

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] mx-auto">
        <EaLabOverviewClient
          strategies={strategyCards}
          strategyOptions={strategyOptions}
        />
      </div>
    </div>
  );
}
