"use client";

import React, { useState } from 'react';
import { JournalEntryForm } from './JournalEntryForm';
import { JournalEntry } from '@prisma/client';
import { useRouter } from 'next/navigation';

export function EditJournalModal({ entry }: { entry: JournalEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center"
        title="Edit Journal Entry"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">Edit Journal Entry</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          <JournalEntryForm 
            dateStr={new Date(entry.date).toISOString().split('T')[0]}
            initialData={entry as any}
            onSave={() => {
              router.refresh();
              setTimeout(() => setIsOpen(false), 800);
            }} 
          />
        </div>
      </div>
    </div>
  );
}
