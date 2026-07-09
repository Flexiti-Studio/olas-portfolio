"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AllocationDonutProps {
  needs: number;
  savings: number;
  wants: number;
}

const COLORS = {
  NEEDS: "#1d4ed8", // blue-700
  SAVINGS: "#6d28d9", // violet-700
  WANTS: "#c2410c" // orange-700
};

export function AllocationDonut({ needs, savings, wants }: AllocationDonutProps) {
  const data = [
    { name: "Needs", value: needs, color: COLORS.NEEDS },
    { name: "Savings", value: savings, color: COLORS.SAVINGS },
    { name: "Wants", value: wants, color: COLORS.WANTS }
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any) => `₦${Number(value).toLocaleString()}`}
          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', color: '#f8fafc' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
