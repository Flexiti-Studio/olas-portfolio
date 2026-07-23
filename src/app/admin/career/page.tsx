"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Edit2, Trash2, X, Check, Target, Trophy, Milestone, Code, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const queryClient = new QueryClient();

interface Career {
  id: string;
  title: string;
  category: string;
  status: string;
  date: string | null;
  description: string | null;
}

function CareerPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [formData, setFormData] = useState({
    title: "",
    category: "Goal",
    status: "Planned",
    date: "",
    description: "",
  });

  const { data: careers = [], isLoading } = useQuery<Career[]>({
    queryKey: ["careers"],
    queryFn: async () => {
      const res = await fetch("/api/career");
      if (!res.ok) throw new Error("Failed to fetch careers");
      const data = await res.json();
      return data.careers || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingId ? `/api/career/${editingId}` : "/api/career";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save career");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers"] });
      resetForm();
      showToast("Career entry saved successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/career/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete career");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers"] });
      showToast("Career entry deleted successfully!");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "Goal",
      status: "Planned",
      date: "",
      description: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (career: Career) => {
    setFormData({
      title: career.title,
      category: career.category || "Goal",
      status: career.status || "Planned",
      date: career.date || "",
      description: career.description || "",
    });
    setEditingId(career.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      date: formData.date || null,
    };
    mutation.mutate(payload);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Goal": return <Target size={18} className="text-blue-400" />;
      case "Achievement": return <Trophy size={18} className="text-yellow-400" />;
      case "Milestone": return <Milestone size={18} className="text-purple-400" />;
      case "Skill": return <Code size={18} className="text-emerald-400" />;
      default: return <Target size={18} className="text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Achieved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "In Progress": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Planned": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const isSaving = mutation.isPending;

  return (
    <div className="flex flex-col">
      <div className="mb-12 border-b border-zinc-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Career Tracker</h1>
          <p className="text-zinc-400 mt-2">Map out your long-term goals, milestones, and achievements.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Add Entry</span>
          </button>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-5">
          <Check size={18} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl max-w-sm w-full"
          >
            <h3 className="text-xl font-bold text-white mb-2">Delete Entry</h3>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to delete this career entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 shadow-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {editingId ? "Edit Career Entry" : "Add New Career Entry"}
            </h2>
            <button onClick={resetForm} className="text-zinc-400 hover:text-white p-2 bg-zinc-800 rounded-full" disabled={isSaving}>
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Title / Name</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Mastered Next.js, Target Senior Engineer, Spoke at Conf..."
                disabled={isSaving}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  disabled={isSaving}
                >
                  <option value="Goal">Goal</option>
                  <option value="Milestone">Milestone</option>
                  <option value="Achievement">Achievement</option>
                  <option value="Skill">Skill Acquisition</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  disabled={isSaving}
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Achieved">Achieved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Description & Notes</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="What does it take to get there? Or what did you learn?"
                disabled={isSaving}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                <span>{isSaving ? "Saving..." : "Save Entry"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : careers.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-16 rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="bg-zinc-800 p-5 rounded-2xl mb-6 shadow-inner">
            <Target className="text-zinc-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Career Goals Yet</h2>
          <p className="text-zinc-400 max-w-md mx-auto mb-8 text-lg">
            Start tracking your high-level career trajectory. Add goals, milestones, or achievements.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-white text-zinc-950 hover:bg-zinc-200 px-6 py-3 rounded-xl transition-colors font-bold"
          >
            <Plus size={20} />
            <span>Create First Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careers.map((career) => (
            <motion.div
              key={career.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => router.push(`/admin/career/${career.id}`)}
              className={`cursor-pointer bg-zinc-900 border border-zinc-800 p-6 rounded-2xl group transition-all shadow-sm flex flex-col h-full relative ${
                deleteMutation.isPending && deleteMutation.variables === career.id
                  ? "opacity-50"
                  : "hover:border-zinc-700 hover:shadow-xl hover:bg-zinc-800/30"
              }`}
            >
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur px-2 py-1 rounded-lg border border-zinc-800 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(career);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                  title="Edit"
                  disabled={deleteMutation.isPending}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(career.id);
                  }}
                  className="p-1.5 text-red-400 hover:text-red-500 transition-colors"
                  title="Delete"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && deleteMutation.variables === career.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4 pr-16">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  {getCategoryIcon(career.category)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white line-clamp-1" title={career.title}>
                    {career.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mt-1">
                    <span>{career.category}</span>
                    {career.date && (
                      <>
                        <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                        <span>{new Date(career.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-auto">
                {career.description ? (
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-4">
                    {career.description}
                  </p>
                ) : (
                  <p className="text-zinc-600 text-sm italic">No description provided.</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${getStatusColor(career.status)}`}>
                  {career.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CareerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CareerPageContent />
    </QueryClientProvider>
  );
}
