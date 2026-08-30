"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Edit2, Trash2, X, Check, Target, Trophy, Milestone, Code, Loader2, Layers, ChevronRight, Award, Briefcase } from "lucide-react";
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

interface HierarchyLevel {
  id: string;
  level: string;
  title: string;
  status: string; // "Completed" | "Current" | "Target" | "Future"
  focus: string;
  requirements: string[];
  skills: string[];
}

const DEFAULT_HIERARCHY: HierarchyLevel[] = [
  {
    id: "1",
    level: "P1",
    title: "Learner / Trainee",
    status: "Completed",
    focus: "Acquiring the raw skill through structured or self-directed learning.",
    requirements: [
      "Learn core concepts via bootcamp, university, or self-study",
      "Build small practice projects to prove basic competence",
      "Absorb foundational tools and workflows of the craft"
    ],
    skills: ["Fundamentals", "Guided Projects", "Tooling Basics"]
  },
  {
    id: "2",
    level: "P2",
    title: "Aspirant / Early Practitioner",
    status: "Completed",
    focus: "Convincing others you can do the job, while being paid on a 'prove-it' scale.",
    requirements: [
      "Pitch potential to employers or clients who haven't seen your work yet",
      "Accept below-senior pay as a fair trade for real-world reps",
      "Close the gap between classroom knowledge and production-grade work"
    ],
    skills: ["Portfolio Building", "Networking", "On-the-job Learning"],
  },
  {
    id: "3",
    level: "P3",
    title: "Professional",
    status: "Current",
    focus: "Known competence — opportunities come to you instead of you chasing them.",
    requirements: [
      "Deliver reliably without needing to prove baseline ability anymore",
      "Get sought out by employers/clients based on reputation and track record",
      "Command market-rate pay reflecting demonstrated skill"
    ],
    skills: ["Domain Mastery", "Reputation", "Reliable Delivery"]
  },
  {
    id: "4",
    level: "P4",
    title: "Independent Practitioner / Founder",
    status: "Target",
    focus: "Converting accumulated experience into your own practice, product, or business.",
    requirements: [
      "Package expertise into a standalone offering (studio, consultancy, product)",
      "Take on business risk in exchange for full upside and autonomy",
      "Develop a second skill set: sales, cash flow, and client acquisition"
    ],
    skills: ["Business Development", "Client Acquisition", "Financial Management", "Strategic Positioning"]
  }
];

function CareerPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("career_hierarchy");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_HIERARCHY;
  });

  const [selectedLevelId, setSelectedLevelId] = useState<string>("2");
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [editingLevel, setEditingLevel] = useState<HierarchyLevel | null>(null);

  const [levelForm, setLevelForm] = useState({
    level: "",
    title: "",
    status: "Target",
    focus: "",
    requirementsText: "",
    skillsText: ""
  });

  const saveHierarchyToStorage = (newLevels: HierarchyLevel[]) => {
    setHierarchyLevels(newLevels);
    if (typeof window !== "undefined") {
      localStorage.setItem("career_hierarchy", JSON.stringify(newLevels));
    }
  };
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

  const { data: careers = [], isLoading, isError } = useQuery<Career[]>({
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

  const resetLevelForm = () => {
    setLevelForm({
      level: "",
      title: "",
      status: "Target",
      focus: "",
      requirementsText: "",
      skillsText: ""
    });
    setIsAddingLevel(false);
    setEditingLevel(null);
  };

  const handleEditLevel = (level: HierarchyLevel) => {
    setEditingLevel(level);
    setLevelForm({
      level: level.level,
      title: level.title,
      status: level.status,
      focus: level.focus,
      requirementsText: level.requirements.join("\n"),
      skillsText: level.skills.join(", ")
    });
    setIsAddingLevel(true);
  };

  const handleDeleteLevel = (id: string) => {
    const updated = hierarchyLevels.filter(lvl => lvl.id !== id);
    saveHierarchyToStorage(updated);
    if (selectedLevelId === id && updated.length > 0) {
      setSelectedLevelId(updated[0].id);
    }
    showToast("Level deleted from hierarchy!");
  };

  const handleLevelFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.level || !levelForm.title) return;

    const requirements = levelForm.requirementsText
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);
    const skills = levelForm.skillsText
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (editingLevel) {
      const updated = hierarchyLevels.map(lvl => lvl.id === editingLevel.id ? {
        ...lvl,
        level: levelForm.level,
        title: levelForm.title,
        status: levelForm.status,
        focus: levelForm.focus,
        requirements,
        skills
      } : lvl);
      saveHierarchyToStorage(updated);
      showToast("Hierarchy level updated!");
    } else {
      const newLvl: HierarchyLevel = {
        id: Date.now().toString(),
        level: levelForm.level,
        title: levelForm.title,
        status: levelForm.status,
        focus: levelForm.focus,
        requirements,
        skills
      };
      const updated = [...hierarchyLevels, newLvl];
      saveHierarchyToStorage(updated);
      setSelectedLevelId(newLvl.id);
      showToast("New hierarchy level added!");
    }
    resetLevelForm();
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

      {isError && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-sm flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1.5" />
          <div>
            <span className="font-bold">Database Server Offline:</span> We couldn't establish a connection to the remote Supabase database pooler. You can still customize your local **Career Hierarchy Leveling** path since it saves directly to your browser's local storage!
          </div>
        </div>
      )}

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
              className={`cursor-pointer bg-zinc-900 border border-zinc-800 p-6 rounded-2xl group transition-all shadow-sm flex flex-col h-full relative ${deleteMutation.isPending && deleteMutation.variables === career.id
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
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
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
      {/* Career Hierarchy Section */}
      <div className="mt-16 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="text-purple-400" size={24} />
              Career Hierarchy Leveling
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Define your leveling roadmap, responsibilities, and target skills.</p>
          </div>
          <button
            onClick={() => {
              resetLevelForm();
              setIsAddingLevel(true);
            }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Level</span>
          </button>
        </div>

        {hierarchyLevels.length === 0 ? (
          <p className="text-zinc-500 italic text-center py-6">No levels defined. Click Add Level to start.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Visual Levels Path */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-zinc-800 pr-0 lg:pr-8 scrollbar-none shrink-0">
              {hierarchyLevels.map((lvl, index) => {
                const isSelected = selectedLevelId === lvl.id;
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "Completed": return "border-emerald-500 text-emerald-400 bg-emerald-500/10";
                    case "Current": return "border-blue-500 text-blue-400 bg-blue-500/10";
                    case "Target": return "border-yellow-500 text-yellow-400 bg-yellow-500/10";
                    default: return "border-zinc-700 text-zinc-400 bg-zinc-850/50";
                  }
                };

                return (
                  <div key={lvl.id} className="flex items-center gap-3 w-full shrink-0 md:w-auto">
                    <button
                      onClick={() => setSelectedLevelId(lvl.id)}
                      className={`flex-1 text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected
                          ? "bg-zinc-800/80 border-purple-500 shadow-md shadow-purple-500/5 translate-x-1"
                          : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/20"
                        }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${getStatusColor(lvl.status)}`}>
                          {lvl.level || `L${index + 1}`}
                        </span>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-white text-sm truncate">{lvl.title}</h4>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{lvl.status}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-zinc-500 transition-transform shrink-0 ${isSelected ? "rotate-90 lg:rotate-0 text-purple-400" : ""}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Level Details Panel */}
            {(() => {
              const currentLvl = hierarchyLevels.find(l => l.id === selectedLevelId) || hierarchyLevels[0];
              if (!currentLvl) return null;

              return (
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-purple-400 text-xs font-bold uppercase tracking-widest">{currentLvl.level} Level</span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded border ${currentLvl.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            currentLvl.status === "Current" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              currentLvl.status === "Target" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                "bg-zinc-800/40 text-zinc-500 border-zinc-800"
                          }`}>
                          {currentLvl.status}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">{currentLvl.title}</h3>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEditLevel(currentLvl)}
                        className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Edit Level"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(currentLvl.id)}
                        className="p-2 bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg border border-red-500/10 transition-colors cursor-pointer"
                        title="Delete Level"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {currentLvl.focus && (
                    <div className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-2xl">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Briefcase size={14} className="text-zinc-500" /> Focus & Scope
                      </h4>
                      <p className="text-sm text-zinc-300 leading-relaxed">{currentLvl.focus}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Requirements */}
                    <div className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-2xl">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Award size={14} className="text-zinc-500" /> Key Requirements
                      </h4>
                      {currentLvl.requirements.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No requirements specified.</p>
                      ) : (
                        <ul className="space-y-2">
                          {currentLvl.requirements.map((req, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Target Skills */}
                    <div className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-2xl">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Code size={14} className="text-zinc-500" /> Key Skills & Tech Stack
                      </h4>
                      {currentLvl.skills.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No skills listed.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {currentLvl.skills.map((skill, i) => (
                            <span key={i} className="text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded-md">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Level Add/Edit Modal */}
      {isAddingLevel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-lg text-left"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingLevel ? "Edit Hierarchy Level" : "Add Hierarchy Level"}
              </h3>
              <button onClick={resetLevelForm} className="text-zinc-400 hover:text-white p-2 bg-zinc-800 rounded-full cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLevelFormSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Level Tag (e.g. L1)</label>
                  <input
                    required
                    type="text"
                    value={levelForm.level}
                    onChange={e => setLevelForm({ ...levelForm, level: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="L1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Level Title</label>
                  <input
                    required
                    type="text"
                    value={levelForm.title}
                    onChange={e => setLevelForm({ ...levelForm, title: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="Associate Software Engineer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Level Status</label>
                <select
                  value={levelForm.status}
                  onChange={e => setLevelForm({ ...levelForm, status: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                >
                  <option value="Completed">Completed</option>
                  <option value="Current">Current</option>
                  <option value="Target">Target</option>
                  <option value="Future">Future</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Focus & Scope</label>
                <textarea
                  rows={2}
                  value={levelForm.focus}
                  onChange={e => setLevelForm({ ...levelForm, focus: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Primary focus and autonomy scope of this role..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Key Requirements (one per line)</label>
                <textarea
                  rows={3}
                  value={levelForm.requirementsText}
                  onChange={e => setLevelForm({ ...levelForm, requirementsText: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Requirement 1&#10;Requirement 2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Skills & Tech Stack (comma separated)</label>
                <input
                  type="text"
                  value={levelForm.skillsText}
                  onChange={e => setLevelForm({ ...levelForm, skillsText: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="React, Git, System Design"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={resetLevelForm}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors text-sm cursor-pointer"
                >
                  Save Level
                </button>
              </div>
            </form>
          </motion.div>
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
