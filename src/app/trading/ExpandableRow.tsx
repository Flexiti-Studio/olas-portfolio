"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { NewsEvent } from '@prisma/client';
import { WatchlistAddButton } from './WatchlistAddButton';
import { computeBias } from '@/lib/bias/computeBias';

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

interface ExpandableRowProps {
  event: NewsEvent;
  index: number;
  isWatched?: boolean;
  price24hChange?: number;
  price7dChange?: number;
}

export default function ExpandableRow({ event, index, isWatched = false, price24hChange = 0, price7dChange = 0 }: ExpandableRowProps) {
  const [expanded, setExpanded] = useState(false);
  
  const biasResult = computeBias({
    novelty: event.novelty as any,
    catalystType: event.catalystType,
    confirmingSignal: event.confirmingSignal,
    hasLiquidity: event.hasLiquidity,
    isGoodSession: event.isGoodSession,
    priceChange24h: price24hChange,
    priceChange7d: price7dChange,
    newsScore: event.score,
    sentiment: (event as any).sentiment
  });

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-gray-900/50 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4 text-gray-500 font-medium">
          {index}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Link 
              href={`/watchlist/${event.ticker}`}
              className="font-bold hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {event.ticker}
            </Link>
            <div className="flex gap-1" title="Liquidity & Session Quality">
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${event.hasLiquidity ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                Liq {event.hasLiquidity ? '✓' : '✗'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${event.isGoodSession ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                Ses {event.isGoodSession ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreBadgeColor(event.score)}`}>
            {event.score.toFixed(1)}
          </span>
        </td>
        <td className="px-6 py-4 text-gray-300">
          {formatEnum(event.catalystType)}
        </td>
        <td className="px-6 py-4 text-gray-300">
          {formatEnum(event.novelty)}
        </td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            biasResult.bias === 'BULLISH' ? 'bg-green-500/20 text-green-500' :
            biasResult.bias === 'BEARISH' ? 'bg-red-500/20 text-red-500' :
            biasResult.bias === 'CAUTION' ? 'bg-orange-500/20 text-orange-500' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {biasResult.bias}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="text-blue-400 font-medium truncate max-w-sm">
            {event.headline}
          </div>
        </td>
      </tr>
      
      {expanded && (
        <tr className="bg-gray-900/30">
          <td colSpan={7} className="px-6 py-6 border-l-2 border-blue-500">
            <div className="flex flex-col gap-4">
              <div>
                <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-xl text-blue-400 hover:underline mb-2 block font-medium">
                  {event.headline}
                </a>
                <p className="text-gray-300 leading-relaxed text-base whitespace-normal">
                  {event.summary}
                </p>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <a 
                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${event.ticker}USDT`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors inline-block text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Chart
                  </a>
                  <Link 
                    href={`/watchlist/${event.ticker}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors inline-block text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Full Details →
                  </Link>
                  <WatchlistAddButton ticker={event.ticker} isWatched={isWatched} />
                </div>
                
                <div className="flex gap-2">
                  <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs">
                    {formatEnum(event.catalystType)}
                  </span>
                  <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs">
                    {formatEnum(event.novelty)}
                  </span>
                  {event.confirmingSignal && (
                    <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs border border-purple-800">
                      Volume Confirmed
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 border-t border-gray-800 pt-4">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-sm font-semibold text-gray-400">Bias Reasons</h4>
                  <span className="text-xs text-gray-500 font-medium tracking-wider bg-gray-900 px-2 py-0.5 rounded">
                    CONFIDENCE: {biasResult.confidence}
                  </span>
                </div>
                {biasResult.reasons.length > 0 ? (
                  <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1 mb-3">
                    {biasResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">No strong directional factors identified.</p>
                )}
                
                {biasResult.warnings && biasResult.warnings.length > 0 && (
                  <div className="mt-2 p-3 border border-orange-900/50 bg-orange-950/20 rounded-md">
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
          </td>
        </tr>
      )}
    </>
  );
}
