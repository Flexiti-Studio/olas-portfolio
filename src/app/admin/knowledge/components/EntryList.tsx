import { FileText, Lightbulb } from "lucide-react";
import { format } from "date-fns";

export function EntryList({ entries, selectedId, onSelect }: { entries: any[], selectedId: string | null, onSelect: (id: string) => void }) {
  if (entries.length === 0) {
    return <div className="text-slate-500 text-sm">No knowledge entries found.</div>;
  }

  return (
    <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
      {entries.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry.id)}
          className={`w-full text-left p-4 rounded-lg border transition-colors ${
            selectedId === entry.id
              ? 'bg-slate-800 border-blue-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {entry.type === "IDEA" ? (
              <Lightbulb className="w-4 h-4 text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-xs font-medium text-slate-400">
              {entry.type} • {format(new Date(entry.updatedAt), "MMM d, h:mm a")}
            </span>
          </div>
          
          <p className="text-sm text-slate-300 line-clamp-2">
            {entry.summary || entry.content}
          </p>
          
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {entry.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
