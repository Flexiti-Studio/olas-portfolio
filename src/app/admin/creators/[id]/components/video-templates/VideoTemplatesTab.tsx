import React, { useState, useEffect } from "react";
import { Plus, Copy, Trash2, CheckCircle2, Clock, Layers, Maximize, Settings2, MoreVertical, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function VideoTemplatesTab({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/video-templates?userId=${creatorId}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (template: any) => {
    try {
      const newName = `${template.name} (Copy)`;
      const res = await fetch('/api/video-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: template.description,
          data: template.data,
          userId: creatorId,
          isDefault: false
        })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error("Duplicate failed", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/video-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/video-templates/${id}/default`, { method: 'PUT' });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error("Set default failed", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-500" />
            Video Templates
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage how your stories are compiled into video scenes.</p>
        </div>
        <button
          onClick={() => router.push(`/admin/creators/${creatorId}/video-templates/new`)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => {
          const beatCount = template.data?.structure?.length || 0;
          const format = template.data?.format || "16:9";

          return (
            <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group relative hover:border-indigo-500/50 transition-colors">
              
              {/* Card Header */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] uppercase font-bold tracking-wider border border-indigo-500/30">
                          Default
                        </span>
                      )}
                    </h3>
                  </div>
                  
                  {/* Context Menu */}
                  <div className="relative group/menu">
                    <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 flex flex-col py-1">
                      <button 
                        onClick={() => router.push(`/admin/creators/${creatorId}/video-templates/${template.id}`)}
                        className="px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDuplicate(template)}
                        className="px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      {!template.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(template.id)}
                          className="px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Set as Default
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(template.id)}
                        disabled={isDeleting === template.id}
                        className="px-4 py-2 text-sm text-left text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2 border-t border-slate-700 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {isDeleting === template.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">
                  {template.description || "No description provided."}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300">
                    <Maximize className="w-3.5 h-3.5 text-slate-500" />
                    {format}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    {beatCount} Beats
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Edited {new Date(template.updatedAt).toLocaleDateString()}
                </div>
                <button 
                  onClick={() => router.push(`/admin/creators/${creatorId}/video-templates/${template.id}`)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Edit Template →
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
