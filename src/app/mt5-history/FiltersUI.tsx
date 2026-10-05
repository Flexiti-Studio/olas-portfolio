'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function FiltersUI({ symbols }: { symbols: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [type, setType] = useState(searchParams.get('type') || '');
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || '');
  const [outcome, setOutcome] = useState(searchParams.get('outcome') || '');
  
  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // reset to page 1 on filter
    
    if (type) params.set('type', type);
    else params.delete('type');
    
    if (symbol) params.set('symbol', symbol);
    else params.delete('symbol');
    
    if (outcome) params.set('outcome', outcome);
    else params.delete('outcome');
    
    router.push(`?${params.toString()}`);
  };

  const handleClear = () => {
    setType('');
    setSymbol('');
    setOutcome('');
    router.push('?page=1');
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8 flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Symbol</label>
        <select value={symbol} onChange={e => setSymbol(e.target.value)} className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm text-white min-w-[120px]">
          <option value="">All Symbols</option>
          {symbols.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Type</label>
        <select value={type} onChange={e => setType(e.target.value)} className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm text-white min-w-[120px]">
          <option value="">All Types</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Outcome</label>
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-sm text-white min-w-[120px]">
          <option value="">All Outcomes</option>
          <option value="win">Winning Trades</option>
          <option value="loss">Losing Trades</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors">Apply Filters</button>
        <button onClick={handleClear} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded text-sm font-bold transition-colors">Clear</button>
      </div>
    </div>
  );
}
