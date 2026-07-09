"use client";

import { useState, useEffect } from "react";
import { KnowledgeSearchBar } from "./components/KnowledgeSearchBar";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { Loader2 } from "lucide-react";

export default function KnowledgeDashboard() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/knowledge/entries");
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Knowledge Hub</h1>
        
        <KnowledgeSearchBar onSelectMatch={(id) => setSelectedEntryId(id)} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-slate-800">
          <div className="lg:col-span-1 border-r border-slate-800 pr-4">
            <h2 className="text-xl font-bold text-slate-400 mb-4">Entries</h2>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <EntryList 
                entries={entries} 
                selectedId={selectedEntryId}
                onSelect={(id) => setSelectedEntryId(id)} 
              />
            )}
          </div>
          
          <div className="lg:col-span-2 pl-4">
            {selectedEntryId ? (
              <EntryDetail 
                entryId={selectedEntryId}
                onUpdated={() => {
                  fetchEntries(); // refresh list
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
