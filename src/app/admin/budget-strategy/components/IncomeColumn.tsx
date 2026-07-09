"use client";

interface IncomeColumnProps {
  incomes: any[];
  totalIncome: number;
}

export function IncomeColumn({ incomes, totalIncome }: IncomeColumnProps) {
  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 h-full">
      <div className="p-4 bg-emerald-700 text-white">
        <h3 className="font-bold text-lg uppercase tracking-wider">INCOME</h3>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span>Total: ₦{totalIncome.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {incomes.map((inc) => (
          <div key={inc.id} className="flex justify-between items-center py-2 border-b border-gray-100/10">
            <span className="text-sm font-medium text-slate-300">{inc.name}</span>
            <span className="text-sm font-semibold text-emerald-400">₦{inc.total.toLocaleString()}</span>
          </div>
        ))}
        {incomes.length === 0 && (
          <div className="text-sm text-slate-500 italic">No income recorded for this period.</div>
        )}
      </div>
    </div>
  );
}
