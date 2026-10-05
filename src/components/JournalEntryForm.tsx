"use client";

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { upsertJournalEntry } from '@/app/actions/journal';
import { getJournalTickers } from '@/app/actions/getTickers';
import { getStrategiesList } from '@/app/actions/tradingStrategy';

export type JournalInitialData = {
  id?: string;
  title?: string | null;
  ticker?: string | null;
  strategyId?: string | null;
  images?: string | null;
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

function extractUrls(imagesData: string | null | undefined): string[] {
  if (!imagesData) return [];
  try {
    const parsed = JSON.parse(imagesData);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      let urls: string[] = [];
      parsed.forEach(folder => {
         if (folder.images && Array.isArray(folder.images)) {
            urls.push(...folder.images.map((img: any) => img.url));
         }
      });
      return urls;
    }
  } catch (e) {}
  return imagesData.split(',').map(s => s.trim()).filter(Boolean);
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
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Ticker state
  const [title, setTitle] = useState(initialData?.title || '');
  const [strategyId, setStrategyId] = useState(initialData?.strategyId || '');
  const [images, setImages] = useState(initialData?.images || '');
  const [strategiesList, setStrategiesList] = useState<{id: string, name: string}[]>([]);
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
    getStrategiesList().then(res => {
      if (res.success) setStrategiesList(res.strategies);
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
        wouldRepeat,
        strategyId: strategyId || null,
        images: images || null
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        setImages(prev => {
          if (!prev) return data.url;
          try {
            const parsed = JSON.parse(prev);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
               let foundQuick = false;
               const newFolders = parsed.map((f: any) => {
                 if (f.name === 'Quick Uploads' && !foundQuick) {
                   foundQuick = true;
                   return { ...f, images: [...f.images, { id: Date.now().toString(), url: data.url, caption: '' }] };
                 }
                 return f;
               });
               if (!foundQuick) {
                 newFolders.push({ id: Date.now().toString(), name: 'Quick Uploads', images: [{ id: Date.now().toString(), url: data.url, caption: '' }] });
               }
               return JSON.stringify(newFolders);
            }
          } catch(e) {}
          return prev + "," + data.url;
        });
        toast.success("Image uploaded!");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload error");
    } finally {
      setIsUploading(false);
    }
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
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Journal Title" 
              className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xl font-bold text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600 w-full max-w-sm"
            />
          ) : (
            <h2 className="text-xl font-bold">{title || "Trade Journal"}</h2>
          )}
          <span className="bg-gray-800 text-gray-300 px-4 py-1.5 rounded text-sm font-medium min-w-[120px] text-center whitespace-nowrap">{dateStr}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-green-500 text-sm font-medium">✓ Saved</span>}
          {status === 'error' && <span className="text-red-500 text-sm font-medium">Error</span>}
          {initialData?.updatedAt && !isEditing && (
            <span className="text-xs text-gray-500 hidden md:inline">Last updated: {new Date(initialData.updatedAt).toLocaleTimeString()}</span>
          )}
          {isEditing ? (
            <button onClick={handleSave} disabled={isPending || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-1">
              {isPending ? 'Saving...' : 'Save Journal'}
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">edit</span> Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* MAIN COLUMN (2/3) */}
        <div className="flex-1 space-y-8">
          
          {/* Setup Section */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Setup & Checklists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderChecklistSection("Analysis / Catalyst", analysis, setAnalysis, 'analysis')}
              {renderChecklistSection("Entry Plan", entryPlan, setEntryPlan, 'entry')}
              {renderChecklistSection("Exit Plan", exitPlan, setExitPlan, 'exit')}
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

        {/* SIDEBAR COLUMN (1/3) */}
        <div className="w-full lg:w-1/3 space-y-8 bg-gray-950/50 p-5 rounded-lg border border-gray-800/50">
          
          {/* Metadata Section (Ticker, Strategy, Images) */}
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Journal Details</h2>
            <div className="space-y-4">
              {/* Ticker Dropdown */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Attached Tickers</label>
                <div className="relative" ref={pickerRef}>
                  {isEditing ? (
                    <div>
                      <button onClick={() => setIsPickerOpen(!isPickerOpen)} className="w-full flex items-center justify-between bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm font-medium hover:border-gray-600 transition-colors">
                        <span className="truncate">{selectedTickers.length > 0 ? selectedTickers.join(", ") : "None"}</span>
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                      </button>
                      {isPickerOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-gray-950 border border-gray-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
                            <input type="text" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search or create..." className="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-white focus:outline-none" />
                          </div>
                          <button onClick={() => { setSelectedTickers([]); setIsPickerOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-800 flex justify-between items-center">
                            None
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
                              <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">All Tracked</div>
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
                    <span className="text-sm font-bold text-blue-400">{selectedTickers.length > 0 ? selectedTickers.join(', ') : "None"}</span>
                  )}
                </div>
              </div>

              {/* Strategy Dropdown */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Trading Strategy</label>
                {isEditing ? (
                  <select 
                    value={strategyId} 
                    onChange={(e) => setStrategyId(e.target.value)} 
                    className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Strategy Attached</option>
                    {strategiesList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  strategyId ? (
                    <div className="bg-blue-900/20 text-blue-400 border border-blue-800/50 rounded px-3 py-1.5 text-xs font-bold inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">auto_graph</span>
                      {strategiesList.find(s => s.id === strategyId)?.name || 'Attached Strategy'}
                    </div>
                  ) : <span className="text-sm text-gray-500">None</span>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Chart Images</label>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    {images && extractUrls(images).length > 0 && (
                       <div className="flex flex-wrap gap-2 mb-1">
                          {extractUrls(images).map((img, idx) => (
                             <button type="button" key={idx} onClick={() => setPreviewImage(img)} className="w-12 h-12 rounded border border-gray-700 overflow-hidden relative group">
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="material-symbols-outlined text-white text-[16px]">zoom_in</span>
                                </div>
                             </button>
                          ))}
                       </div>
                    )}
                    <label className={`w-full bg-gray-950 border border-gray-800 border-dashed rounded px-3 py-3 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors flex flex-col items-center justify-center cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <span className="material-symbols-outlined mb-1">upload</span>
                      {isUploading ? 'Uploading...' : 'Upload Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                ) : (
                  images && extractUrls(images).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {extractUrls(images).map((img, idx) => (
                          <button type="button" key={idx} onClick={() => setPreviewImage(img)} className="w-16 h-16 rounded border border-gray-700 overflow-hidden relative group block">
                            <img src={img} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="material-symbols-outlined text-white text-[16px]">zoom_in</span>
                            </div>
                          </button>
                        ))}
                    </div>
                  ) : <span className="text-sm text-gray-500">No images</span>
                )}
              </div>
            </div>
          </section>

          {/* Planned Trade Section */}
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Planned Trade</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Entry</label>
                <input disabled={!isEditing} type="number" step="any" value={plannedEntry} onChange={e => setPlannedEntry(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Stop Loss</label>
                <input disabled={!isEditing} type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Take Profit</label>
                <input disabled={!isEditing} type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Size</label>
                <input disabled={!isEditing} type="number" step="any" value={positionSize} onChange={e => setPositionSize(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Risk %</label>
                <input disabled={!isEditing} type="number" step="any" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
            </div>
          </section>

          {/* Execution Section */}
          <section className="bg-gray-900 rounded-lg p-3 border border-gray-800 mt-6">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Execution Reality</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Actual Entry</label>
                <input disabled={!isEditing} type="number" step="any" value={actualEntry} onChange={e => setActualEntry(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Actual Exit</label>
                <input disabled={!isEditing} type="number" step="any" value={actualExit} onChange={e => setActualExit(e.target.value)} className="w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right text-white focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent" placeholder="0.00" />
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <label className="text-xs font-bold text-gray-500">Realized PnL</label>
                <input disabled={!isEditing} type="number" step="any" value={realizedPnL} onChange={e => setRealizedPnL(e.target.value)} className={`w-1/2 bg-gray-950 border border-gray-800 rounded p-1.5 text-sm text-right focus:border-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:border-transparent ${realizedPnL && parseFloat(realizedPnL) > 0 ? 'text-green-400' : realizedPnL && parseFloat(realizedPnL) < 0 ? 'text-red-400' : 'text-white'}`} placeholder="0.00" />
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">Followed Plan?</label>
                <div className="flex gap-2">
                  <button disabled={!isEditing} onClick={() => setFollowedPlan(true)} className={`flex-1 py-1.5 rounded text-sm font-medium border ${followedPlan === true ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>Yes</button>
                  <button disabled={!isEditing} onClick={() => setFollowedPlan(false)} className={`flex-1 py-1.5 rounded text-sm font-medium border ${followedPlan === false ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'} disabled:opacity-50`}>No</button>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <button type="button" className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-[110]" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}>
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
