"use client";

import React from 'react';
import Link from 'next/link';
import { format, isSameDay } from 'date-fns';
import { JournalEntry } from '@prisma/client';

function RenderList({ dataStr, fallback }: { dataStr: string, fallback: string }) {
  if (!dataStr) return <span className="italic text-gray-600">{fallback}</span>;
  
  let items: { id: string; text: string; checked: boolean }[] = [];
  try {
    const parsed = JSON.parse(dataStr);
    if (Array.isArray(parsed)) {
      items = parsed.map(item => typeof item === 'string' ? { id: crypto.randomUUID(), text: item, checked: false } : item);
    } else {
      items = [{ id: '1', text: dataStr, checked: false }];
    }
  } catch {
    items = [{ id: '1', text: dataStr, checked: false }];
  }

  if (items.length === 0) return <span className="italic text-gray-600">{fallback}</span>;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex gap-2 items-start">
          <span className={`material-symbols-outlined text-[16px] mt-0.5 ${item.checked ? 'text-blue-500' : 'text-gray-600'}`}>
            {item.checked ? 'check_box' : 'check_box_outline_blank'}
          </span>
          <span className={`${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function JournalList({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-4">No journal entries yet.</div>
        <Link href="/watchlist" className="text-blue-500 hover:underline">
          Go to your watchlist to add a strategy note.
        </Link>
      </div>
    );
  }

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    // Get the YYYY-MM-DD part of the UTC date to ignore timezone shifts
    const dateKey = new Date(entry.date).toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="w-[98%] mx-auto space-y-12 pb-12">
      {sortedDates.map(dateKey => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayEntries = grouped[dateKey];
        const isToday = isSameDay(dateObj, new Date());

        return (
          <div key={dateKey} className="relative pl-8 md:pl-0">
            {/* Timeline Line (visible on desktop) */}
            <div className="hidden md:block absolute left-[120px] top-0 bottom-[-48px] w-px bg-gray-800"></div>

            <div className="md:flex md:gap-8 items-start relative">
              {/* Date Marker */}
              <div className="md:w-[120px] md:text-right shrink-0 pt-1 mb-4 md:mb-0 relative">
                <div className="hidden md:block absolute right-[-4px] top-[10px] w-2 h-2 rounded-full bg-blue-500 z-10 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                
                <h3 className={`font-bold text-lg ${isToday ? 'text-blue-400' : 'text-white'}`}>
                  {isToday ? 'Today' : format(dateObj, 'MMM d')}
                </h3>
                <div className="text-sm text-gray-500 font-medium">{format(dateObj, 'yyyy')}</div>
                <div className="text-xs text-gray-600 mt-1 uppercase tracking-wider">{format(dateObj, 'EEEE')}</div>
              </div>

              {/* Entries for the day */}
              <div className="flex-1 space-y-6">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors shadow-lg shadow-black/50">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800/50">
                      <h4 className="font-bold text-xl text-blue-400 flex items-center gap-2">
                        {entry.ticker ? (
                          <>
                            <span className="material-symbols-outlined text-gray-500 text-[20px]">show_chart</span>
                            <Link href={`/watchlist/${entry.ticker}`} className="hover:underline">
                              {entry.ticker}
                            </Link>
                          </>
                        ) : 'General Market Note'}
                      </h4>
                      {entry.ticker && (
                        <Link 
                          href={`/journal/${entry.id}`} 
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Edit
                        </Link>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-purple-400">psychology</span>
                          Analysis
                        </div>
                        <div className="text-sm text-gray-300 bg-gray-950 p-4 rounded-md border border-gray-800/30 min-h-[80px]">
                          <RenderList dataStr={entry.analysis} fallback="No analysis provided" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-green-400">login</span>
                          Entry Plan
                        </div>
                        <div className="text-sm text-gray-300 bg-gray-950 p-4 rounded-md border border-gray-800/30 min-h-[80px]">
                          <RenderList dataStr={entry.entryPlan} fallback="No entry plan provided" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-red-400">logout</span>
                          Exit Plan
                        </div>
                        <div className="text-sm text-gray-300 bg-gray-950 p-4 rounded-md border border-gray-800/30 min-h-[80px]">
                          <RenderList dataStr={entry.exitPlan} fallback="No exit plan provided" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
