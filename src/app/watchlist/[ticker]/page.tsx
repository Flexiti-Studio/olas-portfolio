import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { tickerToCoinGeckoId, checkVolumeSignal } from '@/lib/market/checkVolumeSignal';
import { checkSessionQuality } from '@/lib/market/checkSessionQuality';
import { computeBias } from '@/lib/news/computeBias';
import { WatchlistRemoveButton } from '../WatchlistRemoveButton';
import { WatchlistAddButton } from '@/app/trading/WatchlistAddButton';
import { StrategyNote } from '@/components/StrategyNote';
import { JournalEntryModalWrapper } from '@/components/JournalEntryModalWrapper';
import { MiniCalendar } from '@/app/journal/MiniCalendar';

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

async function getCoinGeckoData(coinId: string) {
  if (!coinId) return null;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function WatchlistTickerDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const ticker = resolvedParams.ticker.toUpperCase();
  const resolvedSearchParams = await searchParams;
  const pageParam = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page, 10) : 1;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = 10;

  const [newsEvents, totalCount] = await Promise.all([
    prisma.newsEvent.findMany({
      where: { ticker },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.newsEvent.count({ where: { ticker } })
  ]);
  const totalPages = Math.ceil(totalCount / pageSize);

  const latestNews = newsEvents.length > 0 ? newsEvents[0] : null;

  const targetDate = new Date(new Date().toISOString().split('T')[0]);
  const existingJournal = await prisma.journalEntry.findFirst({
    where: {
      ticker,
      date: targetDate
    }
  });

  const tickerJournalEntries = await prisma.journalEntry.findMany({
    where: { ticker },
    orderBy: { date: 'desc' }
  });

  const watchlistItem = await prisma.watchlistItem.findUnique({
    where: { ticker }
  });
  const isWatched = !!watchlistItem;

  const coinId = tickerToCoinGeckoId[ticker];
  const cgData = await getCoinGeckoData(coinId);

  const { hasLiquidity } = await checkVolumeSignal(ticker);
  const { isGoodSession } = await checkSessionQuality(ticker);

  const price = cgData?.market_data?.current_price?.usd;
  const change24h = cgData?.market_data?.price_change_percentage_24h;
  const change7d = cgData?.market_data?.price_change_percentage_7d || 0;
  const marketCap = cgData?.market_data?.market_cap?.usd;
  const volume24h = cgData?.market_data?.total_volume?.usd;

  const biasResult = computeBias(latestNews, hasLiquidity, isGoodSession, change7d);

  const formatNumber = (num?: number, isCurrency = false) => {
    if (num === undefined || num === null) return 'N/A';
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: num < 1 ? 4 : 2 }).format(num);
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  const formatPercent = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    const sign = num > 0 ? '+' : '';
    const color = num >= 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{sign}{num.toFixed(2)}%</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/watchlist" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
          ← Back to Watchlist
        </Link>
        {isWatched ? (
          <WatchlistRemoveButton ticker={ticker} />
        ) : (
          <WatchlistAddButton ticker={ticker} isWatched={false} />
        )}
      </div>

      <div className="w-[98%] mx-auto mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex flex-col lg:flex-row gap-8 justify-between items-center">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{ticker}</h1>
            <div className="text-3xl font-semibold mb-4">{formatNumber(price, true)}</div>

            <div className="flex flex-wrap gap-8 text-sm">
              <div>
                <div className="text-gray-400 mb-1">24h Change</div>
                <div className="font-medium text-base">{formatPercent(change24h)}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">7d Change</div>
                <div className="font-medium text-base">{formatPercent(change7d)}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Market Cap</div>
                <div className="font-medium text-base">{formatNumber(marketCap, true)}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">24h Volume</div>
                <div className="font-medium text-base">{formatNumber(volume24h, true)}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-8 border-t lg:border-t-0 lg:border-l border-gray-800 pt-6 lg:pt-0 lg:pl-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-gray-400 text-sm mb-1">Trading Status</h3>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">Liquidity Floor</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${hasLiquidity ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {hasLiquidity ? '✓ Passed' : '✗ Failed'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">Session Quality</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${isGoodSession ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {isGoodSession ? '✓ Active' : '✗ Quiet'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-l border-gray-800 pl-8">
              <h3 className="text-gray-400 text-sm mb-1">System Bias</h3>
              <div>
                <span className={`px-4 py-1.5 rounded font-bold text-sm ${biasResult.bias === 'BULLISH' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                    biasResult.bias === 'BEARISH' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                      'bg-gray-700/50 text-gray-300 border border-gray-600/50'
                  }`}>
                  {biasResult.bias}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {biasResult.reasons.length > 0 && (
        <div className="w-[98%] mx-auto mb-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-4 font-bold">Bias Reasons:</h3>
          <ul className="text-sm text-gray-300 space-y-2 list-disc pl-5">
            {biasResult.reasons.map((reason, idx) => (
              <li key={idx} className="leading-relaxed">{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-[98%] mx-auto mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg h-[700px] overflow-hidden">
          <iframe
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3A${ticker}USDT&interval=D&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3A${ticker}USDT`}
            width="100%"
            height="100%"
            frameBorder="0"
            allowTransparency={true}
            scrolling="no"
            allowFullScreen={true}
          ></iframe>
        </div>
      </div>

      <div className="w-[98%] mx-auto mt-8">
        <StrategyNote
          ticker={ticker}
          dateStr={new Date().toISOString().split('T')[0]}
          initialData={existingJournal}
        />
      </div>

      <div className="w-[98%] mx-auto mt-8">
        <JournalEntryModalWrapper
          ticker={ticker}
          dateStr={new Date().toISOString().split('T')[0]}
          initialData={existingJournal}
        />
      </div>

      <div className="w-[98%] mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">News History</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 mb-12">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="px-4 py-4 font-medium text-gray-400 w-12 text-center">#</th>
                <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 font-medium text-gray-400">Score</th>
                <th className="px-6 py-4 font-medium text-gray-400">Catalyst / Novelty</th>
                <th className="px-6 py-4 font-medium text-gray-400 w-full">Headline & Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {newsEvents.map((event, index) => (
                <tr key={event.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-4 text-center text-gray-500 font-medium">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreBadgeColor(event.score)}`}>
                      {event.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-300 font-medium">{formatEnum(event.catalystType)}</span>
                      <span className="text-gray-500 text-xs">{formatEnum(event.novelty)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="whitespace-normal max-w-2xl">
                      <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-medium text-base mb-1 block">
                        {event.headline}
                      </a>
                      <p className="text-gray-400 text-sm leading-relaxed">{event.summary}</p>
                    </div>
                  </td>
                </tr>
              ))}
              {newsEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No historical events found for {ticker}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mb-12">
            {page > 1 ? (
              <Link href={`/watchlist/${ticker}?page=${page - 1}`} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors text-sm font-medium shadow-sm">
                Previous
              </Link>
            ) : (
              <button disabled className="px-4 py-2 bg-gray-800/30 text-gray-600 rounded cursor-not-allowed text-sm font-medium">
                Previous
              </button>
            )}

            <span className="text-gray-400 text-sm font-medium px-4 py-2 bg-gray-900 border border-gray-800 rounded">
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>

            {page < totalPages ? (
              <Link href={`/watchlist/${ticker}?page=${page + 1}`} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors text-sm font-medium shadow-sm">
                Next
              </Link>
            ) : (
              <button disabled className="px-4 py-2 bg-gray-800/30 text-gray-600 rounded cursor-not-allowed text-sm font-medium">
                Next
              </button>
            )}
          </div>
        )}
      </div>

      <div className="w-[98%] mx-auto mt-8 border-t border-gray-800 pt-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Activity Calendar</h2>
        <MiniCalendar entries={tickerJournalEntries} />
      </div>

      <div className="mt-8 text-center text-gray-500 text-xs">
        This is a decision-support summary based on available news and volume data, not financial advice — verify before acting.
      </div>
    </div>
  );
}
