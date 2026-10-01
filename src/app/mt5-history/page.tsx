import { PrismaClient } from '@prisma/client';
import React from 'react';
import RefreshButton from './RefreshButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();
const PAGE_SIZE = 50;

function isLiveTrade(t: { closeTime: Date | null }) {
  return !t.closeTime || t.closeTime.getFullYear() <= 1970;
}

export default async function MT5HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  // Fetch live trades (always show all, usually few)
  const liveTrades = await prisma.mT5Trade.findMany({
    where: {
      OR: [
        { closeTime: null },
        { closeTime: { lt: new Date('1971-01-01') } },
      ],
    },
    orderBy: { openTime: 'desc' },
  });

  // Fetch paginated closed trades
  const totalClosed = await prisma.mT5Trade.count({
    where: {
      AND: [
        { closeTime: { not: null } },
        { closeTime: { gte: new Date('1971-01-01') } },
      ],
    },
  });

  const closedTrades = await prisma.mT5Trade.findMany({
    where: {
      AND: [
        { closeTime: { not: null } },
        { closeTime: { gte: new Date('1971-01-01') } },
      ],
    },
    orderBy: { closeTime: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalClosed / PAGE_SIZE);

  // Stats (always computed over all closed trades for accuracy)
  const allClosedStats = await prisma.mT5Trade.aggregate({
    where: {
      AND: [
        { closeTime: { not: null } },
        { closeTime: { gte: new Date('1971-01-01') } },
      ],
    },
    _sum: { profit: true },
    _count: { id: true },
  });

  const winningCount = await prisma.mT5Trade.count({
    where: {
      AND: [
        { closeTime: { not: null } },
        { closeTime: { gte: new Date('1971-01-01') } },
        { profit: { gt: 0 } },
      ],
    },
  });

  const totalClosedCount = allClosedStats._count.id;
  const totalProfit = allClosedStats._sum.profit ?? 0;
  const winRate = totalClosedCount > 0 ? ((winningCount / totalClosedCount) * 100).toFixed(1) : '0.0';
  const averageProfit = totalClosedCount > 0 ? totalProfit / totalClosedCount : 0;
  const openPnL = liveTrades.reduce((acc, t) => acc + t.profit, 0);

  const PaginationBar = () => (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
      <span>
        Page {page} of {totalPages} &nbsp;·&nbsp; {totalClosed} closed trades total
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`?page=${page - 1}`}
            className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            ← Prev
          </Link>
        )}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const p = start + i;
          return p <= totalPages ? (
            <Link
              key={p}
              href={`?page=${p}`}
              className={`px-3 py-1.5 rounded border transition-colors ${
                p === page
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-gray-700 hover:bg-gray-800'
              }`}
            >
              {p}
            </Link>
          ) : null;
        })}
        {page < totalPages && (
          <Link
            href={`?page=${page + 1}`}
            className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );

  const TradeTable = ({
    trades,
    title,
    startIndex = 0,
    isLive = false,
  }: {
    trades: typeof closedTrades;
    title: string;
    startIndex?: number;
    isLive?: boolean;
  }) => (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isLive
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {trades.length}{isLive ? '' : ` / ${totalClosed}`}
        </span>
        {isLive && trades.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Live
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-900 border-b border-gray-800">
            <tr>
              <th className="px-4 py-4 font-medium text-gray-600 w-10">#</th>
              <th className="px-6 py-4 font-medium text-gray-400">Ticket</th>
              <th className="px-6 py-4 font-medium">Symbol</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Volume</th>
              <th className="px-6 py-4 font-medium">Open / Close Price</th>
              <th className="px-6 py-4 font-medium">Open / Close Time (UTC)</th>
              <th className="px-6 py-4 font-medium">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trades.map((trade, index) => (
              <tr key={trade.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-4 text-gray-600 text-xs font-mono">{startIndex + index + 1}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{trade.ticket}</td>
                <td className="px-6 py-4 font-bold">{trade.symbol}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      trade.type.toUpperCase() === 'BUY'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {trade.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{trade.volume.toFixed(2)}</td>
                <td className="px-6 py-4 text-gray-300">
                  <div>{trade.openPrice.toFixed(5)}</div>
                  <div className="text-xs text-gray-500">
                    {trade.closePrice ? trade.closePrice.toFixed(5) : (
                      <span className="text-green-500/70">Open</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  <div>{trade.openTime.toISOString().replace('T', ' ').substring(0, 19)}</div>
                  <div className="text-xs text-gray-500">
                    {isLiveTrade(trade) ? (
                      <span className="text-green-400">Live</span>
                    ) : trade.closeTime ? (
                      trade.closeTime.toISOString().replace('T', ' ').substring(0, 19)
                    ) : '—'}
                  </div>
                </td>
                <td className={`px-6 py-4 font-bold ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${trade.profit.toFixed(2)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-lg">
                  No {title.toLowerCase()} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">MT5 Trade History</h1>
          <p className="text-gray-400 mt-1">Automatic sync from MetaTrader 5</p>
        </div>
        <RefreshButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm font-medium">Closed Trades</div>
          <div className="text-2xl font-bold mt-1">{totalClosedCount}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm font-medium">Win Rate</div>
          <div className="text-2xl font-bold mt-1">{winRate}%</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm font-medium">Realized Profit</div>
          <div className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm font-medium">Open PnL</div>
          <div className={`text-2xl font-bold mt-1 ${openPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${openPnL.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm font-medium">Avg Profit / Trade</div>
          <div className={`text-2xl font-bold mt-1 ${averageProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${averageProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Live Trades (always full list) */}
      <TradeTable trades={liveTrades} title="Live Trades" isLive={true} />

      {/* Closed Trades with pagination */}
      <TradeTable
        trades={closedTrades}
        title="Trade History"
        startIndex={(page - 1) * PAGE_SIZE}
      />
      <PaginationBar />
    </div>
  );
}
