"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Clock } from "lucide-react";

const SAMPLE_DATABASE = [
  "React Server Components (RSC)",
  "Next.js App Router Parallel Routes",
  "Tailwind CSS JIT Optimizations",
  "PostgreSQL B-Tree Indexing",
  "Redis Distributed Locks",
  "Docker Multi-Stage Builds",
  "TypeScript Discriminated Unions",
  "Web Workers Off-Thread Processing",
  "Zod Schema Validation",
  "GraphQL Query Complexity Analysis",
];

export default function DebouncedSearchDemo() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [delay, setDelay] = useState(300);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string[]>(SAMPLE_DATABASE);

  // Debounce effect
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [query, delay]);

  // Filter effect based on debounced term
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(SAMPLE_DATABASE);
    } else {
      setResults(
        SAMPLE_DATABASE.filter((item) =>
          item.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      );
    }
  }, [debouncedQuery]);

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h4 className="text-base font-semibold text-white">Debounced Input & Query Dispatcher</h4>
        <p className="text-xs text-slate-400">
          Throttle fast keyboard input to prevent query hammering and network race conditions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type rapidly to test debounce..."
              className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin absolute right-3 top-3.5" />
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Delay:</span>
            <select
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="bg-transparent font-mono text-indigo-400 focus:outline-none"
            >
              <option value="150" className="bg-slate-900">150ms</option>
              <option value="300" className="bg-slate-900">300ms</option>
              <option value="600" className="bg-slate-900">600ms</option>
            </select>
          </div>
        </div>

        {/* State diagnostics */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div>
            <span className="text-slate-500">Live Input:</span>{" "}
            <span className="text-amber-400">&quot;{query}&quot;</span>
          </div>
          <div>
            <span className="text-slate-500">Debounced:</span>{" "}
            <span className="text-emerald-400">&quot;{debouncedQuery}&quot;</span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-400">
            Matched Results ({results.length}):
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {results.length > 0 ? (
              results.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-lg text-xs text-slate-300 hover:border-slate-700 transition-colors"
                >
                  {item}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/20 rounded-lg">
                No matching items for &quot;{debouncedQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

