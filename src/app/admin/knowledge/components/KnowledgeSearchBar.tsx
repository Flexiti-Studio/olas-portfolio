import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export function KnowledgeSearchBar({ onSelectMatch }: { onSelectMatch: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string, matches: any[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query })
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your saved knowledge or ideas..."
          className="w-full bg-slate-950 border border-slate-800 rounded-full py-4 pl-14 pr-6 text-slate-200 focus:outline-none focus:border-blue-500 shadow-sm"
        />
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Search className="w-6 h-6" />}
        </div>
      </form>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-lg text-slate-200 border border-slate-700">
            <h4 className="text-sm font-bold text-blue-400 mb-2">AI Answer:</h4>
            <p className="leading-relaxed">{result.answer}</p>
          </div>
          
          {result.matches && result.matches.length > 0 && (
            <div className="text-sm">
              <span className="text-slate-500 mb-2 block">Sources used:</span>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {result.matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMatch(m.id)}
                    className="flex-shrink-0 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 hover:border-blue-500 truncate max-w-[200px]"
                  >
                    {m.type}: {m.content}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
