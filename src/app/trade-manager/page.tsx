'use client';

import React, { useState } from 'react';

export default function TradeManagerPage() {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  
  // ATR Mode vs Fixed Mode
  const [useAtr, setUseAtr] = useState<boolean>(true);
  const [atrValue, setAtrValue] = useState<number>(50); // Raw ATR value in points/pips
  const [atrMultiplier, setAtrMultiplier] = useState<number>(1.5); 
  
  const [manualStopLoss, setManualStopLoss] = useState<number>(75);
  const [tickValue, setTickValue] = useState<number>(1);

  // Calculations
  const cashRisk = (balance * riskPercent) / 100;
  
  // The actual Stop Loss distance used for math depends on the toggle mode
  const calculatedStopLoss = useAtr ? (atrValue * atrMultiplier) : manualStopLoss;
  
  // Lot Size = Cash Risk / (Stop Loss Distance * Tick Value)
  const recommendedLot = calculatedStopLoss > 0 && tickValue > 0 
    ? (cashRisk / (calculatedStopLoss * tickValue)).toFixed(2)
    : '0.00';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">Trade Manager & Risk Calculator</h1>
        <p className="text-gray-400">Calculate your exact lot size based on ATR or fixed stop loss distances.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Calculator Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-blue-500 text-2xl">calculate</span>
            <h2 className="text-xl font-bold text-white">Dynamic Position Size Calculator</h2>
          </div>
          
          <div className="space-y-6">
            
            {/* Account Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Account Balance ($)</label>
                <input 
                  type="number" 
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tick Value ($)</label>
                <input 
                  type="number" 
                  value={tickValue}
                  onChange={(e) => setTickValue(Number(e.target.value))}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                  title="Usually $1 for standard Forex pairs. For Indices, it varies."
                />
              </div>
            </div>
            
            {/* Risk Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Risk Percentage (%)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0.1" max="10" step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="text-white font-mono bg-black px-3 py-1 rounded border border-gray-700 w-20 text-center">
                  {riskPercent}%
                </span>
              </div>
            </div>

            <div className="border-t border-gray-800 my-2"></div>

            {/* Mode Toggle */}
            <div className="flex bg-black rounded-lg border border-gray-800 p-1">
              <button 
                onClick={() => setUseAtr(true)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${useAtr ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Use ATR Multiplier
              </button>
              <button 
                onClick={() => setUseAtr(false)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${!useAtr ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Manual Pips/Points
              </button>
            </div>

            {/* Stop Loss Distance Calculation */}
            {useAtr ? (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Raw ATR Value</label>
                  <input 
                    type="number" 
                    value={atrValue}
                    onChange={(e) => setAtrValue(Number(e.target.value))}
                    className="w-full bg-black border border-blue-900/50 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Read from MT5 indicator</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">ATR Multiplier</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={atrMultiplier}
                    onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                    className="w-full bg-black border border-blue-900/50 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">e.g., 1.5 for Day Trading</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-900/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Resulting Stop Loss:</span>
                    <span className="font-bold text-white">{calculatedStopLoss.toFixed(1)} Points/Pips</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Fixed Stop Loss Distance (Pips/Points)</label>
                <input 
                  type="number" 
                  value={manualStopLoss}
                  onChange={(e) => setManualStopLoss(Number(e.target.value))}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}
          </div>

          <div className="mt-8 p-6 bg-blue-900/20 border border-blue-900/50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-400 font-medium">Recommended Lot Size</p>
              <p className="text-4xl font-bold text-white mt-1">{recommendedLot}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 font-medium">Cash at Risk</p>
              <p className="text-xl font-bold text-red-400 mt-1">${cashRisk.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Documentation / Explanation Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-green-500 text-2xl">menu_book</span>
            <h2 className="text-xl font-bold text-white">The "Perfect ATR" Guide</h2>
          </div>
          
          <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
            <p>
              When using the <strong className="text-white">OlasTradeManager EA</strong>, the absolute best method to use for multi-asset trading is <strong className="text-blue-400">ATR_MULTIPLE</strong>. The Average True Range (ATR) dynamically calculates the exact volatility of the chart you attach it to.
            </p>

            <div className="bg-black p-4 rounded-lg border border-gray-800">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                The Scalper Setup
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li><strong className="text-gray-300">Stop Loss:</strong> 1.0 ATR</li>
                <li><strong className="text-gray-300">Take Profit:</strong> 1.5 ATR</li>
                <li><strong className="text-gray-300">Goal:</strong> Quick ins and outs. Give the trade just enough room for standard market noise.</li>
              </ul>
            </div>

            <div className="bg-black p-4 rounded-lg border border-gray-800">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                The Day Trader Setup (Recommended)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li><strong className="text-gray-300">Stop Loss:</strong> 1.5 ATR</li>
                <li><strong className="text-gray-300">Take Profit:</strong> 2.0 to 3.0 ATR</li>
                <li><strong className="text-gray-300">Goal:</strong> The mathematical sweet spot. If price moves 1.5x further than average against you, market structure is broken.</li>
              </ul>
            </div>

            <div className="bg-black p-4 rounded-lg border border-gray-800">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                The Swing Trader Setup
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li><strong className="text-gray-300">Stop Loss:</strong> 2.0 ATR</li>
                <li><strong className="text-gray-300">Trailing Stop:</strong> 2.0 ATR</li>
                <li><strong className="text-gray-300">Goal:</strong> Ride massive trends for days. Ensures you are never kicked out during healthy retracements.</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="font-medium text-white mb-1">⚠️ Important Rule:</p>
              <p className="text-gray-400">
                The timeframe matters more than the number! Always attach the EA to the timeframe you used to analyze the trade. ATR on a 1-Minute chart is much tighter than ATR on a 1-Hour chart.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
