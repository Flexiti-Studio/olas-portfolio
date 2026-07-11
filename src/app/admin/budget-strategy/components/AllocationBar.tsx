"use client";

interface AllocationBarProps {
  needs: number;
  savings: number;
  wants: number;
  totalGoal: number;
}

const COLORS = {
  NEEDS: "bg-blue-600",
  SAVINGS: "bg-violet-600",
  WANTS: "bg-orange-600"
};

export function AllocationBar({ needs, savings, wants, totalGoal }: AllocationBarProps) {
  const totalSpent = needs + savings + wants;
  
  // Calculate percentages based on total goal (or total spent if it exceeds goal, to prevent >100% rendering)
  const baseTotal = Math.max(totalGoal, totalSpent, 1);
  
  const needsPct = (needs / baseTotal) * 100;
  const savingsPct = (savings / baseTotal) * 100;
  const wantsPct = (wants / baseTotal) * 100;

  return (
    <div className="w-full flex flex-col justify-center h-full space-y-4">
      <div className="flex justify-between items-end">
        <div className="text-2xl font-bold text-white">₦{totalSpent.toLocaleString()}</div>
        <div className="text-sm text-slate-400">of ₦{totalGoal.toLocaleString()} goal</div>
      </div>
      
      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
        {needs > 0 && <div className={`${COLORS.NEEDS} h-full transition-all duration-500`} style={{ width: `${needsPct}%` }} title={`Needs: ₦${needs.toLocaleString()}`} />}
        {savings > 0 && <div className={`${COLORS.SAVINGS} h-full transition-all duration-500`} style={{ width: `${savingsPct}%` }} title={`Savings: ₦${savings.toLocaleString()}`} />}
        {wants > 0 && <div className={`${COLORS.WANTS} h-full transition-all duration-500`} style={{ width: `${wantsPct}%` }} title={`Wants: ₦${wants.toLocaleString()}`} />}
      </div>
      
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        <div className="flex items-center"><div className={`w-3 h-3 rounded-full ${COLORS.NEEDS} mr-1`}></div> Needs</div>
        <div className="flex items-center"><div className={`w-3 h-3 rounded-full ${COLORS.SAVINGS} mr-1`}></div> Savings</div>
        <div className="flex items-center"><div className={`w-3 h-3 rounded-full ${COLORS.WANTS} mr-1`}></div> Wants</div>
      </div>
    </div>
  );
}
