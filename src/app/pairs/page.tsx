import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function PairsPage() {
  let strategies: { id: string; name: string; instruments: string | null }[] = [];
  try {
    strategies = await prisma.tradingStrategy.findMany({
      select: { instruments: true, name: true, id: true }
    });
  } catch (e) {
    console.warn("Prisma warning fetching strategies:", (e as Error).message);
  }

  let watchlist: { ticker: string }[] = [];
  try {
    watchlist = await prisma.watchlistItem.findMany({
      select: { ticker: true }
    });
  } catch (e) {
    console.warn("Prisma warning fetching watchlist:", (e as Error).message);
  }
  
  const watchlistedTickers = new Set(watchlist.map(w => w.ticker));

  // Map to hold unique pairs: key = ticker, value = { link, strategies }
  const pairsMap = new Map<string, { link: string, strategies: {id: string, name: string}[] }>();

  // Extract from strategies
  strategies.forEach(strategy => {
    if (!strategy.instruments) return;
    try {
      const parsed = JSON.parse(strategy.instruments);
      parsed.forEach((item: any) => {
        let name = '';
        let link = '';
        if (typeof item === 'string') {
          name = item;
        } else {
          name = item.name;
          link = item.link || '';
        }
        if (!name) return;
        
        if (!pairsMap.has(name)) {
          pairsMap.set(name, { link, strategies: [] });
        }
        
        const existing = pairsMap.get(name)!;
        if (!existing.link && link) existing.link = link;
        existing.strategies.push({ id: strategy.id, name: strategy.name });
      });
    } catch (e) {}
  });

  // Ensure items purely in the watchlist also appear, even if not in any strategy
  watchlist.forEach(w => {
    if (!pairsMap.has(w.ticker)) {
      pairsMap.set(w.ticker, { link: '', strategies: [] });
    }
  });

  // Convert to array and sort
  const allPairs = Array.from(pairsMap.entries()).map(([name, data]) => ({
    name,
    link: data.link,
    strategies: data.strategies,
    isWatchlisted: watchlistedTickers.has(name)
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] max-w-6xl mx-auto pb-16">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500 text-[32px]">monitoring</span>
            Global Pairs Directory
          </h1>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
             <span className="text-gray-400 text-sm font-bold">Total Discovered:</span>
             <span className="text-blue-400 text-lg font-bold">{allPairs.length}</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950/50 text-xs uppercase text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Pair / Instrument</th>
                  <th className="px-6 py-4 font-medium">Used In Strategies</th>
                  <th className="px-6 py-4 font-medium">Custom Link</th>
                  <th className="px-6 py-4 font-medium text-right">Watchlist Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                {allPairs.length > 0 ? allPairs.map(pair => (
                  <tr key={pair.name} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-[18px]">monitoring</span>
                      {pair.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {pair.strategies.length > 0 ? pair.strategies.map(s => (
                          <Link key={s.id} href={`/trading/strategy/${s.id}`} className="text-[10px] uppercase tracking-wide font-bold bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition-colors">
                            {s.name}
                          </Link>
                        )) : (
                          <span className="text-gray-600 italic text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {pair.link ? (
                        <a href={pair.link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium" title={pair.link}>
                          <span className="material-symbols-outlined text-[14px]">public</span> External Chart
                        </a>
                      ) : (
                        <span className="text-gray-600 italic text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a href={`/watchlist/${pair.name}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-medium" title={`View ${pair.name} Watchlist`}>
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span> Watchlist Page
                        </a>
                        
                        {!pair.isWatchlisted && (
                          <form action={async () => {
                            "use server";
                            try {
                              await prisma.watchlistItem.create({ data: { ticker: pair.name } });
                              revalidatePath('/pairs');
                            } catch(e) {}
                          }}>
                            <button type="submit" className="bg-blue-900/40 border border-blue-800/50 text-blue-300 hover:bg-blue-800/60 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">add</span> Add to Global
                            </button>
                          </form>
                        )}
                        {pair.isWatchlisted && (
                          <span className="text-green-500 bg-green-900/20 border border-green-800/50 flex items-center justify-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[14px]">check</span> Tracked Globally
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                      No pairs found across any strategies or watchlists yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
