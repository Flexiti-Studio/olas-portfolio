import { useState, useEffect } from "react";
import { Loader2, Save, History, RefreshCcw, Trash2, Star, Lightbulb, FileText } from "lucide-react";
import { format } from "date-fns";

export function EntryDetail({ entryId, onUpdated, onDeleted }: { entryId: string, onUpdated: () => void, onDeleted?: () => void }) {
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  
  // editable fields
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/entries/${entryId}`);
      const json = await res.json();
      if (json.success) {
        setEntry(json.data.entry);
        setContent(json.data.entry.content);
        setTags(json.data.entry.tags.join(", "));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, [entryId]);

  const handleToggleFavourite = async () => {
    if (!entry) return;
    const nextFav = !entry.isFavourite;
    setTogglingFav(true);
    try {
      const res = await fetch(`/api/knowledge/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavourite: nextFav }),
      });
      const json = await res.json();
      if (json.success) {
        setEntry((prev: any) => ({ ...prev, isFavourite: nextFav }));
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tagArray = tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
      const res = await fetch(`/api/knowledge/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags: tagArray })
      });
      const json = await res.json();
      if (json.success) {
        onUpdated();
        await fetchEntry(); // reload to get new version history
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this entry?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/entries/${entryId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        if (onDeleted) onDeleted();
        else onUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!entry) return null;

  const hasChanges = content !== entry.content || tags !== entry.tags.join(", ");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap gap-3 justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          {entry.type === "IDEA" ? (
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{entry.type === "IDEA" ? "Idea Entry" : "Knowledge Document"}</span>
            </h2>
            <div className="text-xs text-slate-500">
              Updated {format(new Date(entry.updatedAt), "MMMM d, yyyy · h:mm a")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Favourite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavourite}
            disabled={togglingFav}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              entry.isFavourite
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            title={entry.isFavourite ? "Favorited (Click to remove)" : "Click to mark as favourite"}
          >
            {togglingFav ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Star className={`w-3.5 h-3.5 ${entry.isFavourite ? 'fill-amber-400 text-amber-400' : ''}`} />
            )}
            <span>{entry.isFavourite ? "Favorited" : "Favourite"}</span>
          </button>

          {hasChanges && (
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          )}

          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md p-4 text-slate-200 min-h-[200px] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="text-sm text-slate-500">
          Source: {entry.source} | Project ID: {entry.projectId || "None"}
        </div>
      </div>

      {entry.versions && entry.versions.length > 0 && (
        <div className="pt-6 border-t border-slate-800 mt-8">
          <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
          </h3>
          <div className="space-y-3">
            {entry.versions.map((v: any, i: number) => (
              <div key={v.id} className="p-3 bg-slate-950 border border-slate-800 rounded-md text-sm">
                <div className="text-slate-500 text-xs mb-2">
                  Previous version {format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                <div className="text-slate-400 line-clamp-3">{v.content}</div>
                <button 
                  onClick={() => setContent(v.content)}
                  className="mt-2 text-blue-500 text-xs flex items-center gap-1 hover:text-blue-400"
                >
                  <RefreshCcw className="w-3 h-3" />
                  Restore into editor
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
