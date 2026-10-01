import { PrismaClient } from '@prisma/client';
import React from 'react';
import ExpandableRow from './ExpandableRow';
import DateFilter from './DateFilter';
import PullNewsButton from './PullNewsButton';
import { tickerToCoinGeckoId } from '@/lib/market/checkVolumeSignal';

const prisma = new PrismaClient();

export default async function TradingDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const dateStr = resolvedSearchParams.date || new Date().toISOString().split('T')[0];
  
  // Create date boundaries in local time
  const targetDate = new Date(dateStr);
  
  // Set start of day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Set end of day
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const newsEvents = await prisma.newsEvent.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { score: 'desc' }
  });

  const watchlist = await prisma.watchlistItem.findMany({
    select: { ticker: true }
  });
  const watchedTickers = new Set(watchlist.map(i => i.ticker));

  const uniqueTickers = Array.from(new Set(newsEvents.map(e => e.ticker)));
  const coinIds = uniqueTickers.map(t => tickerToCoinGeckoId[t]).filter(Boolean).join(',');
  const priceChanges7d: Record<string, number> = {};
  const priceChanges24h: Record<string, number> = {};
  
  if (coinIds) {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&price_change_percentage=24h,7d`, { 
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        data.forEach((coin: any) => {
          const ticker = Object.keys(tickerToCoinGeckoId).find(k => tickerToCoinGeckoId[k] === coin.id);
          if (ticker) {
            priceChanges7d[ticker] = coin.price_change_percentage_7d_in_currency || 0;
            priceChanges24h[ticker] = coin.price_change_percentage_24h_in_currency || coin.price_change_percentage_24h || 0;
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch price changes for dashboard', err);
    }
  }

  // Ensure we pass a properly formatted date string to the filter YYYY-MM-DD
  const formattedDate = targetDate.toISOString().split('T')[0];

  // Count news per ticker for the horizontal list
  const newsCountByTicker = newsEvents.reduce((acc, event) => {
    acc[event.ticker] = (acc[event.ticker] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tickersWithCounts = Object.entries(newsCountByTicker)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          <p className="text-gray-400 mt-1">Daily AI-scored news events</p>
        </div>
        <div className="flex gap-4 items-center">
          <PullNewsButton />
          <DateFilter currentDate={formattedDate} />
        </div>
      </div>

      {tickersWithCounts.length > 0 && (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {tickersWithCounts.map(([t, count]) => (
            <div key={t} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 whitespace-nowrap shadow-sm">
              <span className="font-bold text-gray-200 text-sm">{t}</span>
              <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
      
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-900 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-400 w-12">#</th>
              <th className="px-6 py-4 font-medium">Ticker</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium">Catalyst</th>
              <th className="px-6 py-4 font-medium">Novelty</th>
              <th className="px-6 py-4 font-medium">Bias</th>
              <th className="px-6 py-4 font-medium w-full">Headline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {newsEvents.map((event, index) => (
              <ExpandableRow 
                key={event.id} 
                event={event} 
                index={index + 1} 
                isWatched={watchedTickers.has(event.ticker)} 
                price24hChange={priceChanges24h[event.ticker] || 0}
                price7dChange={priceChanges7d[event.ticker] || 0} 
              />
            ))}
            
            {newsEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <p className="text-gray-400 mb-2 text-lg">No news events found for this date.</p>
                  <p className="text-gray-600">The pipeline may not have run on {formattedDate}.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-gray-500 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
        <h3 className="text-gray-400 font-semibold mb-2">Metrics Information</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-gray-400">Liquidity (Liq):</strong> Checked using CoinGecko API. A green tick means the asset's current 24-hour trading volume is above the required minimum threshold ($5M USD).
          </li>
          <li>
            <strong className="text-gray-400">Session Quality (Ses):</strong> Analyzes trailing 14-day hourly volume data. A green tick indicates the current UTC hour ranks within the top 8 most active hours for the asset.
          </li>
        </ul>
      </div>
    </div>
  );
}
