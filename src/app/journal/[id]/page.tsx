import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EditJournalModal } from '@/components/EditJournalModal';
import { format } from 'date-fns';
import { JournalImageGallery } from '@/components/JournalImageGallery';

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const journalEntry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { strategy: true }
  });

  if (!journalEntry) {
    notFound();
  }

  // Fetch WatchlistItem info if a ticker is present
  const pairInfo = journalEntry.ticker 
    ? await prisma.watchlistItem.findUnique({ where: { ticker: journalEntry.ticker } })
    : null;

  const SectionBlock = ({ title, icon, content }: { title: string, icon: string, content?: string | null }) => {
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
              <li key={i} className="flex gap-3 items-start">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer accent-blue-600 shrink-0" />
                <span className="leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 italic">Not specified</p>
        )}
      </div>
    );
  };

  const isWin = journalEntry.realizedPnL !== null && journalEntry.realizedPnL > 0;
  const isLoss = journalEntry.realizedPnL !== null && journalEntry.realizedPnL < 0;

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] max-w-7xl mx-auto pb-16">
        
        <div className="flex justify-between items-center mb-8">
          <Link href="/journal" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Journal
          </Link>
        </div>

        {/* 1. Identity & Hero */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1 pr-12">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{journalEntry.title || `${journalEntry.ticker || 'General'} Trade`}</h1>
                <EditJournalModal entry={journalEntry} />
              </div>
              <p className="text-gray-500 flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {format(new Date(journalEntry.date), 'MMMM d, yyyy')}
              </p>
            </div>
            
            <div className="flex gap-4 shrink-0 bg-gray-950 p-4 rounded-xl border border-gray-800">
              <div className="text-center px-4 border-r border-gray-800">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">PnL</div>
                <div className={`text-2xl font-bold ${isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-gray-300'}`}>
                  {journalEntry.realizedPnL !== null ? `$${journalEntry.realizedPnL}` : '—'}
                </div>
              </div>
              <div className="text-center px-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Followed Plan</div>
                <div className={`text-xl font-bold mt-1 ${journalEntry.followedPlan === true ? 'text-green-400' : journalEntry.followedPlan === false ? 'text-red-400' : 'text-gray-300'}`}>
                  {journalEntry.followedPlan === true ? 'Yes' : journalEntry.followedPlan === false ? 'No' : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* 2. Pre-Trade */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500">psychology</span> Pre-Trade Plan
                </div>
                <EditJournalModal entry={journalEntry} />
              </h3>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <SectionBlock title="Analysis" icon="analytics" content={journalEntry.analysis} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SectionBlock title="Entry Plan" icon="login" content={journalEntry.entryPlan} />
                <SectionBlock title="Exit Plan" icon="logout" content={journalEntry.exitPlan} />
              </div>
            </div>

            {/* 3. Execution Details */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">bolt</span> Execution Details
                </div>
                <EditJournalModal entry={journalEntry} />
              </h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Planned Entry</div>
                    <div className="text-lg font-bold text-gray-300">{journalEntry.plannedEntry ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Actual Entry</div>
                    <div className="text-lg font-bold text-white">{journalEntry.actualEntry ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Stop Loss</div>
                    <div className="text-lg font-bold text-red-400">{journalEntry.stopLoss ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Take Profit</div>
                    <div className="text-lg font-bold text-green-400">{journalEntry.takeProfit ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Position Size</div>
                    <div className="text-lg font-bold text-gray-300">{journalEntry.positionSize ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Risk Percent</div>
                    <div className="text-lg font-bold text-gray-300">{journalEntry.riskPercent ? `${journalEntry.riskPercent}%` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Actual Exit</div>
                    <div className="text-lg font-bold text-white">{journalEntry.actualExit ?? '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Review & Reflection */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">rate_review</span> Review & Reflection
                </div>
                <EditJournalModal entry={journalEntry} />
              </h3>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Emotional State</div>
                    <div className="text-sm font-bold text-gray-300">{journalEntry.emotionalState || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Confidence Level</div>
                    <div className="text-sm font-bold text-gray-300">{journalEntry.confidenceLevel || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Would Repeat?</div>
                    <div className="text-sm font-bold text-gray-300">
                      {journalEntry.wouldRepeat === true ? 'Yes' : journalEntry.wouldRepeat === false ? 'No' : '—'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SectionBlock title="General Notes" icon="notes" content={journalEntry.notes} />
                <SectionBlock title="Lessons Learned" icon="school" content={journalEntry.lessonLearned} />
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-blue-500">info</span>
                Pair Information
              </h2>
              
              {journalEntry.ticker ? (
                <>
                  <div className="mb-4 pb-4 border-b border-gray-800">
                    <div className="text-2xl font-bold text-white flex items-center gap-2">
                      {journalEntry.ticker}
                    </div>
                  </div>
                  
                  {pairInfo ? (
                    <div>
                      <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">Watchlist Notes</h4>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {pairInfo.notes || 'No specific notes saved for this pair in the watchlist.'}
                      </p>
                      <div className="mt-6">
                        <Link href={`/watchlist/${journalEntry.ticker}`} className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span> Go to Pair Dashboard
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      This pair is not currently in your active watchlist.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 text-sm">
                  This journal entry is a general market note (no specific pair selected).
                </div>
              )}
            </div>

            {/* Strategy Info Sidebar */}
            {journalEntry.strategy && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-purple-500">extension</span>
                  Linked Strategy
                </h2>
                <div className="mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    journalEntry.strategy.status === 'active' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 
                    journalEntry.strategy.status === 'testing' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50' : 
                    'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {journalEntry.strategy.status}
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-2">{journalEntry.strategy.name}</div>
                {journalEntry.strategy.edge && (
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                    {journalEntry.strategy.edge}
                  </p>
                )}
                <Link href={`/trading/strategy/${journalEntry.strategy.id}`} className="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">menu_book</span> View Strategy Playbook
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 5. Image Gallery */}
        <div className="mt-8">
          <JournalImageGallery 
            journalId={journalEntry.id} 
            dateStr={new Date(journalEntry.date).toISOString().split('T')[0]} 
            initialImagesStr={journalEntry.images} 
          />
        </div>
      </div>
    </div>
  );
}
