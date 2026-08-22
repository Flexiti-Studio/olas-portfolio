"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { PeriodSelector } from "./components/PeriodSelector";
import { SummaryTable } from "./components/SummaryTable";
import { CategoryColumn } from "./components/CategoryColumn";
import { IncomeColumn } from "./components/IncomeColumn";
import { TransactionsTable } from "./components/TransactionsTable";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  },
});

export default function BudgetStrategyPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="animate-pulse h-screen w-full bg-slate-900"></div>}>
        <BudgetStrategyPage />
      </Suspense>
    </QueryClientProvider>
  );
}

function BudgetStrategyPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const periodId = searchParams?.get("periodId") || undefined;

  const { data: queryData, isLoading: loading, error } = useQuery({
    queryKey: ["budget-strategy", periodId],
    queryFn: async () => {
      const url = new URL("/api/budgeting/strategy", window.location.origin);
      if (periodId) {
        url.searchParams.set("periodId", periodId);
      }
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || json.message || "Failed to load budget data.");
      return json.data;
    }
  });

  const data = queryData;
  const errorMsg = error?.message;

  const handleGoalUpdated = () => {
    qc.invalidateQueries({ queryKey: ["budget-strategy", periodId] });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse"></div>
          <div className="h-10 w-full md:w-48 bg-slate-800 rounded animate-pulse"></div>
        </div>

        {/* Summary Table Skeleton */}
        <div className="mb-8 bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-between">
              <div className="h-4 w-64 bg-slate-800 rounded animate-pulse"></div>
              <div className="h-8 w-32 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-6 flex flex-col items-center justify-center">
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse mb-6"></div>
            <div className="w-32 h-32 rounded-full border-8 border-slate-800 animate-pulse"></div>
          </div>
        </div>

        {/* Columns Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-4"></div>
              <div className="h-1 w-full bg-slate-800 rounded animate-pulse mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="h-10 bg-slate-800/50 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="min-h-screen bg-slate-950 p-8 text-red-400">Error: {errorMsg}</div>;
  }

  if (!data || !data.periodId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Budget Strategy</h1>
          <div className="w-full md:w-auto">
            <PeriodSelector currentPeriodId={""} />
          </div>
        </div>
        
        {data?.strategy && (
          <div className="mb-8">
            <SummaryTable 
              totalIncome={0} 
              groups={{
                NEEDS: { totalActual: 0, totalGoal: 0 },
                SAVINGS: { totalActual: 0, totalGoal: 0 },
                WANTS: { totalActual: 0, totalGoal: 0 }
              }} 
              strategy={data.strategy} 
              periodId={data.periodId}
            />
          </div>
        )}

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-center">
          No active budget period found. Please start a new period to begin tracking.
        </div>
      </div>
    );
  }

  const isEditable = data.periodId === data.activePeriodId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Budget Strategy</h1>
        <div className="w-full md:w-auto">
          <PeriodSelector currentPeriodId={data.periodId} />
        </div>
      </div>

      {/* Summary Table block */}
      <div className="mb-8">
        <SummaryTable totalIncome={data.totalIncome} groups={data.groups} strategy={data.strategy} periodId={data.periodId} />
      </div>

      {!isEditable && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-400 font-medium">
          You are viewing a past period ({data.periodLabel}). Goals are read-only.
        </div>
      )}

      {/* Two-column layout to prevent squeezing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeColumn incomes={data.incomes} totalIncome={data.totalIncome} onIncomeDeleted={handleGoalUpdated} />
        
        <CategoryColumn 
          title="NEEDS"
          themeColor="bg-blue-700"
          categories={data.groups.NEEDS.categories}
          totalGoal={data.groups.NEEDS.totalGoal}
          totalActual={data.groups.NEEDS.totalActual}
          periodLabel={data.periodId} // Reused periodId down the line for POSTs
          isEditable={isEditable}
          onGoalUpdated={handleGoalUpdated} 
        />
        
        <CategoryColumn 
          title="SAVINGS & INVESTMENTS"
          themeColor="bg-violet-700"
          categories={data.groups.SAVINGS.categories}
          totalGoal={data.groups.SAVINGS.totalGoal}
          totalActual={data.groups.SAVINGS.totalActual}
          periodLabel={data.periodId}
          isEditable={isEditable}
          onGoalUpdated={handleGoalUpdated} 
        />
        
        <CategoryColumn 
          title="WANTS"
          themeColor="bg-orange-700"
          categories={data.groups.WANTS.categories}
          totalGoal={data.groups.WANTS.totalGoal}
          totalActual={data.groups.WANTS.totalActual}
          periodLabel={data.periodId}
          isEditable={isEditable}
          onGoalUpdated={handleGoalUpdated} 
        />
      </div>

      <TransactionsTable transactions={data.transactions} />
    </div>
  );
}
