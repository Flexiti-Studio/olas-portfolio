"use client";

import React, { useState } from 'react';
import { JournalEntryForm, JournalInitialData } from './JournalEntryForm';

export function JournalEntryModalWrapper({
  ticker,
  dateStr,
  initialData
}: {
  ticker?: string;
  dateStr: string;
  initialData?: JournalInitialData | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg"
        >
          <span className="material-symbols-outlined text-[20px]">
            {initialData ? 'edit_document' : 'post_add'}
          </span>
          {initialData ? 'Edit Journal Entry' : 'Create Journal Entry'}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-gray-950 rounded-xl shadow-2xl border border-gray-800 custom-scrollbar">
            {/* Header / Close button */}
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-white">Journal Entry</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            
            {/* The Form */}
            <div className="p-2">
              <JournalEntryForm
                ticker={ticker}
                dateStr={dateStr}
                initialData={initialData}
                onSave={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
