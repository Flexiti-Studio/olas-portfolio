"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TradingStrategy } from '@prisma/client';
import { format } from 'date-fns';
import { StrategyForm } from '@/components/StrategyForm';

function TickerBadges({ tickers }: { tickers: string[] }) {
  const MAX = 3;
  const visible = tickers.slice(0, MAX);
  const overflow = tickers.length - MAX;
  return (
    <div className="flex flex-wrap gap-1.5 items-center mt-2">
      {tickers.length === 0 && (
        <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full text-xs font-medium">General / All</span>
      )}
      {visible.map(t => (
        <span key={t} className="bg-blue-900/40 border border-blue-800/50 text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
          {t}
        </span>
      ))}
      {overflow > 0 && (
        <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full text-xs font-medium">+{overflow} more</span>
      )}
    </div>
  );
}

function GridCard({ strategy }: { strategy: TradingStrategy }) {
  let tickers: string[] = [];
  try { if (strategy.instruments) tickers = JSON.parse(strategy.instruments); } catch(e) {}

  return (
    <Link href={`/trading/strategy/${strategy.id}`} className="block group h-full">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-700/60 hover:bg-gray-850 transition-all hover:shadow-lg hover:shadow-black/30 flex flex-col gap-3 h-full cursor-pointer relative">
        {/* Header */}
        <div>
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-white font-bold text-base leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
              {strategy.name || 'Untitled Strategy'}
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              strategy.status === 'active' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 
              strategy.status === 'testing' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50' : 
              'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {strategy.status}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
            Updated {format(new Date(strategy.updatedAt), 'MMM d, yyyy')}
          </p>
        </div>

        <TickerBadges tickers={tickers} />

        <div className="border-t border-gray-800/60 mt-1" />

        {/* Quick look */}
        <div className="space-y-3 flex-1 pt-1">
          {strategy.targetCondition && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[12px] text-purple-400">target</span>
                Target Condition
              </div>
              <p className="text-gray-300 text-sm line-clamp-2">{strategy.targetCondition}</p>
            </div>
          )}
          {strategy.triggerCondition && (
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[12px] text-green-400">login</span>
                Trigger
              </div>
              <p className="text-gray-300 text-sm line-clamp-2">{strategy.triggerCondition}</p>
            </div>
          )}
        </div>

        {/* Stats footer */}
        {(strategy.winRate !== null || strategy.averageR !== null) && (
          <>
            <div className="border-t border-gray-800/60" />
            <div className="flex gap-4 text-xs">
              {strategy.winRate !== null && <div><span className="text-gray-600">Win Rate</span><div className="text-white font-medium">{strategy.winRate}%</div></div>}
              {strategy.averageR !== null && <div><span className="text-gray-600">Avg R</span><div className="text-blue-400 font-medium">{strategy.averageR}R</div></div>}
              {strategy.sampleSize !== null && <div><span className="text-gray-600">Trades</span><div className="text-gray-300 font-medium">{strategy.sampleSize}</div></div>}
            </div>
          </>
        )}

        <div className="text-xs text-blue-500 group-hover:text-blue-400 flex items-center gap-1 mt-auto pt-2">
          <span>View full strategy</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </div>
      </div>
    </Link>
  );
}

function ListRow({ strategy, index }: { strategy: TradingStrategy, index: number }) {
  let tickers: string[] = [];
  try { if (strategy.instruments) tickers = JSON.parse(strategy.instruments); } catch(e) {}

  return (
    <Link href={`/trading/strategy/${strategy.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-blue-700/60 transition-all hover:shadow-md hover:shadow-black/20 flex items-center gap-5 cursor-pointer">
        <div className="text-gray-600 font-bold text-lg w-6 flex-shrink-0 text-right">{index + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors">
              {strategy.name || 'Untitled Strategy'}
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
              strategy.status === 'active' ? 'bg-green-900/40 text-green-400' : 
              strategy.status === 'testing' ? 'bg-yellow-900/40 text-yellow-400' : 
              'bg-gray-800 text-gray-400'
            }`}>
              {strategy.status}
            </span>
            <TickerBadges tickers={tickers} />
          </div>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
            Updated {format(new Date(strategy.updatedAt), 'MMM d, yyyy')}
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-xs flex-shrink-0">
          {strategy.winRate !== null && <div className="text-center"><div className="text-gray-600">Win Rate</div><div className="text-white font-medium">{strategy.winRate}%</div></div>}
          {strategy.averageR !== null && <div className="text-center"><div className="text-gray-600">Avg R</div><div className="text-blue-400 font-medium">{strategy.averageR}R</div></div>}
        </div>
        
        <span className="material-symbols-outlined text-gray-600 group-hover:text-blue-400 transition-colors">chevron_right</span>
      </div>
    </Link>
  );
}

export function StrategyPlaybook({ strategies }: { strategies: TradingStrategy[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredStrategies = strategies.filter(s => {
    const q = filter.toLowerCase();
    const nameMatch = s.name.toLowerCase().includes(q);
    const instrumentMatch = s.instruments ? s.instruments.toLowerCase().includes(q) : false;
    return nameMatch || instrumentMatch || !q;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">search</span>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search strategies or pairs..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Grid view"
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="List view"
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <span className="material-symbols-outlined">add</span>
            New Strategy
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold">Create Strategy</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-2">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <StrategyForm 
                isCompact={true}
                onSave={(newId) => {
                  setIsModalOpen(false);
                  if (newId) router.push(`/trading/strategy/${newId}`);
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {strategies.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center mt-8">
          <div className="text-gray-400 mb-4">No strategies defined yet.</div>
          <button onClick={() => setIsModalOpen(true)} className="text-blue-500 hover:underline font-medium">
            Define your first trading strategy.
          </button>
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No strategies found matching "{filter}".</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-12">
          {filteredStrategies.map(s => <GridCard key={s.id} strategy={s} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-12">
          {filteredStrategies.map((s, i) => <ListRow key={s.id} strategy={s} index={i} />)}
        </div>
      )}
    </div>
  );
}
