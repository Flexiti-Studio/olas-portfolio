import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { WatchlistRemoveButton } from './WatchlistRemoveButton';

export const dynamic = 'force-dynamic';

function getScoreBadgeColor(score: number) {
  if (score > 70) return 'bg-green-500/20 text-green-500';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-500';
  return 'bg-gray-500/20 text-gray-500';
}

function formatEnum(val: string) {
  return val
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default async function WatchlistPage() {
  let watchlistWithNews: any[] = [];
  let errorMsg = null;

  try {
    const watchlist = await prisma.watchlistItem.findMany({
      orderBy: { addedAt: 'desc' }
    });

    watchlistWithNews = await Promise.all(
      watchlist.map(async (item) => {
        const recentNews = await prisma.newsEvent.findFirst({
          where: { ticker: item.ticker },
          orderBy: { createdAt: 'desc' }
        });
        return { ...item, recentNews };
      })
    );
  } catch (err: any) {
    console.error("Failed to load watchlist:", err);
    errorMsg = err.message || "Failed to load watchlist data.";
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Your Watchlist</h1>
      
      {errorMsg ? (
        <div className="text-red-400 mt-8 p-8 border border-red-800/50 rounded-lg text-center bg-red-900/20">
          <p className="text-lg font-bold">Database Connection Error</p>
          <p className="mt-2 text-sm max-w-2xl mx-auto">{errorMsg}</p>
          <p className="mt-4 text-xs text-gray-400">If you are seeing a connection pool timeout, try restarting your Next.js dev server.</p>
        </div>
      ) : watchlistWithNews.length === 0 ? (
        <div className="text-gray-400 mt-8 p-8 border border-gray-800 rounded-lg text-center bg-gray-900/50">
          <p className="text-lg">Your watchlist is empty.</p>
          <p className="mt-2 text-sm">Add coins from the trading dashboard to track them here.</p>
          <Link href="/trading" className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-4 py-4 font-medium w-12 text-center">#</th>
                <th className="px-6 py-4 font-medium">Ticker</th>
                <th className="px-6 py-4 font-medium">Latest Score</th>
                <th className="px-6 py-4 font-medium w-full">Recent News</th>
                <th className="px-6 py-4 font-medium">Added</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {watchlistWithNews.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-800/50 transition-colors cursor-pointer group">
                  <td className="px-4 py-4 text-center text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/watchlist/${item.ticker}`} className="font-bold text-white group-hover:text-blue-400 transition-colors text-base block">
                      {item.ticker}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {item.recentNews ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreBadgeColor(item.recentNews.score)}`}>
                        {item.recentNews.score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs italic">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.recentNews ? (
                      <div className="flex flex-col gap-1 truncate max-w-md">
                        <span className="text-gray-300 font-medium truncate group-hover:text-white transition-colors">{item.recentNews.headline}</span>
                        <div className="flex gap-2 items-center text-xs text-gray-500">
                          <span>{formatEnum(item.recentNews.catalystType)}</span>
                          <span>•</span>
                          <span>{new Date(item.recentNews.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No recent news</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(item.addedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <WatchlistRemoveButton ticker={item.ticker} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
