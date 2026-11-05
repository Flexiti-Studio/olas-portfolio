import React from 'react';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { tickerToCoinGeckoId, checkVolumeSignal } from '@/lib/market/checkVolumeSignal';
import { checkSessionQuality } from '@/lib/market/checkSessionQuality';
import { computeBias } from '@/lib/bias/computeBias';

const prisma = new PrismaClient();

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

export default async function TickerDetailsPage({
  params
}: {
  params: Promise<{ ticker: string }>;
}) {
  const resolvedParams = await params;
  const ticker = resolvedParams.ticker.toUpperCase();
  
  const newsEvents = await prisma.newsEvent.findMany({
    where: { ticker },
    orderBy: { createdAt: 'desc' }
  });

  const coinId = tickerToCoinGeckoId[ticker];
  const cgData = await getCoinGeckoData(coinId);
  
  const { hasLiquidity } = await checkVolumeSignal(ticker);
  const { isGoodSession } = await checkSessionQuality(ticker);

  const price = cgData?.market_data?.current_price?.usd;
  const change24h = cgData?.market_data?.price_change_percentage_24h;
  const change7d = cgData?.market_data?.price_change_percentage_7d;
  const marketCap = cgData?.market_data?.market_cap?.usd;
  const volume24h = cgData?.market_data?.total_volume?.usd;

  const latestNews = newsEvents.length > 0 ? newsEvents[0] : null;
  const biasResult = latestNews ? computeBias({
    novelty: latestNews.novelty as any, // novelty is an enum string
    catalystType: latestNews.catalystType,
    confirmingSignal: latestNews.confirmingSignal,
    hasLiquidity: latestNews.hasLiquidity,
    isGoodSession: latestNews.isGoodSession,
    priceChange24h: change24h || 0,
    priceChange7d: change7d || 0,
    newsScore: latestNews.score
  }) : { bias: 'NEUTRAL', confidence: 'LOW', reasons: ['No recent news events found to establish a strong thesis.'], warnings: [] };

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
      <div className="mb-6">
        <Link href="/trading" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h1 className="text-4xl font-bold mb-2">{ticker}</h1>
            <div className="text-3xl font-semibold mb-4">{formatNumber(price, true)}</div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
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
                <div className="font-medium">{formatNumber(marketCap, true)}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">24h Volume</div>
                <div className="font-medium">{formatNumber(volume24h, true)}</div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-gray-400 text-sm mb-4">Current Trading Status</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Liquidity Floor</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${hasLiquidity ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {hasLiquidity ? '✓ Passed' : '✗ Failed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Session Quality</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${isGoodSession ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {isGoodSession ? '✓ Active' : '✗ Quiet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-6 mt-6">
              <h3 className="text-gray-400 text-sm mb-4">Directional Bias</h3>
              <div className="mb-4 flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                  biasResult.bias === 'BULLISH' ? 'bg-green-500/20 text-green-500' :
                  biasResult.bias === 'BEARISH' ? 'bg-red-500/20 text-red-500' :
                  biasResult.bias === 'CAUTION' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {biasResult.bias}
                </span>
                <span className="text-xs text-gray-500 font-medium tracking-wider">
                  CONFIDENCE: {biasResult.confidence}
                </span>
              </div>

              {biasResult.reasons.length > 0 && (
                <div className="mb-3">
                  <ul className="list-disc pl-4 text-xs text-gray-400 space-y-1">
                    {biasResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {biasResult.warnings && biasResult.warnings.length > 0 && (
                <div className="mt-3 p-3 border border-orange-900/50 bg-orange-950/20 rounded-md">
                  <h4 className="text-xs font-semibold text-orange-500 mb-1 flex items-center gap-1">
                    <span className="text-base leading-none">⚠</span> Warnings
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-orange-400/80 space-y-1">
                    {biasResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-lg h-[600px] overflow-hidden mb-8">
            <iframe
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=BINANCE%3A${ticker}USDT&interval=D&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3A${ticker}USDT`}
              width="100%"
              height="100%"
              frameBorder="0"
              allowTransparency={true}
              scrolling="no"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">News History</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 font-medium text-gray-400">Score</th>
                <th className="px-6 py-4 font-medium text-gray-400">Catalyst / Novelty</th>
                <th className="px-6 py-4 font-medium text-gray-400 w-full">Headline & Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {newsEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-800/50 transition-colors">
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
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No historical events found for {ticker}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
