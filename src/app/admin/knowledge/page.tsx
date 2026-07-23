"use client";

import { useState } from "react";
import { KnowledgeSearchBar } from "./components/KnowledgeSearchBar";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { Loader2, Plus, Save, X, Tag } from "lucide-react";
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
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState<"KNOWLEDGE" | "IDEA">("KNOWLEDGE");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateEntry = async () => {
    if (!newContent.trim()) return;
    setIsSaving(true);

    try {
      const parsedTags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/knowledge/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          type: newType,
          tags: parsedTags,
        }),
      });

      if (!res.ok) throw new Error("Failed to save knowledge entry");

      const resJson = await res.json();
      if (resJson.success && resJson.data?.entry) {
        setIsCreating(false);
        setNewContent("");
        setNewTags("");
        setNewType("KNOWLEDGE");
        await fetchEntries();
        setSelectedEntryId(resJson.data.entry.id);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving knowledge entry.");
    } finally {
      setIsSaving(false);
    }
  };

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
        
        <KnowledgeSearchBar onSelectMatch={(id) => {
          setIsCreating(false);
          setSelectedEntryId(id);
        }} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-slate-800">
          <div className="lg:col-span-1 border-r border-slate-800 pr-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-400">Entries</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedEntryId(null);
                      setIsCreating(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                  {isFetching && !loading && <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-sm rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  onSelect={(id) => {
                    setIsCreating(false);
                    setSelectedEntryId(id);
                  }} 
                />
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2 pl-4">
            {isCreating ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-500" />
                    New Knowledge Entry
                  </h3>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1">Entry Type</label>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 w-fit">
                      <button
                        type="button"
                        onClick={() => setNewType("KNOWLEDGE")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${newType === 'KNOWLEDGE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                        Knowledge
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType("IDEA")}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${newType === 'IDEA' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                        Idea
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1">Content *</label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Type or paste the knowledge details, guidelines, transcripts, or idea descriptions here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1">Tags <span className="text-slate-650">(comma separated)</span></label>
                    <div className="flex gap-2 items-center bg-slate-950 border border-slate-800 rounded-lg p-2 focus-within:border-blue-500 transition-colors">
                      <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                      <input
                        type="text"
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        className="w-full bg-transparent border-none text-slate-200 text-sm focus:outline-none"
                        placeholder="e.g. guidelines, target-audience, script-tips"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateEntry}
                    disabled={!newContent.trim() || isSaving}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                    Save Entry
                  </button>
                </div>
              </div>
            ) : selectedEntryId ? (
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
