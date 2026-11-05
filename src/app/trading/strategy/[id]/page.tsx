import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { EditStrategyModal } from '@/components/EditStrategyModal';
import { StrategyImageGallery } from '@/components/StrategyImageGallery';
import { ExpandableSectionBlock as SectionBlock } from '@/components/ExpandableSectionBlock';
import { ExpandableText } from '@/components/ExpandableText';

export const dynamic = 'force-dynamic';

export default async function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const strategy = await prisma.tradingStrategy.findUnique({ 
    where: { id },
    include: { journalEntries: true } // Fetch linked trades
  });
  if (!strategy) return notFound();

  let rawTickers: any[] = [];
  try { if (strategy.instruments) rawTickers = JSON.parse(strategy.instruments); } catch(e) {}
  
  // Backward compatibility: map strings to {name, link} objects
  const tickers = rawTickers.map(t => typeof t === 'string' ? { name: t, link: '' } : t);
  const isGeneral = tickers.length === 0;

  const ListSectionBlock = ({ title, icon, content, section }: { title: string, icon: string, content?: string | null, section?: 'identity' | 'instruments' | 'thesis' | 'criteria' | 'execution' | 'risk' | 'performance' }) => {
    let items: string[] = [];
    try { items = content ? JSON.parse(content) : []; } catch(e) { items = content ? [content] : []; }
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className={`material-symbols-outlined text-[16px]`}>{icon}</span>
          {title}
        </h2>
        {items.length > 0 ? (
          <ul className="space-y-3 text-gray-300 text-sm">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 items-start min-w-0">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer accent-blue-600 shrink-0" />
                <div className="leading-relaxed pt-0.5 flex-1 min-w-0">
                  <ExpandableText content={item} title={title} icon={icon} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-sm italic">Not specified</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] max-w-6xl mx-auto pb-16">

        <div className="flex justify-between items-center mb-8">
          <Link href="/trading/strategy" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Playbook
          </Link>
        </div>

        {/* 1. Identity & Hero */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1 pr-12">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{strategy.name || 'Untitled Strategy'}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  strategy.status === 'active' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 
                  strategy.status === 'testing' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50' : 
                  'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                  {strategy.status}
                </span>
                <EditStrategyModal strategy={strategy} section="identity" />
              </div>
              <p className="text-gray-500 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px]">history</span>
                Last updated {format(new Date(strategy.updatedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* 2. Thesis */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">lightbulb</span> Thesis & Edge
                </div>
                <EditStrategyModal strategy={strategy} section="thesis" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SectionBlock title="Target Condition" icon="target" content={strategy.targetCondition} section="thesis" />
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[16px]">schedule</span> Timeframes
                  </h2>
                  {(() => {
                    let parsedTFs: string[] = [];
                    try { parsedTFs = strategy.timeframes ? JSON.parse(strategy.timeframes) : []; } catch(e) {}
                    if (parsedTFs.length === 0) return <span className="text-gray-600 italic">Not specified</span>;
                    return (
                      <div className="flex flex-wrap gap-2">
                        {parsedTFs.map(tf => (
                          <span key={tf} className="bg-blue-900/40 border border-blue-800/50 text-blue-300 px-2 py-1 rounded text-xs font-bold">{tf}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[16px]">history_toggle_off</span> Time Frame Bias
                  </h2>
                  {(() => {
                    let parsedBiases: Record<string, string> = {};
                    try { parsedBiases = strategy.timeframeBias ? JSON.parse(strategy.timeframeBias) : {}; } catch(e) {}
                    const keys = Object.keys(parsedBiases).filter(k => parsedBiases[k]);
                    if (keys.length === 0) return <span className="text-gray-600 italic">Not specified</span>;
                    return (
                      <ul className="space-y-3">
                        {keys.map(tf => (
                          <li key={tf} className="flex gap-3 items-start bg-gray-950/50 p-3 rounded-lg border border-gray-800/50">
                            <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer accent-blue-600 shrink-0" />
                            <span className="inline-block bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">{tf}</span>
                            <div className="text-gray-300 text-sm leading-relaxed pt-0.5 flex-1 min-w-0">
                              <ExpandableText content={parsedBiases[tf]} title="Time Frame Bias" icon="history_toggle_off" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
                <SectionBlock title="The Edge" icon="psychology" content={strategy.edge} section="thesis" />
              </div>
            </div>

            {/* 3. Setup Criteria */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">checklist</span> Setup Criteria
                </div>
                <EditStrategyModal strategy={strategy} section="criteria" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SectionBlock title="Required Structure" icon="analytics" content={strategy.requiredStructure} section="criteria" />
                <SectionBlock title="Confirming Signals" icon="check_circle" content={strategy.confirmingSignals} section="criteria" />
              </div>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <ListSectionBlock title="Execution Checklist" icon="task_alt" content={strategy.checklist} section="criteria" />
                <ListSectionBlock title="Strict Skip Checklist" icon="rule" content={strategy.skipChecklist} section="criteria" />
              </div>
            </div>

            {/* 4 & 5. Entry & Exit Rules */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">sync_alt</span> Execution Rules
                </div>
                <EditStrategyModal strategy={strategy} section="execution" />
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SectionBlock title="Trigger Condition" icon="bolt" content={strategy.triggerCondition} section="execution" />
                <SectionBlock title="Entry Method" icon="login" content={strategy.entryMethod} section="execution" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SectionBlock title="Stop-Loss Logic" icon="trending_down" content={strategy.stopLossLogic} section="execution" />
                <SectionBlock title="Take-Profit Logic" icon="trending_up" content={strategy.takeProfitLogic} section="execution" />
                <SectionBlock title="Invalidation" icon="block" content={strategy.invalidation} section="execution" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Sidebar: Instruments */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                Instruments / Pairs
                <EditStrategyModal strategy={strategy} section="instruments" />
              </h2>
              {isGeneral ? (
                <span className="bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full text-sm font-medium">General / Any</span>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {tickers.map(t => (
                    <div key={t.name} className="flex flex-col gap-1 items-start">
                      <a href={`/watchlist/${t.name}`} className="bg-blue-900/40 border border-blue-800/50 text-blue-300 hover:bg-blue-800/60 px-3 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">monitoring</span> {t.name}
                      </a>
                      {t.link && (
                        <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-purple-400 hover:text-purple-300 pl-2 flex items-center gap-1 transition-colors">
                          <span className="material-symbols-outlined text-[12px]">public</span> External Chart
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: Risk Parameters */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                Risk Parameters
                <EditStrategyModal strategy={strategy} section="risk" />
              </h2>
              <ul className="space-y-4">
                <li>
                  <div className="text-xs text-gray-500 mb-1">Max Risk Per Trade</div>
                  <div className="text-lg font-bold">{strategy.maxRiskPerTrade ? `${strategy.maxRiskPerTrade}%` : '—'}</div>
                </li>
                <li>
                  <div className="text-xs text-gray-500 mb-1">Max Concurrent Positions</div>
                  <div className="text-lg font-bold">{strategy.maxConcurrent ?? '—'}</div>
                </li>
                <li>
                  <div className="text-xs text-gray-500 mb-1">Correlation Rules</div>
                  <div className="text-sm font-medium">
                    <ExpandableText content={strategy.correlationRules || ''} title="Correlation Rules" icon="account_tree" />
                  </div>
                </li>
              </ul>
            </div>

            {/* Sidebar: Performance Record */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                Performance Record
                <EditStrategyModal strategy={strategy} section="performance" />
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-white">{strategy.winRate !== null ? `${strategy.winRate}%` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Expectancy</div>
                  <div className="text-xl font-bold text-white">{strategy.expectancy !== null ? strategy.expectancy : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Average R</div>
                  <div className="text-xl font-bold text-blue-400">{strategy.averageR !== null ? `${strategy.averageR}R` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Sample Size</div>
                  <div className="text-xl font-bold text-gray-400">{strategy.sampleSize ?? '—'}</div>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4 mt-2">
                <div className="text-xs text-gray-500 mb-1">Known Weaknesses</div>
                <div className="text-sm text-gray-300">
                  <ExpandableText content={strategy.weaknesses || ''} title="Known Weaknesses" icon="warning" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 8. Linked Trades */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
            <span className="material-symbols-outlined text-blue-500">receipt_long</span> Linked Trades
          </h3>
          {strategy.journalEntries && strategy.journalEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategy.journalEntries.map(entry => (
                <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{entry.ticker || 'General Note'}</span>
                    <span className="text-xs text-gray-500">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                  </div>
                  {entry.realizedPnL !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">PnL:</span>
                      <span className={`font-bold ${entry.realizedPnL > 0 ? 'text-green-400' : entry.realizedPnL < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        ${entry.realizedPnL}
                      </span>
                    </div>
                  )}
                  {entry.followedPlan !== null && (
                    <div className="mt-1 text-xs">
                      Followed Plan: <span className={entry.followedPlan ? 'text-green-400' : 'text-red-400'}>{entry.followedPlan ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No journal entries linked to this strategy yet.
            </div>
          )}
        </div>

        {/* 9. Image Gallery */}
        <StrategyImageGallery strategyId={strategy.id} initialImagesStr={strategy.images} />

      </div>
    </div>
  );
}
