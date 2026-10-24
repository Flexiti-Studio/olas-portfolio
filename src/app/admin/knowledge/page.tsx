"use client";

import { useState } from "react";
import { KnowledgeSearchBar } from "./components/KnowledgeSearchBar";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { Loader2, Plus, Save, X, Tag, Star, FileText, Lightbulb } from "lucide-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  },
});

type KnowledgeTab = "ALL" | "KNOWLEDGE" | "IDEA" | "FAVOURITES";

function KnowledgeDashboardContent() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("ALL");
  const [favSubFilter, setFavSubFilter] = useState<"ALL" | "KNOWLEDGE" | "IDEA">("ALL");
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState<"KNOWLEDGE" | "IDEA">("KNOWLEDGE");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newIsFavourite, setNewIsFavourite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading: loading, isFetching, refetch: fetchEntries } = useQuery({
    queryKey: ["knowledge-entries"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge/entries");
      const json = await res.json();
      return json.data;
    },
  });

  const entries = data?.entries || [];

  const handleToggleFavourite = async (id: string, nextFav: boolean) => {
    // Optimistic UI cache update
    queryClient.setQueryData(["knowledge-entries"], (old: any) => {
      if (!old?.entries) return old;
      return {
        ...old,
        entries: old.entries.map((entry: any) =>
          entry.id === id ? { ...entry, isFavourite: nextFav } : entry
        ),
      };
    });

    try {
      const res = await fetch(`/api/knowledge/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavourite: nextFav }),
      });
      if (!res.ok) throw new Error("Failed to update favourite");
      toast.success(nextFav ? "⭐ Marked as favourite" : "Removed from favourites");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update favourite");
      fetchEntries();
    }
  };

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
          isFavourite: newIsFavourite,
        }),
      });

      if (!res.ok) throw new Error("Failed to save knowledge entry");

      const resJson = await res.json();
      if (resJson.success && resJson.data?.entry) {
        setIsCreating(false);
        setNewContent("");
        setNewTags("");
        setNewType("KNOWLEDGE");
        setNewIsFavourite(false);
        await fetchEntries();
        setSelectedEntryId(resJson.data.entry.id);
        toast.success(newType === "IDEA" ? "💡 Idea created successfully!" : "📄 Knowledge document saved!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving knowledge entry.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter entries based on active tab and favourite subfilter
  const filteredEntries = entries.filter((e: any) => {
    if (activeTab === "FAVOURITES") {
      if (!e.isFavourite) return false;
      if (favSubFilter !== "ALL" && e.type !== favSubFilter) return false;
      return true;
    }
    if (activeTab === "KNOWLEDGE") return e.type === "KNOWLEDGE";
    if (activeTab === "IDEA") return e.type === "IDEA";
    return true;
  });

  const allCount = entries.length;
  const knowledgeCount = entries.filter((e: any) => e.type === "KNOWLEDGE").length;
  const ideaCount = entries.filter((e: any) => e.type === "IDEA").length;
  const favCount = entries.filter((e: any) => !!e.isFavourite).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Knowledge Hub</h1>
            <p className="text-sm text-slate-400 mt-1">
              Curate, organize, and search your trading playbooks, ideas, strategies, and notes.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedEntryId(null);
              setIsCreating(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
        
        <KnowledgeSearchBar onSelectMatch={(id) => {
          setIsCreating(false);
          setSelectedEntryId(id);
        }} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-slate-800">
          {/* Left Column: Tabs & Entries List */}
          <div className="lg:col-span-1 border-r border-slate-800 pr-4">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-300">Entries</h2>
                {isFetching && !loading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
              </div>

              {/* Segmented Tabs: All | Knowledge | Ideas | Favourites */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "ALL"
                      ? "bg-slate-800 text-white shadow-sm border border-slate-700/60"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                  title="View all entries"
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-slate-400 font-mono">
                    {allCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("KNOWLEDGE")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "KNOWLEDGE"
                      ? "bg-blue-600/20 text-blue-300 shadow-sm border border-blue-500/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                  title="View Knowledge entries only"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Knowledge</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-blue-300 font-mono">
                    {knowledgeCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("IDEA")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "IDEA"
                      ? "bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                  title="View Ideas only"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ideas</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 font-mono">
                    {ideaCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("FAVOURITES")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === "FAVOURITES"
                      ? "bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/50"
                      : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/40"
                  }`}
                  title="View Favorited entries"
                >
                  <Star className={`w-3.5 h-3.5 ${activeTab === "FAVOURITES" ? "fill-amber-300 text-amber-300" : "text-amber-400"}`} />
                  <span>Favs</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    favCount > 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-950 text-slate-500"
                  }`}>
                    {favCount}
                  </span>
                </button>
              </div>

              {/* Sub-filter row when inside Favourites tab */}
              {activeTab === "FAVOURITES" && (
                <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/70 text-[11px]">
                  <span className="text-slate-500 px-1 font-medium">Show:</span>
                  <button
                    onClick={() => setFavSubFilter("ALL")}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                      favSubFilter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({favCount})
                  </button>
                  <button
                    onClick={() => setFavSubFilter("KNOWLEDGE")}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      favSubFilter === "KNOWLEDGE" ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3 h-3 text-blue-400" />
                    Knowledge ({entries.filter((e: any) => !!e.isFavourite && e.type === "KNOWLEDGE").length})
                  </button>
                  <button
                    onClick={() => setFavSubFilter("IDEA")}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      favSubFilter === "IDEA" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    Ideas ({entries.filter((e: any) => !!e.isFavourite && e.type === "IDEA").length})
                  </button>
                </div>
              )}
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
                  onToggleFavourite={handleToggleFavourite}
                />
              </div>
            )}
          </div>
          
          {/* Right Column: Entry Details or Creation Form */}
          <div className="lg:col-span-2 pl-4">
            {isCreating ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-1">Entry Type</label>
                      <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 w-fit">
                        <button
                          type="button"
                          onClick={() => setNewType("KNOWLEDGE")}
                          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            newType === 'KNOWLEDGE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Knowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewType("IDEA")}
                          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            newType === 'IDEA' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          Idea
                        </button>
                      </div>
                    </div>

                    {/* Tag as Favourite Checkbox */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-1">Favourite</label>
                      <button
                        type="button"
                        onClick={() => setNewIsFavourite(!newIsFavourite)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          newIsFavourite
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${newIsFavourite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        <span>{newIsFavourite ? 'Tagged as Favourite' : 'Mark as Favourite'}</span>
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
                    <label className="block text-sm font-semibold text-slate-400 mb-1">
                      Tags <span className="text-slate-500 font-normal">(comma separated)</span>
                    </label>
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
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateEntry}
                    disabled={!newContent.trim() || isSaving}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20 active:scale-95"
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
              <div className="flex flex-col items-center justify-center h-80 text-slate-500 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                <FileText className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-400">Select an entry from the list to view or edit details.</p>
                <p className="text-xs text-slate-600 mt-1">Or click "+ Add Entry" to create a new knowledge document or idea.</p>
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
