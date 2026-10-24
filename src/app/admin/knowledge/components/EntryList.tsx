import { FileText, Lightbulb, Star } from "lucide-react";
import { format } from "date-fns";

interface EntryListProps {
  entries: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleFavourite?: (id: string, isFav: boolean) => void;
}

export function EntryList({ entries, selectedId, onSelect, onToggleFavourite }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-slate-500 text-sm p-6 text-center bg-slate-900/50 rounded-xl border border-slate-800/80">
        No entries found matching this view.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
      {entries.map((entry) => {
        const isSelected = selectedId === entry.id;
        const isFav = !!entry.isFavourite;

        return (
          <div
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer relative group ${
              isSelected
                ? 'bg-slate-800 border-blue-500 shadow-md shadow-blue-500/10'
                : isFav
                ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-850'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {entry.type === "IDEA" ? (
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-400">
                  {entry.type} • {format(new Date(entry.updatedAt), "MMM d, h:mm a")}
                </span>
              </div>

              {/* Favourite Star Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavourite?.(entry.id, !isFav);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  isFav
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                    : 'text-slate-600 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title={isFav ? "Favorited (Click to remove)" : "Click to mark as favourite"}
              >
                <Star
                  className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                    isFav ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
              </button>
            </div>
            
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {entry.summary || entry.content}
            </p>
            
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {isFav && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-md border border-amber-500/30 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-300" /> Favourite
                </span>
              )}
              {entry.tags && entry.tags.length > 0 && entry.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-slate-950/80 rounded-md text-slate-400 border border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
