"use client";

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { upsertJournalEntry } from '@/app/actions/journal';
import { getJournalTickers } from '@/app/actions/getTickers';

export type JournalInitialData = {
  id?: string;
  title?: string | null;
  ticker?: string | null;
  analysis: string;
  entryPlan: string;
  exitPlan: string;
  plannedEntry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  positionSize?: number | null;
  riskPercent?: number | null;
  actualEntry?: number | null;
  actualExit?: number | null;
  realizedPnL?: number | null;
  followedPlan?: boolean | null;
  emotionalState?: string | null;
  confidenceLevel?: string | null;
  lessonLearned?: string | null;
  notes?: string | null;
  wouldRepeat?: boolean | null;
  updatedAt?: Date;
};

type CheckItem = { id: string; text: string; checked: boolean };

function parseList(str: string): CheckItem[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map(item => typeof item === 'string' 
        ? { id: crypto.randomUUID(), text: item, checked: false } 
        : item
      );
    }
  } catch (e) {}
  return [{ id: crypto.randomUUID(), text: str, checked: false }];
}

export function JournalEntryForm({
  ticker: defaultTicker,
  dateStr,
  initialData,
  onSave
}: {
  ticker?: string;
  dateStr: string;
  initialData?: JournalInitialData | null;
  onSave?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(!initialData);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Ticker state
  const [title, setTitle] = useState(initialData?.title || '');
  const initialTickerList = initialData?.ticker ? [initialData.ticker] : (defaultTicker ? [defaultTicker] : []);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(initialTickerList);
  const [tickers, setTickers] = useState<{watchlisted: string[], others: string[]}>({watchlisted: [], others: []});
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Setup state
  const [analysis, setAnalysis] = useState<CheckItem[]>(parseList(initialData?.analysis || ''));
  const [entryPlan, setEntryPlan] = useState<CheckItem[]>(parseList(initialData?.entryPlan || ''));
  const [exitPlan, setExitPlan] = useState<CheckItem[]>(parseList(initialData?.exitPlan || ''));

  // Planned numbers state
  const [plannedEntry, setPlannedEntry] = useState<string>(initialData?.plannedEntry?.toString() || '');
  const [stopLoss, setStopLoss] = useState<string>(initialData?.stopLoss?.toString() || '');
  const [takeProfit, setTakeProfit] = useState<string>(initialData?.takeProfit?.toString() || '');
  const [positionSize, setPositionSize] = useState<string>(initialData?.positionSize?.toString() || '');
  const [riskPercent, setRiskPercent] = useState<string>(initialData?.riskPercent?.toString() || '');

  // Execution reality
  const [actualEntry, setActualEntry] = useState<string>(initialData?.actualEntry?.toString() || '');
  const [actualExit, setActualExit] = useState<string>(initialData?.actualExit?.toString() || '');
  const [realizedPnL, setRealizedPnL] = useState<string>(initialData?.realizedPnL?.toString() || '');
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(initialData?.followedPlan ?? null);

  // Psychology
  const [emotionalState, setEmotionalState] = useState<string>(initialData?.emotionalState || '');
  const [confidenceLevel, setConfidenceLevel] = useState<string>(initialData?.confidenceLevel || '');
  const [lessonLearned, setLessonLearned] = useState<string>(initialData?.lessonLearned || '');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(initialData?.wouldRepeat ?? null);

  useEffect(() => {
    getJournalTickers().then(res => {
      if (res.success) setTickers({ watchlisted: res.watchlisted, others: res.others });
    });
  }, []);

  const handleSave = () => {
    startTransition(() => {
      setStatus('idle');
      
      const payload = {
        id: initialData?.id,
        title,
        dateStr,
        analysis: JSON.stringify(analysis),
        entryPlan: JSON.stringify(entryPlan),
        exitPlan: JSON.stringify(exitPlan),
        plannedEntry: plannedEntry ? parseFloat(plannedEntry) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        positionSize: positionSize ? parseFloat(positionSize) : null,
        riskPercent: riskPercent ? parseFloat(riskPercent) : null,
        actualEntry: actualEntry ? parseFloat(actualEntry) : null,
        actualExit: actualExit ? parseFloat(actualExit) : null,
        realizedPnL: realizedPnL ? parseFloat(realizedPnL) : null,
        followedPlan,
        emotionalState,
        confidenceLevel,
        lessonLearned,
        notes,
        wouldRepeat
      };

      const tickersToSave = selectedTickers.length > 0 ? selectedTickers : [null];

      const savePromise = Promise.all(
        tickersToSave.map(t => upsertJournalEntry({ ...payload, ticker: t || undefined }))
      );

      toast.promise(savePromise, {
        loading: 'Saving journal entry...',
        success: (results) => {
          if (results.every(res => res.success)) {
            setStatus('saved');
            setIsEditing(false);
            setTimeout(() => setStatus('idle'), 3000);
            onSave?.();
            return 'Journal entry saved successfully!';
          } else {
            setStatus('error');
            throw new Error('Failed to save some entries');
          }
        },
        error: (err) => err.message || 'Failed to save journal entry.',
      });
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

    if (!isEditing) {
      const payload = {
        id: initialData?.id,
        title,
        dateStr,
        analysis: JSON.stringify(newAnalysis),
        entryPlan: JSON.stringify(newEntry),
        exitPlan: JSON.stringify(newExit)
      };
      const tickersToSave = selectedTickers.length > 0 ? selectedTickers : [null];
      await Promise.all(
        tickersToSave.map(t => upsertJournalEntry({ ...payload, ticker: t || undefined }))
      );
    }
  };

  const renderChecklistSection = (title: string, items: CheckItem[], setItems: React.Dispatch<React.SetStateAction<CheckItem[]>>, sectionKey: 'analysis' | 'entry' | 'exit') => {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 mb-3">{title}</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 group">
              <button 
                onClick={() => toggleCheck(sectionKey, item.id)}
                className={`mt-1 flex-shrink-0 w-4 h-4 rounded border ${item.checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-600 hover:border-blue-400'} flex items-center justify-center transition-colors`}
              >
                {item.checked && <span className="material-symbols-outlined text-[12px]">check</span>}
              </button>
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <input type="text" value={item.text} onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, text: e.target.value } : i))} className="flex-1 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Enter item..." />
                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-gray-500 hover:text-red-400 p-1.5"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              ) : (
                <div className={`flex-1 text-sm py-0.5 ${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{item.text}</div>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <button onClick={() => setItems([...items, { id: crypto.randomUUID(), text: '', checked: false }])} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">add</span> Add Item
          </button>
        )}
      </div>
    );
  };

  const emotionChips = ['Confident', 'FOMO', 'Revenge', 'Bored', 'Calm'];
  const confidenceChips = ['LOW', 'MEDIUM', 'HIGH'];

  const watchlistedMatches = tickers.watchlisted.filter(t => t.toLowerCase().includes(pickerSearch.toLowerCase()));
  const otherMatches = tickers.others.filter(t => t.toLowerCase().includes(pickerSearch.toLowerCase()));

  const toggleTicker = (t: string) => {
    setSelectedTickers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  
  const isCustomTickerNew = pickerSearch.trim() !== '' && 
    !tickers.watchlisted.some(t => t.toLowerCase() === pickerSearch.toLowerCase()) && 
    !tickers.others.some(t => t.toLowerCase() === pickerSearch.toLowerCase());

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Strategy Name (e.g. Breakout Play)" 
                className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xl font-bold text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600 w-full max-w-sm"
              />
            ) : (
              <h2 className="text-xl font-bold">{title || "Trade Journal"}</h2>
            )}
            <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-medium">{dateStr}</span>
          </div>
          
          <div className="relative" ref={pickerRef}>
            {isEditing ? (
              <div>
                <button onClick={() => setIsPickerOpen(!isPickerOpen)} className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm font-medium hover:border-gray-600 transition-colors">
                  {selectedTickers.length > 0 ? selectedTickers.join(", ") : "General Note (No Ticker)"}
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-950 border border-gray-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
                      <input type="text" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search or create..." className="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-white focus:outline-none" />
                    </div>
                    <button onClick={() => { setSelectedTickers([]); setIsPickerOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-800 flex justify-between items-center">
                      General Note (No Ticker)
                      {selectedTickers.length === 0 && <span className="material-symbols-outlined text-[14px] text-blue-500">check</span>}
                    </button>
                    {isCustomTickerNew && (
                      <button onClick={() => { toggleTicker(pickerSearch.toUpperCase()); setPickerSearch(""); }} className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-800 border-b border-gray-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">add</span> Add &quot;{pickerSearch.toUpperCase()}&quot;
                      </button>
                    )}
                    {watchlistedMatches.length > 0 && (
                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">⭐ Watchlist</div>
                        {watchlistedMatches.map(t => (
                          <button key={t} onClick={() => toggleTicker(t)} className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-gray-800 flex justify-between items-center">
                            {t}
                            {selectedTickers.includes(t) && <span className="material-symbols-outlined text-[14px] text-blue-500">check</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {otherMatches.length > 0 && (
                      <div className="py-1 border-t border-gray-800">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">All Tracked Pairs</div>
                        {otherMatches.map(t => (
                          <button key={t} onClick={() => toggleTicker(t)} className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-gray-800 flex justify-between items-center">
                            {t}
                            {selectedTickers.includes(t) && <span className="material-symbols-outlined text-[14px] text-blue-500">check</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-blue-400">{selectedTickers.length > 0 ? selectedTickers.join(', ') : "General Note"}</span>
            )}
            {initialData?.updatedAt && !isEditing && (
              <span className="text-xs text-gray-500 mt-1 block">Last updated: {new Date(initialData.updatedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-green-500 text-sm font-medium">✓ Saved</span>}
          {status === 'error' && <span className="text-red-500 text-sm font-medium">Error</span>}
          
          {isEditing ? (
            <button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-1">
              {isPending ? 'Saving...' : 'Save Journal'}
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">edit</span> Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Setup Section */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderChecklistSection("Analysis", analysis, setAnalysis, 'analysis')}
            {renderChecklistSection("Entry Plan", entryPlan, setEntryPlan, 'entry')}
            {renderChecklistSection("Exit Plan", exitPlan, setExitPlan, 'exit')}
          </div>
        </section>

        {/* Planned Trade Section */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Planned Trade</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Planned Entry</label>
              <input disabled={!isEditing} type="number" step="any" value={plannedEntry} onChange={e => setPlannedEntry(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Stop Loss</label>
              <input disabled={!isEditing} type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Take Profit</label>
              <input disabled={!isEditing} type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Position Size</label>
              <input disabled={!isEditing} type="number" step="any" value={positionSize} onChange={e => setPositionSize(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Risk %</label>
              <input disabled={!isEditing} type="number" step="any" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
          </div>
        </section>

        {/* Execution Section */}
        <section className="bg-gray-950 p-4 rounded-lg border border-gray-800">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Execution Reality</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Actual Entry</label>
              <input disabled={!isEditing} type="number" step="any" value={actualEntry} onChange={e => setActualEntry(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Actual Exit</label>
              <input disabled={!isEditing} type="number" step="any" value={actualExit} onChange={e => setActualExit(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm text-white focus:border-blue-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Realized PnL</label>
              <input disabled={!isEditing} type="number" step="any" value={realizedPnL} onChange={e => setRealizedPnL(e.target.value)} className={`w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm focus:border-blue-500 disabled:opacity-50 ${realizedPnL && parseFloat(realizedPnL) > 0 ? 'text-green-400' : realizedPnL && parseFloat(realizedPnL) < 0 ? 'text-red-400' : 'text-white'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Followed Plan?</label>
              <div className="flex gap-2">
                <button disabled={!isEditing} onClick={() => setFollowedPlan(true)} className={`flex-1 py-2 rounded text-sm font-medium border ${followedPlan === true ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>Yes</button>
                <button disabled={!isEditing} onClick={() => setFollowedPlan(false)} className={`flex-1 py-2 rounded text-sm font-medium border ${followedPlan === false ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>No</button>
              </div>
            </div>
          </div>
        </section>

        {/* Psychology & Review */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Psychology & Review</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Emotional State</label>
                <div className="flex flex-wrap gap-2">
                  {emotionChips.map(chip => (
                    <button key={chip} disabled={!isEditing} onClick={() => setEmotionalState(chip)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${emotionalState === chip ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>
                      {chip}
                    </button>
                  ))}
                  {isEditing && !emotionChips.includes(emotionalState) && emotionalState !== '' && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-500/20 border-purple-500 text-purple-400">{emotionalState}</span>
                  )}
                </div>
                {isEditing && (
                  <input type="text" value={!emotionChips.includes(emotionalState) ? emotionalState : ''} onChange={e => setEmotionalState(e.target.value)} placeholder="Other..." className="mt-2 w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-xs text-white focus:border-blue-500" />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Confidence Level</label>
                <div className="flex gap-2">
                  {confidenceChips.map(chip => (
                    <button key={chip} disabled={!isEditing} onClick={() => setConfidenceLevel(chip)} className={`flex-1 py-1.5 rounded text-xs font-medium border ${confidenceLevel === chip ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Lesson Learned</label>
              <textarea disabled={!isEditing} value={lessonLearned} onChange={e => setLessonLearned(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-3 text-sm text-white focus:border-blue-500 min-h-[80px] disabled:opacity-50" placeholder="What did you learn from this trade?" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Would Repeat?</label>
              <div className="flex gap-2 max-w-[200px]">
                <button disabled={!isEditing} onClick={() => setWouldRepeat(true)} className={`flex-1 py-2 rounded text-sm font-medium border ${wouldRepeat === true ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>Yes</button>
                <button disabled={!isEditing} onClick={() => setWouldRepeat(false)} className={`flex-1 py-2 rounded text-sm font-medium border ${wouldRepeat === false ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>No</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
