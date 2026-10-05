'use client';

import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

type TradeData = {
  closeTime: Date;
  profit: number;
  symbol: string;
  type: string;
};

export default function ChartsDashboard({ trades }: { trades: TradeData[] }) {
  const { areaData, symbolData, winLossData } = useMemo(() => {
    // 1. Cumulative Profit over Time (Grouped by Date to avoid overlapping points)
    const sorted = [...trades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
    
    let cumulative = 0;
    const dailyMap = new Map<string, number>();
    
    sorted.forEach((t) => {
      const dateStr = t.closeTime.toISOString().split('T')[0];
      cumulative += t.profit;
      dailyMap.set(dateStr, cumulative);
    });

    const areaData = Array.from(dailyMap.entries()).map(([date, cumProfit]) => ({
      date,
      cumulative: Number(cumProfit.toFixed(2))
    }));

    // 2. Profit by Symbol
    const symbolMap = new Map<string, number>();
    trades.forEach((t) => {
      const current = symbolMap.get(t.symbol) || 0;
      symbolMap.set(t.symbol, current + t.profit);
    });
    const symbolData = Array.from(symbolMap.entries())
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    // 3. Win/Loss Ratio
    let wins = 0;
    let losses = 0;
    trades.forEach(t => {
      if (t.profit > 0) wins++;
      else if (t.profit < 0) losses++;
    });
    const winLossData = [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses }
    ];

    return { areaData, symbolData, winLossData };
  }, [trades]);

  if (trades.length === 0) return null;

  const COLORS = ['#10b981', '#ef4444']; // Green for Wins, Red for Losses

  return (
    <div className="mt-12 space-y-6">
      {/* Main Equity Curve */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-200">Equity Curve (Daily Close)</h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af" 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#60a5fa' }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                formatter={(value: number) => [`$${value}`, 'Cumulative Profit']}
              />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCumulative)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid for Smaller Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profit by Symbol Bar Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-6 text-gray-200">Profit by Symbol</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{ fill: '#1f2937' }}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value}`, 'Profit']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {
                    symbolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Pie Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-6 text-gray-200">Win / Loss Distribution</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: number) => [value, 'Trades']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
