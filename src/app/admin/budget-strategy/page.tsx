"use client";

import { useEffect, useState } from "react";
import { PeriodSelector } from "./components/PeriodSelector";
import { SummaryTable } from "./components/SummaryTable";
import { CategoryColumn } from "./components/CategoryColumn";
import { IncomeColumn } from "./components/IncomeColumn";

export default function BudgetStrategyPage({
  searchParams,
}: {
  searchParams?: { periodId?: string };
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const url = new URL("/api/budgeting/strategy", window.location.origin);
        if (searchParams?.periodId) {
          url.searchParams.set("periodId", searchParams.periodId);
        }

        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error("Error fetching budget strategy:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams?.periodId]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-8 text-white">Loading budget data...</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-slate-950 p-8 text-white">Error loading budget data.</div>;
  }

  const isEditable = data.periodId === data.activePeriodId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Budget Strategy</h1>
        <PeriodSelector currentPeriodId={data.periodId} />
      </div>

      {/* Summary Table block */}
      <div className="mb-8">
        <SummaryTable totalIncome={data.totalIncome} groups={data.groups} />
      </div>

      {!isEditable && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-400 font-medium">
          You are viewing a past period ({data.periodLabel}). Goals are read-only.
        </div>
      )}

      {/* Three/Four-column breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <IncomeColumn incomes={data.incomes} totalIncome={data.totalIncome} />
        
        <CategoryColumn 
          title="NEEDS"
          themeColor="bg-blue-700"
          categories={data.groups.NEEDS.categories}
          totalGoal={data.groups.NEEDS.totalGoal}
          totalActual={data.groups.NEEDS.totalActual}
          periodLabel={data.periodId} // Reused periodId down the line for POSTs
          isEditable={isEditable}
          onGoalUpdated={() => {}} 
        />
        
        <CategoryColumn 
          title="SAVINGS & INVESTMENTS"
          themeColor="bg-violet-700"
          categories={data.groups.SAVINGS.categories}
          totalGoal={data.groups.SAVINGS.totalGoal}
          totalActual={data.groups.SAVINGS.totalActual}
          periodLabel={data.periodId}
          isEditable={isEditable}
          onGoalUpdated={() => {}} 
        />
        
        <CategoryColumn 
          title="WANTS"
          themeColor="bg-orange-700"
          categories={data.groups.WANTS.categories}
          totalGoal={data.groups.WANTS.totalGoal}
          totalActual={data.groups.WANTS.totalActual}
          periodLabel={data.periodId}
          isEditable={isEditable}
          onGoalUpdated={() => {}} 
        />
      </div>
    </div>
  );
}
