"use client";

import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, 
  startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, startOfWeek, endOfWeek 
} from 'date-fns';
import { JournalEntry } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JournalEntryForm } from '@/components/JournalEntryForm';

function getAnalysisPreview(analysisStr: string) {
  if (!analysisStr || analysisStr === '[]' || analysisStr === '"{}"') return "No analysis provided.";
  try {
    const parsed = JSON.parse(analysisStr);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        if (typeof parsed[0] === 'string') return parsed[0];
        if (parsed[0].text) return parsed[0].text;
      }
      return "No analysis provided.";
    }
  } catch(e) {}
  return analysisStr;
}

export function MiniCalendar({ entries }: { entries: JournalEntry[] }) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingGeneralEntry, setEditingGeneralEntry] = useState<JournalEntry | null>(null);
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  React.useEffect(() => {
    setLoadingEntryId(null);
  }, [selectedDay]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDayEntries = selectedDay 
    ? entries.filter(e => new Date(e.date).toISOString().split('T')[0] === format(selectedDay, 'yyyy-MM-dd')) 
    : [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-[98%] mx-auto mt-12 relative">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors">&larr;</button>
        <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={nextMonth} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors">&rarr;</button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-800 mb-px rounded-t-lg overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="bg-gray-950 py-2 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-800 border-x border-b border-gray-800 rounded-b-lg overflow-hidden">
        {days.map((day, idx) => {
          const currentDayStr = format(day, 'yyyy-MM-dd');
          const dayEntries = entries.filter(e => {
            const entryDate = new Date(e.date);
            // Get the YYYY-MM-DD part of the UTC date to ignore timezone shifts
            const entryDateStr = entryDate.toISOString().split('T')[0];
            return entryDateStr === currentDayStr;
          });
          const hasEntries = dayEntries.length > 0;
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={idx}
              onClick={() => hasEntries ? setSelectedDay(day) : null}
              className={`bg-gray-900 min-h-[80px] p-2 transition-colors ${
                !inMonth ? 'opacity-30' : ''
              } ${hasEntries ? 'cursor-pointer hover:bg-gray-800' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {dayEntries.slice(0, 3).map((e: any) => {
                  let dotColor = 'bg-gray-500'; // setup only
                  if (e.realizedPnL !== null && e.realizedPnL !== undefined) {
                    dotColor = e.realizedPnL > 0 ? 'bg-green-500' : (e.realizedPnL < 0 ? 'bg-red-500' : 'bg-gray-400');
                  }
                  return (
                    <div key={e.id} className={`w-2.5 h-2.5 rounded-full ${dotColor}`} title={e.ticker || 'General Note'} />
                  );
                })}
                {dayEntries.length > 3 && (
                  <div className="text-[10px] text-gray-500">+{dayEntries.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Click Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-2xl font-bold">Journal Entries: {format(selectedDay, 'MMM d, yyyy')}</h2>
              <button onClick={() => { setSelectedDay(null); setEditingGeneralEntry(null); setLoadingEntryId(null); }} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {editingGeneralEntry ? (
                <div>
                  <button onClick={() => setEditingGeneralEntry(null)} className="mb-4 text-sm text-gray-400 hover:text-white flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to list
                  </button>
                  <JournalEntryForm 
                    ticker={editingGeneralEntry.ticker || undefined} 
                    dateStr={format(selectedDay, 'yyyy-MM-dd')}
                    initialData={editingGeneralEntry as any}
                  />
                </div>
              ) : (
                selectedDayEntries.map((entry: any) => (
                  <div key={entry.id} className="bg-gray-950 border border-gray-800 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-blue-400">{entry.ticker || "General Note"}</span>
                          {entry.realizedPnL !== null && entry.realizedPnL !== undefined && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${entry.realizedPnL > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {entry.realizedPnL > 0 ? '+' : ''}{entry.realizedPnL} P&L
                            </span>
                          )}
                          {entry.emotionalState && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-bold">{entry.emotionalState}</span>
                          )}
                        </div>
                        {entry.title && (
                          <span className="text-sm font-medium text-gray-300">{entry.title}</span>
                        )}
                      </div>
                      
                      <Link 
                        href={`/journal/${entry.id}`}
                        onClick={() => setLoadingEntryId(entry.id)}
                        className={`px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-2 ${loadingEntryId === entry.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {loadingEntryId === entry.id ? (
                          <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Opening...</>
                        ) : (
                          <><span className="material-symbols-outlined text-[16px]">open_in_new</span> Open Entry</>
                        )}
                      </Link>
                    </div>
                    <p className="text-gray-400 text-sm italic truncate">
                      "{getAnalysisPreview(entry.analysis)}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
