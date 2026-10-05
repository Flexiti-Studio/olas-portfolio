"use client";

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { getJournalTickers } from '@/app/actions/getTickers';
import { upsertTradingStrategy, TradingStrategyData } from '@/app/actions/tradingStrategy';

export function StrategyForm({
  initialData,
  isCompact = false,
  focusSection,
  onSave
}: {
  initialData?: TradingStrategyData | null;
  isCompact?: boolean;
  focusSection?: 'identity' | 'instruments' | 'thesis' | 'criteria' | 'execution' | 'risk' | 'performance';
  onSave?: (strategyId?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // 1. Identity
  const [name, setName] = useState(initialData?.name || '');
  const [strategyStatus, setStrategyStatus] = useState(initialData?.status || 'testing');

  // Ticker Picker (Instruments)
  const initialInstrumentsRaw = initialData?.instruments ? JSON.parse(initialData.instruments) : [];
  const initialInstruments = initialInstrumentsRaw.map((item: any) => typeof item === 'string' ? { name: item, link: '' } : item);
  const [selectedTickers, setSelectedTickers] = useState<{name: string, link: string}[]>(initialInstruments);
  const [tickers, setTickers] = useState<{watchlisted: string[], others: string[]}>({watchlisted: [], others: []});
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setIsPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    getJournalTickers().then(res => {
      if (res.success) setTickers({ watchlisted: res.watchlisted, others: res.others });
    });
  }, []);

  // 2. Thesis
  const [targetCondition, setTargetCondition] = useState(initialData?.targetCondition || '');
  const [edge, setEdge] = useState(initialData?.edge || '');
  
  // Timeframes & Bias handling
  const standardTimeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];
  let initialTFs: string[] = [];
  try { initialTFs = initialData?.timeframes ? JSON.parse(initialData.timeframes) : []; } catch(e) { initialTFs = []; }
  let initialBiases: Record<string, string> = {};
  try { initialBiases = initialData?.timeframeBias ? JSON.parse(initialData.timeframeBias) : {}; } catch(e) { initialBiases = {}; }
  
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(initialTFs);
  const [biases, setBiases] = useState<Record<string, string>>(initialBiases);

  const toggleTimeframe = (tf: string) => {
    setSelectedTimeframes(prev => prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]);
  };

  // 3. Setup criteria
  const [requiredStructure, setRequiredStructure] = useState(initialData?.requiredStructure || '');
  const [confirmingSignals, setConfirmingSignals] = useState(initialData?.confirmingSignals || '');
  const [fundamentalBackdrop, setFundamentalBackdrop] = useState(initialData?.fundamentalBackdrop || '');
  
  let initChecklist: string[] = [];
  try { initChecklist = initialData?.checklist ? JSON.parse(initialData.checklist) : []; } catch(e) { initChecklist = initialData?.checklist ? [initialData.checklist] : []; }
  let initSkip: string[] = [];
  try { initSkip = initialData?.skipChecklist ? JSON.parse(initialData.skipChecklist) : []; } catch(e) { initSkip = initialData?.skipChecklist ? [initialData.skipChecklist] : []; }
  
  const [checklist, setChecklist] = useState<string[]>(initChecklist);
  const [skipChecklist, setSkipChecklist] = useState<string[]>(initSkip);

  const updateList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };
  const addToList = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, '']);
  const removeFromList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));


  // 4. Entry rules
  const [triggerCondition, setTriggerCondition] = useState(initialData?.triggerCondition || '');
  const [entryMethod, setEntryMethod] = useState(initialData?.entryMethod || '');

  // 5. Exit rules
  const [stopLossLogic, setStopLossLogic] = useState(initialData?.stopLossLogic || '');
  const [takeProfitLogic, setTakeProfitLogic] = useState(initialData?.takeProfitLogic || '');
  const [invalidation, setInvalidation] = useState(initialData?.invalidation || '');

  // 6. Risk parameters
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState(initialData?.maxRiskPerTrade?.toString() || '');
  const [maxConcurrent, setMaxConcurrent] = useState(initialData?.maxConcurrent?.toString() || '');
  const [correlationRules, setCorrelationRules] = useState(initialData?.correlationRules || '');

  // 7. Backtest/performance record
  const [sampleSize, setSampleSize] = useState(initialData?.sampleSize?.toString() || '');
  const [winRate, setWinRate] = useState(initialData?.winRate?.toString() || '');
  const [averageR, setAverageR] = useState(initialData?.averageR?.toString() || '');
  const [expectancy, setExpectancy] = useState(initialData?.expectancy?.toString() || '');
  const [weaknesses, setWeaknesses] = useState(initialData?.weaknesses || '');

  const handleSave = () => {
    startTransition(async () => {
      setStatus('idle');
      
      const payload: TradingStrategyData = {
        id: initialData?.id,
        name,
        status: strategyStatus,
        instruments: JSON.stringify(selectedTickers),
        targetCondition,
        edge,
        timeframes: JSON.stringify(selectedTimeframes),
        timeframeBias: JSON.stringify(biases),
        requiredStructure,
        confirmingSignals,
        fundamentalBackdrop,
        checklist: JSON.stringify(checklist.filter(x => x.trim())),
        skipChecklist: JSON.stringify(skipChecklist.filter(x => x.trim())),
        triggerCondition,
        entryMethod,
        stopLossLogic,
        takeProfitLogic,
        invalidation,
        correlationRules,
        weaknesses,
        maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade) : null,
        maxConcurrent: maxConcurrent ? parseInt(maxConcurrent) : null,
        sampleSize: sampleSize ? parseInt(sampleSize) : null,
        winRate: winRate ? parseFloat(winRate) : null,
        averageR: averageR ? parseFloat(averageR) : null,
        expectancy: expectancy ? parseFloat(expectancy) : null,
      };

      const res = await upsertTradingStrategy(payload);
      if (res.success) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
        if (res.strategy) {
          onSave?.(res.strategy.id);
        } else {
          onSave?.();
        }
      } else {
        setStatus('error');
      }
    });
  };

  const watchlistedMatches = tickers.watchlisted.filter(t => t.toLowerCase().includes(pickerSearch.toLowerCase()));
  const otherMatches = tickers.others.filter(t => t.toLowerCase().includes(pickerSearch.toLowerCase()));

  const toggleTicker = (t: string) => setSelectedTickers(prev => prev.some(x => x.name === t) ? prev.filter(x => x.name !== t) : [...prev, { name: t, link: '' }]);
  const isCustomTickerNew = pickerSearch.trim() !== '' && !tickers.watchlisted.some(t => t.toLowerCase() === pickerSearch.toLowerCase()) && !tickers.others.some(t => t.toLowerCase() === pickerSearch.toLowerCase());

  const SectionHeading = ({ icon, text }: { icon: string, text: string }) => (
    <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2 mt-8">
      <span className="material-symbols-outlined text-blue-500">{icon}</span>
      <h3 className="font-bold text-lg text-white">{text}</h3>
    </div>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      
      {/* 1. Identity */}
      {(!focusSection || focusSection === 'identity') && (
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Strategy Name</p>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Volume-Confirmed Trend Breakout" 
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xl font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-48">
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <select 
              value={strategyStatus} 
              onChange={e => setStrategyStatus(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="testing">Testing</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
      )}

      {/* Instruments */}
      {(!focusSection || focusSection === 'instruments' || isCompact) && (
        <div className="mb-6 relative" ref={pickerRef}>
          <p className="text-xs text-gray-400 mb-2">Instruments / Pairs</p>
          
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={pickerSearch} 
                onChange={e => {
                  setPickerSearch(e.target.value);
                  if (!isPickerOpen) setIsPickerOpen(true);
                }}
                onFocus={() => setIsPickerOpen(true)}
                placeholder="Search to select, or type new to add..." 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" 
              />
              {isPickerOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-gray-950 border border-gray-800 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto custom-scrollbar">
                  {isCustomTickerNew && (
                    <button type="button" onClick={() => { toggleTicker(pickerSearch.toUpperCase()); setPickerSearch(""); setIsPickerOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-blue-400 hover:bg-gray-800 border-b border-gray-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">add</span> Add "{pickerSearch.toUpperCase()}"
                    </button>
                  )}
                  {watchlistedMatches.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">⭐ Watchlist</div>
                      {watchlistedMatches.map(t => (
                        <button type="button" key={t} onClick={() => toggleTicker(t)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex justify-between items-center transition-colors">
                          {t} {selectedTickers.some(x => x.name === t) && <span className="material-symbols-outlined text-[16px] text-blue-500">check</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {otherMatches.length > 0 && (
                    <div className="py-2 border-t border-gray-800">
                      <div className="px-4 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">All Tracked Pairs</div>
                      {otherMatches.map(t => (
                        <button type="button" key={t} onClick={() => toggleTicker(t)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex justify-between items-center transition-colors">
                          {t} {selectedTickers.some(x => x.name === t) && <span className="material-symbols-outlined text-[16px] text-blue-500">check</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => {
                if (pickerSearch.trim() && !selectedTickers.some(x => x.name === pickerSearch.toUpperCase())) {
                  toggleTicker(pickerSearch.toUpperCase());
                  setPickerSearch('');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
            >
              Add
            </button>
          </div>

          {selectedTickers.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-950/50 text-xs uppercase text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/3">Pair / Instrument</th>
                    <th className="px-4 py-3 font-medium">Custom Link</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                  {selectedTickers.map(t => (
                    <tr key={t.name} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-[18px]">monitoring</span>
                        {t.name}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={t.link}
                          onChange={(e) => setSelectedTickers(prev => prev.map(x => x.name === t.name ? { ...x, link: e.target.value } : x))}
                          placeholder="e.g. https://tradingview.com/..."
                          className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {t.link && (
                            <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium" title="Open Custom Link">
                              <span className="material-symbols-outlined text-[14px]">public</span> External
                            </a>
                          )}
                          <a href={`/watchlist/${t.name}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-medium" title={`View ${t.name} Watchlist`}>
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span> Watchlist
                          </a>
                          <button type="button" onClick={() => toggleTicker(t.name)} className="text-gray-500 hover:text-red-400 transition-colors" title="Remove Pair">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-500 italic">
              No instruments selected. Search and add pairs above.
            </div>
          )}
        </div>
      )}

      {!isCompact && (
        <>
          {/* 2. Thesis */}
          {(!focusSection || focusSection === 'thesis') && (
            <>
              <SectionHeading icon="lightbulb" text="Thesis & Edge" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Target Market Condition</p>
                  <input type="text" value={targetCondition} onChange={e => setTargetCondition(e.target.value)} placeholder="e.g. trending, ranging, breakout" className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-full mb-2">
          <p className="text-xs text-gray-400 mb-2">Timeframes</p>
          <div className="flex flex-wrap gap-2">
            {standardTimeframes.map(tf => (
              <button
                type="button"
                key={tf}
                onClick={() => toggleTimeframe(tf)}
                className={`px-3 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-1.5 ${selectedTimeframes.includes(tf) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <span className="material-symbols-outlined text-[16px]">{selectedTimeframes.includes(tf) ? 'check_box' : 'check_box_outline_blank'}</span>
                {tf}
              </button>
            ))}
          </div>
        </div>
        
        {selectedTimeframes.length > 0 && (
          <div className="col-span-full">
            <p className="text-xs text-gray-400 mb-2">Time Frame Bias</p>
            <div className="space-y-3">
              {selectedTimeframes.map(tf => (
                <div key={tf} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{tf} Bias</span>
                  <input
                    type="text"
                    value={biases[tf] || ''}
                    onChange={e => setBiases(prev => ({ ...prev, [tf]: e.target.value }))}
                    placeholder={`e.g. Bullish, seeking longs...`}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
                <div className="col-span-full">
                  <p className="text-xs text-gray-400 mb-1">The Edge (Why it works)</p>
                  <textarea value={edge} onChange={e => setEdge(e.target.value)} placeholder="e.g. News catalysts + volume confirmation filters fakeouts..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[60px]" />
                </div>
              </div>
            </>
          )}

          {/* 3. Setup Criteria */}
          {(!focusSection || focusSection === 'criteria') && (
            <>
              <SectionHeading icon="checklist" text="Setup Criteria" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Required Market Structure</p>
                  <textarea value={requiredStructure} onChange={e => setRequiredStructure(e.target.value)} placeholder="e.g. Base/consolidation, clear uptrend..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" />
                </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Confirming Signals</p>
          <textarea value={confirmingSignals} onChange={e => setConfirmingSignals(e.target.value)} placeholder="e.g. Volume spike, liquidity sweep..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" />
        </div>
        <div className="col-span-full">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-gray-400">Execution Checklist</p>
            <button type="button" onClick={() => addToList(setChecklist)} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">+ Add Item</button>
          </div>
          {checklist.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={item} onChange={e => updateList(setChecklist, i, e.target.value)} placeholder={`Step ${i+1}`} className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => removeFromList(setChecklist, i)} className="text-gray-500 hover:text-red-400 px-2"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
          ))}
          {checklist.length === 0 && <p className="text-xs text-gray-600 italic">No checklist items. Click + Add Item</p>}
        </div>
        <div className="col-span-full">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-gray-400">Strict Skip Checklist</p>
            <button type="button" onClick={() => addToList(setSkipChecklist)} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">+ Add Item</button>
          </div>
          {skipChecklist.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={item} onChange={e => updateList(setSkipChecklist, i, e.target.value)} placeholder={`Skip rule ${i+1} (e.g. NFP today)`} className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => removeFromList(setSkipChecklist, i)} className="text-gray-500 hover:text-red-400 px-2"><span className="material-symbols-outlined text-[16px]">close</span></button>
            </div>
          ))}
          {skipChecklist.length === 0 && <p className="text-xs text-gray-600 italic">No skip rules. Click + Add Item</p>}
        </div>
              </div>
            </>
          )}

          {/* 4 & 5. Execution Rules */}
          {(!focusSection || focusSection === 'execution') && (
            <>
              <SectionHeading icon="login" text="Execution Rules" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Exact Trigger Condition</p>
                  <textarea value={triggerCondition} onChange={e => setTriggerCondition(e.target.value)} placeholder="e.g. Price closes above resistance X with volume Y" className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[60px]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Entry Method</p>
                  <textarea value={entryMethod} onChange={e => setEntryMethod(e.target.value)} placeholder="e.g. Market order on close, limit on retest..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[60px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Stop-Loss Logic</p>
                  <textarea value={stopLossLogic} onChange={e => setStopLossLogic(e.target.value)} placeholder="e.g. Below the swing low..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" />
                </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Take-Profit Logic</p>
          <textarea value={takeProfitLogic} onChange={e => setTakeProfitLogic(e.target.value)} placeholder="e.g. Next major resistance, or fixed 2R..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" />
        </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Invalidation</p>
                  <textarea value={invalidation} onChange={e => setInvalidation(e.target.value)} placeholder="e.g. Close back inside range..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[80px]" />
                </div>
              </div>
            </>
          )}

          {/* 6. Risk Parameters */}
          {(!focusSection || focusSection === 'risk') && (
            <>
              <SectionHeading icon="shield" text="Risk Parameters" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Max Risk Per Trade (%)</p>
                  <input type="number" step="0.1" value={maxRiskPerTrade} onChange={e => setMaxRiskPerTrade(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Max Concurrent Positions</p>
          <input type="number" value={maxConcurrent} onChange={e => setMaxConcurrent(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Correlation Rules</p>
                  <input type="text" value={correlationRules} onChange={e => setCorrelationRules(e.target.value)} placeholder="e.g. No 2 USD pairs at once" className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </>
          )}

          {/* 7. Performance Record */}
          {(!focusSection || focusSection === 'performance') && (
            <>
              <SectionHeading icon="monitoring" text="Performance Record" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sample Size</p>
                  <input type="number" value={sampleSize} onChange={e => setSampleSize(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Win Rate (%)</p>
          <input type="number" step="0.1" value={winRate} onChange={e => setWinRate(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Average R</p>
          <input type="number" step="0.1" value={averageR} onChange={e => setAverageR(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Expectancy</p>
                  <input type="number" step="0.1" value={expectancy} onChange={e => setExpectancy(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Known Weaknesses</p>
                <textarea value={weaknesses} onChange={e => setWeaknesses(e.target.value)} placeholder="e.g. Underperforms in low-volume weeks..." className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[60px]" />
              </div>
            </>
          )}
        </>
      )}

      {/* Submit */}
      <div className={`mt-8 flex justify-end items-center gap-4 pt-6 ${(!isCompact && !focusSection) ? 'border-t border-gray-800' : ''}`}>
        {status === 'saved' && <span className="text-green-500 text-sm font-medium">Saved successfully!</span>}
        {status === 'error' && <span className="text-red-500 text-sm font-medium">Failed to save</span>}
        <button 
          onClick={handleSave} 
          disabled={isPending || !name}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
        >
          {isPending ? 'Saving...' : (isCompact ? 'Create Strategy' : 'Save Strategy')}
        </button>
      </div>

    </div>
  );
}
