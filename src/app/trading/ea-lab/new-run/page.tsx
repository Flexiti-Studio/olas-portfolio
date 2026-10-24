import React from 'react';
import { prisma, withPrismaRetry } from '@/lib/prisma';
import Link from 'next/link';
import { AddRunFormStandalone } from './AddRunFormStandalone';

export const dynamic = 'force-dynamic';

export default async function NewRunPage({
  searchParams,
}: {
  searchParams: Promise<{ strategyId?: string; versionId?: string }>;
}) {
  const { strategyId, versionId } = await searchParams;

  const rawStrategies = await withPrismaRetry(() =>
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

  const strategies = rawStrategies.map((s) => {
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

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/trading" className="hover:text-blue-400">
            Trading
          </Link>
          <span>/</span>
          <Link href="/trading/ea-lab" className="hover:text-blue-400">
            EA Lab
          </Link>
          <span>/</span>
          <span className="text-zinc-300 font-bold">New Test Run</span>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500 text-3xl">add_chart</span>
            Log Strategy Tester Run
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Paste MetaTrader 5 tester logs to parse deals, orders, skip diagnostics, and R-multiples.
          </p>
        </div>

        <AddRunFormStandalone
          strategies={strategies}
          defaultStrategyId={strategyId}
          defaultVersionId={versionId}
        />
      </div>
    </div>
  );
}
