'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CumulativeProfitChart({ trades }: { trades: { closeTime: Date; profit: number }[] }) {
  const data = useMemo(() => {
    // Sort trades by close time ascending
    const sorted = [...trades].sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
    
    let cumulative = 0;
    return sorted.map((t) => {
      cumulative += t.profit;
      return {
        date: t.closeTime.toISOString().split('T')[0], // YYYY-MM-DD
        profit: t.profit,
        cumulative: Number(cumulative.toFixed(2))
      };
    });
  }, [trades]);

  if (data.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-12">
      <h2 className="text-xl font-bold mb-6">Cumulative Profit Chart</h2>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              formatter={(value: any) => [`$${value}`, 'Cumulative Profit']}
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
  );
}
