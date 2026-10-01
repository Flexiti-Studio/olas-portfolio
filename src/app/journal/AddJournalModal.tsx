"use client";

import React, { useState, useTransition } from 'react';
import { upsertJournalEntry } from '@/app/actions/journal';

export function AddJournalModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  const [analysis, setAnalysis] = useState('[]');
  const [entryPlan, setEntryPlan] = useState('[]');
  const [exitPlan, setExitPlan] = useState('[]');

  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await upsertJournalEntry({
        dateStr: new Date().toISOString().split('T')[0],
        analysis,
        entryPlan,
        exitPlan
      });
      if (res.success) {
        setIsOpen(false);
        // Reset form
        setAnalysis('[]');
        setEntryPlan('[]');
        setExitPlan('[]');
      }
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        Add Journal Note
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-2xl font-bold">New General Market Note</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Analysis</label>
                <textarea
                  value={analysis === '[]' ? '' : analysis}
                  onChange={e => setAnalysis(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-md p-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="General market thoughts..."
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Entry Plan</label>
                <textarea
                  value={entryPlan === '[]' ? '' : entryPlan}
                  onChange={e => setEntryPlan(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-md p-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Macro entry plans..."
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Exit Plan</label>
                <textarea
                  value={exitPlan === '[]' ? '' : exitPlan}
                  onChange={e => setExitPlan(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-md p-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Macro exit conditions..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-950/50">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
