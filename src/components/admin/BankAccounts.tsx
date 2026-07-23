"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Target, CheckCircle2, Circle, ArrowRight, Flag, GripVertical, List, FileText, Edit3 } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

export default function BankAccounts() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("Active Goals");
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState<string | undefined>(undefined);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [notesPage, setNotesPage] = useState(1);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/goals?t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setGoals(json.data);
    } catch (e) { }
    setLoading(false);
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/settings?key=goal_notes');
      const json = await res.json();
      if (json.value && Array.isArray(json.value)) {
        setNotes(json.value);
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchGoals();
    fetchNotes();
  }, []);

  const handleAddGoal = async () => {
    if (!newGoalTitle) return;
    setIsCreatingGoal(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newGoalTitle, deadline: newGoalDeadline || undefined })
      });
      setNewGoalTitle("");
      setNewGoalDeadline("");
      setIsAdding(false);
      fetchGoals();
    } catch (e) { }
    setIsCreatingGoal(false);
  };

  const handleDeleteGoal = (id: string) => {
    setGoalToDelete(id);
  };

  const handleAddNote = async () => {
    if (!newNote) return;
    setIsSavingNote(true);
    const updatedNotes = [...notes, { id: Date.now().toString(), text: newNote, createdAt: Date.now() }];
    setNotes(updatedNotes);
    setNewNote("");
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goal_notes', value: updatedNotes })
      });
    } catch (e) { }
    setIsSavingNote(false);
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goal_notes', value: updatedNotes })
      });
    } catch (e) { }
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/goals/${goalToDelete}`, { method: "DELETE" });
      fetchGoals();
    } catch (e) { }
    setIsDeleting(false);
    setGoalToDelete(null);
  };

  const updateGoal = async (id: string, updates: any) => {
    // Optimistic UI update
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
    try {
      await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      // We don't fetchGoals() here to prevent jumping if they quickly check multiple boxes
    } catch (e) { }
  };

  const openEdit = (goal: any) => {
    setEditGoalId(goal.id);
    setEditTitle(goal.title || "");
    setEditDeadline(goal.deadline || "");
  };

  const closeEdit = () => {
    setEditGoalId(null);
    setEditTitle("");
    setEditDeadline(undefined);
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editGoalId) return closeEdit();
    setIsSavingEdit(true);
    const updates: any = { title: editTitle };
    // If empty string, clear the date (send null), otherwise send the date string
    updates.deadline = editDeadline && editDeadline !== "" ? editDeadline : null;
    try {
      await updateGoal(editGoalId, updates);
      // refresh list to ensure derived fields (period/quarter) are recalculated
      await fetchGoals();
    } catch (e) { }
    setIsSavingEdit(false);
    closeEdit();
  };

  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  const quarterToColor = (q: string) => {
    switch (q) {
      case "1": return "bg-indigo-500";
      case "2": return "bg-emerald-500";
      case "3": return "bg-yellow-500";
      case "4": return "bg-rose-500";
      default: return "bg-slate-600";
    }
  };

  useEffect(() => {
    setActivePage(1);
  }, [selectedYear]);

  const handleReorder = (reorderedPageActive: any[]) => {
    // Actually, to avoid circular dependencies, let's just update the specific items' order fields.
    // The easiest way is to map the original array and swap orders, or just update the DB and refetch!
    // Let's do optimistic update for the whole goals array.
    const reorderedIds = reorderedPageActive.map(g => g.id);
    const newGoals = [...goals];

    // Sort the matched goals in the main array to match the new order
    let insertIndex = 0;
    const reorderedItems = newGoals.filter(g => reorderedIds.includes(g.id)).sort((a, b) => {
      return reorderedIds.indexOf(a.id) - reorderedIds.indexOf(b.id);
    });

    const finalGoals = newGoals.map(g => {
      if (reorderedIds.includes(g.id)) {
        return reorderedItems[insertIndex++];
      }
      return g;
    });

    setGoals(finalGoals);

    fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: reorderedPageActive.map((g, index) => ({ id: g.id, order: ((activePage - 1) * 10) + index }))
      })
    });
  };

  const handleAddTimelineStep = (goalId: string, text: string) => {
    if (!text.trim()) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newTimeline = [...(goal.timeline || []), { id: Date.now().toString(), text, completed: false }];
    updateGoal(goalId, { timeline: newTimeline });
  };

  const handleToggleTimelineStep = (goalId: string, stepId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newTimeline = goal.timeline.map((step: any) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    updateGoal(goalId, { timeline: newTimeline });
  };

  const handleDeleteTimelineStep = (goalId: string, stepId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newTimeline = goal.timeline.filter((step: any) => step.id !== stepId);
    updateGoal(goalId, { timeline: newTimeline });
  };

  if (loading) return (
    <div className="space-y-10 border border-zinc-800 rounded-3xl p-6 md:p-8 bg-zinc-950/30 animate-pulse">
      <div className="h-48 md:h-64 bg-slate-900/50 rounded-3xl border border-slate-800/50 w-full" />
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 h-[400px] bg-slate-900/50 rounded-3xl border border-slate-800/50" />
        <div className="w-full md:w-2/3 space-y-4">
          <div className="h-24 bg-slate-900/50 rounded-2xl border border-slate-800/50 w-full" />
          <div className="h-24 bg-slate-900/50 rounded-2xl border border-slate-800/50 w-full" />
          <div className="h-24 bg-slate-900/50 rounded-2xl border border-slate-800/50 w-full" />
        </div>
      </div>
    </div>
  );

  const goalsWithDerivedStatus = goals.map(g => {
    const timeline = Array.isArray(g.timeline) ? g.timeline : [];
    const completedSteps = timeline.filter((t: any) => t.completed).length;
    const progress = timeline.length > 0 ? Math.round((completedSteps / timeline.length) * 100) : (g.status === "achieved" ? 100 : 0);
    const isCompleted = progress === 100 || g.status === "achieved";
    const year = g.deadline ? new Date(g.deadline).getFullYear().toString() : "No Date";
    let quarter = "";
    let period = "No Date";
    if (g.deadline) {
      const m = new Date(g.deadline).getMonth();
      quarter = Math.floor(m / 3) + 1 + "";
      period = `${year} Q${quarter}`;
    }
    const quarterColor = quarterToColor(quarter || "");
    return { ...g, progress, isCompleted, year, quarter, period, quarterColor };
  });

  const filteredActiveGoals = goalsWithDerivedStatus.filter(g => {
    if (selectedYear === "Active Goals") return !g.isCompleted;
    if (selectedYear === "All Goals") return true;
    return g.period === selectedYear;
  });

  const filteredAchievedGoals = goalsWithDerivedStatus.filter(g => g.isCompleted).filter(g => {
    if (selectedYear === "All Goals" || selectedYear === "Active Goals") return true;
    return g.period === selectedYear;
  });

  const headerGoals = goalsWithDerivedStatus.filter(g => {
    if (selectedYear === "All Goals" || selectedYear === "Active Goals") return true;
    return g.period === selectedYear;
  });
  const headerAchievedCount = headerGoals.filter(g => g.isCompleted).length;
  const headerTotalCount = headerGoals.length;

  const ITEMS_PER_PAGE = 10;

  const totalActivePages = Math.ceil(filteredActiveGoals.length / ITEMS_PER_PAGE);
  const currentActiveGoals = filteredActiveGoals.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

  const totalCompletedPages = Math.ceil(filteredAchievedGoals.length / ITEMS_PER_PAGE);
  const currentCompletedGoals = filteredAchievedGoals.slice((completedPage - 1) * ITEMS_PER_PAGE, completedPage * ITEMS_PER_PAGE);

  return (
    <div className="text-white space-y-10 border border-zinc-800 rounded-3xl p-6 md:p-8 bg-zinc-950/30">

      {/* Header & Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-10 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-slate-900/90 to-purple-900/80 backdrop-blur-xl border border-white/10 rounded-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center tracking-tight text-white mb-3">
              <Target className="mr-3 md:mr-4 w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
              Goals & Timelines
            </h1>
            <p className="text-indigo-200/70 max-w-md leading-relaxed text-base md:text-lg">
              Set personal and professional goals, track them through interactive timelines, and celebrate your achievements.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-inner backdrop-blur-md w-full md:w-auto md:min-w-[300px]">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-2 opacity-80">
              <Flag className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium tracking-wide uppercase text-emerald-100">Goals Achieved</span>
            </div>
            <div className="text-5xl font-black bg-gradient-to-r from-emerald-300 to-teal-500 bg-clip-text text-transparent drop-shadow-sm flex justify-center md:justify-start items-baseline">
              {headerAchievedCount} <span className="text-2xl text-emerald-500/50 ml-2">/ {headerTotalCount}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Goal Overview: Left (List) / Right (Timeline) */}
      <div className="mb-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col-reverse md:flex-row gap-8">

        {(() => {
          // Compute stats using derived period (year + quarter) calculated earlier
          const goalsWithStats = goalsWithDerivedStatus.map(g => {
            const progress = g.progress ?? 0;
            const year = g.year ?? "No Date";

            let color = "bg-slate-500"; // not started (0%)
            let text = "text-slate-400";
            let border = "border-slate-700";
            if (progress === 100) { color = "bg-emerald-500"; text = "text-emerald-400"; border = "border-emerald-500/50"; }
            else if (progress >= 50) { color = "bg-yellow-500"; text = "text-yellow-400"; border = "border-yellow-500/50"; }
            else if (progress > 0) { color = "bg-rose-500"; text = "text-rose-400"; border = "border-rose-500/50"; }

            const quarterColor = quarterToColor(g.quarter || "");
            return { ...g, progress, year, color, text, border, quarterColor };
          });

          const uniquePeriods = Array.from(new Set(goalsWithStats.map(g => g.period))).filter(p => p !== "No Date").sort();
          if (goalsWithStats.some(g => g.period === "No Date")) uniquePeriods.push("No Date");

          const yearStats = uniquePeriods.map(period => {
            const periodGoals = goalsWithStats.filter(g => g.period === period);
            const avgProgress = periodGoals.length > 0 ? Math.round(periodGoals.reduce((acc, g) => acc + g.progress, 0) / periodGoals.length) : 0;

            let color = "bg-slate-500";
            let text = "text-slate-400";
            if (avgProgress === 100) { color = "bg-emerald-500"; text = "text-emerald-400"; }
            else if (avgProgress >= 50) { color = "bg-yellow-500"; text = "text-yellow-400"; }
            else if (avgProgress > 0) { color = "bg-rose-500"; text = "text-rose-400"; }

            return { year: period, avgProgress, color, text };
          });

          // All Goals stat
          const allAvgProgress = goalsWithStats.length > 0 ? Math.round(goalsWithStats.reduce((acc, g) => acc + g.progress, 0) / goalsWithStats.length) : 0;
          let allColor = "bg-slate-500";
          let allText = "text-slate-400";
          if (allAvgProgress === 100 && goalsWithStats.length > 0) { allColor = "bg-emerald-500"; allText = "text-emerald-400"; }
          else if (allAvgProgress >= 50) { allColor = "bg-yellow-500"; allText = "text-yellow-400"; }
          else if (allAvgProgress > 0) { allColor = "bg-rose-500"; allText = "text-rose-400"; }

          // Active Goals stat
          const activeOnlyGoals = goalsWithStats.filter(g => g.status === "active" && g.progress < 100);
          const activeAvgProgress = activeOnlyGoals.length > 0 ? Math.round(activeOnlyGoals.reduce((acc, g) => acc + g.progress, 0) / activeOnlyGoals.length) : 0;
          let activeColor = "bg-slate-500";
          let activeText = "text-slate-400";
          if (activeAvgProgress === 100 && activeOnlyGoals.length > 0) { activeColor = "bg-emerald-500"; activeText = "text-emerald-400"; }
          else if (activeAvgProgress >= 50) { activeColor = "bg-yellow-500"; activeText = "text-yellow-400"; }
          else if (activeAvgProgress > 0) { activeColor = "bg-rose-500"; activeText = "text-rose-400"; }

          const timelineNodes = [
            { year: "Active Goals", avgProgress: activeAvgProgress, color: activeColor, text: activeText },
            { year: "All Goals", avgProgress: allAvgProgress, color: allColor, text: allText },
            ...yearStats
          ];

          const displayedGoals = goalsWithStats.filter(g => {
            if (selectedYear === "All Goals") return true;
            if (selectedYear === "Active Goals") return g.status === "active" && g.progress < 100;
            return g.period === selectedYear;
          });

          return (
            <>
              {/* Left Side: Goals List */}
              <div className="flex-1 pt-8 md:pt-0 border-t md:border-t-0 border-slate-800">
                <h2 className="text-2xl font-bold flex items-center text-slate-200 mb-6">
                  <List className="w-6 h-6 mr-3 text-indigo-400" />
                  {selectedYear} Overview
                </h2>
                <div className="space-y-4">
                  {displayedGoals.length === 0 ? (
                    <p className="text-slate-500 italic">No goals found for {selectedYear}.</p>
                  ) : (
                    displayedGoals.map((g, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={`overview-item-${g.id}`}
                        className={`relative flex items-center justify-between p-4 bg-slate-900 border ${g.border} rounded-xl`}
                      >
                        <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-tr-xl rounded-br-xl ${g.quarterColor}`} />
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${g.color} shadow-[0_0_10px_currentColor] ${g.text}`} />
                          <div>
                            <p className={`font-semibold ${g.text}`}>{g.title}</p>
                            <p className="text-xs text-slate-500">
                              {g.period !== "No Date" ? g.period : "No deadline set"}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${g.text}`}>{g.progress}%</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Vertical Timeline of Years */}
              <div className="md:w-64 md:border-l border-slate-800 pb-8 md:pb-0 md:pl-8">
                <h3 className="text-lg font-bold text-slate-300 mb-6">Timeline</h3>
                <div className="flex gap-2 items-center mb-4">
                  <span className="text-xs text-slate-400 mr-2">Quarter colors:</span>
                  <div className={`w-6 h-6 rounded-full ${quarterToColor('1')} border border-white/10`} />
                  <div className={`w-6 h-6 rounded-full ${quarterToColor('2')} border border-white/10`} />
                  <div className={`w-6 h-6 rounded-full ${quarterToColor('3')} border border-white/10`} />
                  <div className={`w-6 h-6 rounded-full ${quarterToColor('4')} border border-white/10`} />
                </div>
                <div className="relative pl-4">
                  <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-slate-800" />

                  {timelineNodes.map((node, i) => {
                    const isSelected = selectedYear === node.year;
                    return (
                      <button
                        key={node.year}
                        onClick={() => setSelectedYear(node.year)}
                        className={`relative w-full text-left flex items-center gap-4 py-3 group transition-all ${isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                      >
                        <div className={`absolute -left-[19px] w-3 h-3 rounded-full border-2 transition-all duration-300 ${isSelected ? 'scale-125 border-white ' + node.color : 'border-slate-900 ' + node.color}`} />
                        <div>
                          <p className={`font-bold transition-colors ${isSelected ? 'text-white' : node.text}`}>{node.year}</p>
                          <p className="text-xs text-slate-500">{node.avgProgress}% avg</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          );
        })()}
      </div>


      {/* Goals Grid */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-2xl font-bold flex items-center text-slate-200">
            <Target className="w-6 h-6 mr-3 text-purple-400" />
            {selectedYear === "Active Goals" ? "Active Goals" : selectedYear === "All Goals" ? "All Goals Timeline" : `${selectedYear} Timeline`}
          </h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="group relative inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          >
            <Plus className={`w-5 h-5 mr-2 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
            {isAdding ? "Cancel" : "Add Goal"}
          </button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] p-6 rounded-2xl max-w-2xl mx-auto flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="What do you want to achieve? (e.g. Build an AI SaaS)"
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                />
                <input
                  type="date"
                  value={newGoalDeadline}
                  onChange={e => setNewGoalDeadline(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-w-[150px] [color-scheme:dark]"
                />
                <button
                  onClick={handleAddGoal}
                  disabled={isCreatingGoal}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/25 shrink-0 disabled:opacity-50"
                >
                  {isCreatingGoal ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create <ArrowRight className="w-4 h-4 ml-2" /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative max-w-3xl mx-auto">
          {/* Master Timeline Line connecting all goals */}
          {filteredActiveGoals.length > 0 && (
            <div className="absolute left-[38px] top-10 bottom-10 w-1 bg-gradient-to-b from-indigo-500/20 via-purple-500/20 to-transparent rounded-full hidden md:block pointer-events-none" />
          )}

          <Reorder.Group
            axis="y"
            values={currentActiveGoals}
            onReorder={handleReorder}
            className="flex flex-col space-y-8 relative z-10"
          >
            {currentActiveGoals.length === 0 && !isAdding && (
              <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <p className="text-slate-400 italic">No active goals found for {selectedYear}.</p>
              </div>
            )}

            {currentActiveGoals.map((goal, i) => {
              const globalIndex = (activePage - 1) * ITEMS_PER_PAGE + i + 1;
              const timeline = Array.isArray(goal.timeline) ? goal.timeline : [];
              const completedSteps = timeline.filter((t: any) => t.completed).length;
              const progress = timeline.length > 0 ? (completedSteps / timeline.length) * 100 : 0;

              return (
                <Reorder.Item
                  key={goal.id}
                  value={goal}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative md:pl-16"
                >
                  {/* Master Timeline Node (Desktop only) */}
                  <div className="absolute left-[34px] top-8 w-3 h-3 bg-indigo-500 rounded-full hidden md:block z-20 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                  <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 shadow-xl">
                    <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-tr-2xl rounded-br-2xl ${goal.quarterColor}`} />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing hover:!opacity-100 transition-opacity p-2">
                      <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="pl-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-xl text-slate-100 flex-1 pr-4">
                            <span className="text-indigo-400 mr-2">#{globalIndex}.</span>
                            {goal.title}
                          </h3>
                          {goal.deadline && (
                            <div className="flex items-center text-xs font-medium mt-2 text-indigo-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                              Due: {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGoal(goal.id, { status: "achieved" })}
                            className="text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Mark as Achieved"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openEdit(goal)}
                            className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Goal"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Goal"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                          <span>Progress Tracker</span>
                          <span>{completedSteps} / {timeline.length} Steps</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Visual Timeline Section */}
                      <div className="mt-6 pt-6 border-t border-slate-800/50">
                        <div className="relative pl-6">
                          {/* Vertical line connecting steps */}
                          <div className="absolute left-[11px] top-2 bottom-6 w-[2px] bg-slate-800" />

                          {timeline.map((step: any) => (
                            <div key={step.id} className="relative mb-4 flex items-start gap-3 group/step">
                              <button
                                onClick={() => handleToggleTimelineStep(goal.id, step.id)}
                                className="absolute -left-[30px] top-0 bg-slate-900 rounded-full p-0.5 border border-slate-700 hover:border-indigo-500 transition-colors z-10"
                              >
                                {step.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-500" />}
                              </button>
                              <span className={`text-sm pt-0.5 ${step.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                {step.text}
                              </span>
                              <button
                                onClick={() => handleDeleteTimelineStep(goal.id, step.id)}
                                className="opacity-0 group-hover/step:opacity-100 text-slate-600 hover:text-rose-500 transition-all p-1 ml-auto shrink-0"
                              >
                                <XIcon />
                              </button>
                            </div>
                          ))}

                          <div className="relative flex items-center gap-2 mt-2 pt-2">
                            <div className="absolute -left-[27px] w-3 h-3 bg-slate-800 rounded-full z-10" />
                            <input
                              type="text"
                              placeholder="Add new step..."
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 px-2 py-1 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddTimelineStep(goal.id, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {/* Active Goals Pagination */}
          {totalActivePages > 1 && (
            <div className="flex justify-center mt-8 gap-2 relative z-10">
              {Array.from({ length: totalActivePages }).map((_, i) => (
                <button
                  key={`page-${i}`}
                  onClick={() => setActivePage(i + 1)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${activePage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredAchievedGoals.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-800/50">
          <h2 className="text-xl font-bold flex items-center text-slate-400 mb-6 px-2">
            <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500/50" /> Completed Goals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentCompletedGoals.map((goal, i) => {
              const globalIndex = (completedPage - 1) * ITEMS_PER_PAGE + i + 1;
              return (
                <div key={goal.id} className="relative bg-slate-900/50 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center group">
                  <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-tr-xl rounded-br-xl ${goal.quarterColor}`} />
                  <span className="text-slate-200 text-sm font-medium truncate flex-1">
                    <span className="text-emerald-500/70 mr-2">#{globalIndex}.</span>
                    {goal.title}
                  </span>
                  <button
                    onClick={() => updateGoal(goal.id, { status: "active" })}
                    className="text-xs font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0"
                  >
                    Restore
                  </button>
                </div>
              );
            })}
          </div>

          {/* Completed Goals Pagination */}
          {totalCompletedPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: totalCompletedPages }).map((_, i) => (
                <button
                  key={`comp-page-${i}`}
                  onClick={() => setCompletedPage(i + 1)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${completedPage === i + 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Notes Section */}
      <div className="mt-12 pt-8 border-t border-slate-800/50">
        <h2 className="text-2xl font-bold flex items-center text-slate-200 mb-6 px-2">
          <FileText className="w-6 h-6 mr-3 text-indigo-400" /> Notes
        </h2>

        <div className="bg-slate-900 border border-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.05)] p-6 rounded-2xl mb-8 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Add a new note..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={isSavingNote}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/25 shrink-0 disabled:opacity-50"
          >
            {isSavingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Add Note <Plus className="w-4 h-4 ml-2" /></>}
          </button>
        </div>

        <div className="space-y-3 px-2">
          {notes.slice((notesPage - 1) * 10, notesPage * 10).map((note, i) => {
            const noteIndex = (notesPage - 1) * 10 + i + 1;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex justify-between items-start group hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center text-indigo-400 font-bold mb-1 text-sm">
                    Note #{noteIndex}
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
          {notes.length === 0 && (
            <p className="text-slate-500 italic text-center py-6">No notes added yet.</p>
          )}
        </div>

        {/* Notes Pagination */}
        {Math.ceil(notes.length / 10) > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: Math.ceil(notes.length / 10) }).map((_, i) => (
              <button
                key={`note-page-${i}`}
                onClick={() => setNotesPage(i + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${notesPage === i + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Goal?</h3>
              <p className="text-slate-400 mb-6">Are you sure you want to delete this goal? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setGoalToDelete(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGoal}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors font-medium flex items-center"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editGoalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Edit Goal</h3>
              <p className="text-slate-400 mb-4">Update title or deadline. Leave date empty to clear.</p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />

                <input
                  type="date"
                  value={editDeadline || ""}
                  onChange={e => setEditDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setEditDeadline(""); }}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-medium"
                >
                  Clear Date
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
