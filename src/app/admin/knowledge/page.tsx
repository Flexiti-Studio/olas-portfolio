"use client";

import { useState } from "react";
import { KnowledgeSearchBar } from "./components/KnowledgeSearchBar";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { Loader2 } from "lucide-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  },
});

function KnowledgeDashboardContent() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "IDEA" | "KNOWLEDGE">("ALL");

  const { data, isLoading: loading, isFetching, refetch: fetchEntries } = useQuery({
    queryKey: ["knowledge-entries"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge/entries");
      const json = await res.json();
      return json.data;
    }
  });

  const entries = data?.entries || [];
  const filteredEntries = entries.filter((e: any) => filterType === "ALL" || e.type === filterType);

  const selectedEntry = entries.find((e: any) => e.id === selectedEntryId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Knowledge Hub</h1>
        
        <KnowledgeSearchBar onSelectMatch={(id) => setSelectedEntryId(id)} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-slate-800">
          <div className="lg:col-span-1 border-r border-slate-800 pr-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-400">Entries</h2>
                <div className="flex items-center gap-2">
                  {isFetching && !loading && <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-sm rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="IDEA">Ideas</option>
                    <option value="KNOWLEDGE">Knowledge</option>
                  </select>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="transition-opacity">
                <EntryList 
                  entries={filteredEntries} 
                  selectedId={selectedEntryId}
                  onSelect={(id) => setSelectedEntryId(id)} 
                />
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2 pl-4">
            {selectedEntryId ? (
              <EntryDetail 
                entryId={selectedEntryId}
                onUpdated={async () => {
                  await fetchEntries();
                }}
                onDeleted={async () => {
                  await fetchEntries();
                  setSelectedEntryId(null);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                Select an entry to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeDashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <KnowledgeDashboardContent />
    </QueryClientProvider>
  );
}
