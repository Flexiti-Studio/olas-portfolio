import { useState, useEffect } from "react";
import { Loader2, Save, History, RefreshCcw } from "lucide-react";
import { format } from "date-fns";

export function EntryDetail({ entryId, onUpdated }: { entryId: string, onUpdated: () => void }) {
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Entry Details</h2>
        {hasChanges && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
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
