import React from 'react';
import { prisma } from '@/lib/prisma';
import { JournalList } from './JournalList';
import { MiniCalendar } from './MiniCalendar';
import { JournalEntryForm } from '@/components/JournalEntryForm';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const entries = await prisma.journalEntry.findMany({
    orderBy: { date: 'desc' }
  });

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] mx-auto mb-8 flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Trading Journal</h1>
          <p className="text-gray-400">Review your past strategies, entries, and exit plans.</p>
        </div>
      </div>
      
      <div className="w-[98%] mx-auto mb-12">
        <JournalEntryForm dateStr={new Date().toISOString().split('T')[0]} />
      </div>

      <div className="w-[98%] mx-auto">
        <JournalList entries={entries} />
        <MiniCalendar entries={entries} />
      </div>
    </div>
  );
}
