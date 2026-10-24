"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { PeriodSelector } from "./components/PeriodSelector";
import { SummaryTable } from "./components/SummaryTable";
import { CategoryColumn } from "./components/CategoryColumn";
import { IncomeColumn } from "./components/IncomeColumn";
import { TransactionsTable } from "./components/TransactionsTable";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  },
});

export default function BudgetStrategyPageWrapper() {
  const pathname = usePathname() || "";
  const isStandalone = pathname.startsWith("/admin/budget-strategy");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="animate-pulse h-screen w-full bg-slate-900"></div>}>
        <BudgetStrategyPage />
      </Suspense>
    </QueryClientProvider>
  );

  if (!isStandalone) {
    return content;
  }

  return (
    <div className="bg-zinc-950 text-white min-h-screen relative overflow-x-hidden">
      {/* Career Hub Main Admin Sidebar */}
      <AdminSidebar
        activeTab="budget-strategy"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <main
        className={`min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {content}
        </div>
      </main>
    </div>
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

  const isEditable = true; // Allow checking off items and managing goals on any viewed month
  const isSnapshot = data.periodId !== data.activePeriodId || Boolean(data.isSnapshot);

  const totalAllocated = (data.groups?.NEEDS?.totalGoal || 0) + 
                         (data.groups?.SAVINGS?.totalGoal || 0) + 
                         (data.groups?.WANTS?.totalGoal || 0);
  const totalUsed = data.totalUsed ?? 0;
  const totalBalanceRemaining = data.totalBalance ?? (data.totalIncome - totalUsed);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 sm:p-5 md:p-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Budget Strategy</h1>
            {isSnapshot ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Archived Snapshot
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Active Month
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isSnapshot ? (
              `Historical snapshot for ${data.periodLabel} • ${data.usedCount ?? 0} of ${data.totalItemsCount ?? 0} items marked used`
            ) : (
              `50/30/20 monthly budgeting • ${data.usedCount ?? 0} of ${data.totalItemsCount ?? 0} items marked used`
            )}
          </p>
        </div>

        <div className="w-full md:w-auto">
          <PeriodSelector currentPeriodId={data.periodId} />
        </div>
      </div>

      {/* Financial Health & Live Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Total Income */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Income
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400">
            ₦{data.totalIncome.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.incomes?.length || 0} income streams
          </div>
        </div>

        {/* Total Used / Spent (Checked items + Expenses) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Used / Spent
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-100">
            ₦{totalUsed.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">
            ✓ {data.usedCount || 0} items checked used
          </div>
        </div>

        {/* Total Balance Remaining (Reduces when items are checked!) */}
        <div className={`rounded-2xl p-3.5 sm:p-4 shadow-md border ${
          totalBalanceRemaining >= 0 
            ? "bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-800/40" 
            : "bg-gradient-to-br from-red-950/40 to-slate-900 border-red-800/40"
        }`}>
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Balance</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">Live</span>
          </div>
          <div className={`text-lg sm:text-2xl font-black ${
            totalBalanceRemaining >= 0 ? "text-emerald-300" : "text-red-400"
          }`}>
            ₦{totalBalanceRemaining.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalBalanceRemaining >= 0 ? "Remaining to spend" : "Budget deficit"}
          </div>
        </div>

        {/* Total Goal Allocated */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Goal Allocated
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-300">
            ₦{totalAllocated.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.totalItemsCount || 0} budget categories
          </div>
        </div>
      </div>

      {/* Summary Table block */}
      <div className="mb-6 sm:mb-8">
        <SummaryTable totalIncome={data.totalIncome} groups={data.groups} strategy={data.strategy} periodId={data.periodId} />
      </div>

      {isSnapshot && (
        <div className="mb-6 p-3.5 sm:p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-between flex-wrap gap-2">
          <span>
            📁 <strong>Archived Monthly Snapshot ({data.periodLabel}):</strong> Goals and checkmarks are preserved as historical records.
          </span>
          <span className="text-[11px] text-amber-400/80 bg-amber-900/40 px-2 py-0.5 rounded-md">
            DB Snapshot
          </span>
        </div>
      )}

      {/* Two-column layout to prevent squeezing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <IncomeColumn incomes={data.incomes} totalIncome={data.totalIncome} onIncomeDeleted={handleGoalUpdated} />
        
        <CategoryColumn 
          title="NEEDS"
          themeColor="bg-blue-700"
          categories={data.groups.NEEDS.categories}
          totalGoal={data.groups.NEEDS.totalGoal}
          totalActual={data.groups.NEEDS.totalActual}
          periodLabel={data.periodLabel}
          periodId={data.periodId}
          isEditable={true}
          onGoalUpdated={handleGoalUpdated} 
        />
        
        <CategoryColumn 
          title="SAVINGS & INVESTMENTS"
          themeColor="bg-violet-700"
          categories={data.groups.SAVINGS.categories}
          totalGoal={data.groups.SAVINGS.totalGoal}
          totalActual={data.groups.SAVINGS.totalActual}
          periodLabel={data.periodLabel}
          periodId={data.periodId}
          isEditable={true}
          onGoalUpdated={handleGoalUpdated} 
        />
        
        <CategoryColumn 
          title="WANTS"
          themeColor="bg-orange-700"
          categories={data.groups.WANTS.categories}
          totalGoal={data.groups.WANTS.totalGoal}
          totalActual={data.groups.WANTS.totalActual}
          periodLabel={data.periodLabel}
          periodId={data.periodId}
          isEditable={true}
          onGoalUpdated={handleGoalUpdated} 
        />
      </div>

      <TransactionsTable transactions={data.transactions} />
    </div>
  );
}
