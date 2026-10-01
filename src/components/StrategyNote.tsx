"use client";

import React, { useState, useTransition } from 'react';
import { upsertJournalEntry } from '@/app/actions/journal';

type CheckItem = { id: string; text: string; checked: boolean };

function parseList(str: string): CheckItem[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => typeof item === 'string' 
        ? { id: crypto.randomUUID(), text: item, checked: false } 
        : item
      );
    }
  } catch (e) {
    // legacy string fallback
  }
  return [{ id: crypto.randomUUID(), text: str, checked: false }];
}

export function StrategyNote({
  ticker,
  dateStr,
  initialData
}: {
  ticker?: string;
  dateStr: string;
  initialData?: {
    id?: string;
    title?: string | null;
    analysis: string;
    entryPlan: string;
    exitPlan: string;
  } | null;
}) {
  const [isEditing, setIsEditing] = useState(!initialData);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [analysis, setAnalysis] = useState<CheckItem[]>(parseList(initialData?.analysis || ''));
  const [entryPlan, setEntryPlan] = useState<CheckItem[]>(parseList(initialData?.entryPlan || ''));
  const [exitPlan, setExitPlan] = useState<CheckItem[]>(parseList(initialData?.exitPlan || ''));

  const handleSave = () => {
    startTransition(async () => {
      setStatus('idle');
      const res = await upsertJournalEntry({
        id: initialData?.id,
        ticker,
        dateStr,
        analysis: JSON.stringify(analysis),
        entryPlan: JSON.stringify(entryPlan),
        exitPlan: JSON.stringify(exitPlan)
      });
      if (res.success) {
        setStatus('saved');
        setIsEditing(false);
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    });
  };

  const toggleCheck = async (section: 'analysis' | 'entry' | 'exit', id: string) => {
    const updater = (list: CheckItem[]) => list.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    
    let newAnalysis = analysis;
    let newEntry = entryPlan;
    let newExit = exitPlan;

    if (section === 'analysis') { newAnalysis = updater(analysis); setAnalysis(newAnalysis); }
    if (section === 'entry') { newEntry = updater(entryPlan); setEntryPlan(newEntry); }
    if (section === 'exit') { newExit = updater(exitPlan); setExitPlan(newExit); }

    // Auto-save checkbox state even in read mode
    if (!isEditing) {
      await upsertJournalEntry({
        id: initialData?.id,
        ticker,
        dateStr,
        analysis: JSON.stringify(newAnalysis),
        entryPlan: JSON.stringify(newEntry),
        exitPlan: JSON.stringify(newExit)
      });
    }
  };

  const renderSection = (
    title: string, 
    items: CheckItem[], 
    setItems: React.Dispatch<React.SetStateAction<CheckItem[]>>, 
    sectionKey: 'analysis' | 'entry' | 'exit'
  ) => {
    const addItem = () => {
      setItems([...items, { id: crypto.randomUUID(), text: '', checked: false }]);
    };

    const updateItem = (id: string, text: string) => {
      setItems(items.map(item => item.id === id ? { ...item, text } : item));
    };

    const deleteItem = (id: string) => {
      setItems(items.filter(item => item.id !== id));
    };

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
          {sectionKey === 'analysis' && <span className="material-symbols-outlined text-purple-400">psychology</span>}
          {sectionKey === 'entry' && <span className="material-symbols-outlined text-green-400">login</span>}
          {sectionKey === 'exit' && <span className="material-symbols-outlined text-red-400">logout</span>}
          {title}
        </h3>
        
        {items.length === 0 && !isEditing && (
          <p className="text-gray-500 italic text-sm mb-4">No items added yet.</p>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 group">
              <button 
                onClick={() => toggleCheck(sectionKey, item.id)}
                className={`mt-1 flex-shrink-0 w-5 h-5 rounded border ${
                  item.checked 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-gray-600 hover:border-blue-400'
                } flex items-center justify-center transition-colors`}
              >
                {item.checked && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
              
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter item..."
                  />
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-500 hover:text-red-400 p-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ) : (
                <div className={`flex-1 text-sm py-1 ${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {item.text}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {isEditing && (
          <button 
            onClick={addItem}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Item
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold">Strategy & Journal</h2>
          <p className="text-sm text-gray-400 mt-1">Record and track your checklist for this setup</p>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-green-500 text-sm font-medium">✓ Saved</span>}
          {status === 'error' && <span className="text-red-500 text-sm font-medium">Error</span>}
          
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
            >
              {isPending ? 'Saving...' : 'Save Strategy'}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {renderSection("Analysis", analysis, setAnalysis, 'analysis')}
        {renderSection("Entry Plan", entryPlan, setEntryPlan, 'entry')}
        {renderSection("Exit Plan", exitPlan, setExitPlan, 'exit')}
      </div>
    </div>
  );
}
