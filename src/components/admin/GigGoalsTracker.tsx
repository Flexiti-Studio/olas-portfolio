"use client";

import { useState, useEffect } from "react";
import { Target, Flag, List, Plus, Trash2, CheckCircle2, Circle, X, ArrowRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface GigGoalsTrackerProps {
  appId: string;
}

export default function GigGoalsTracker({ appId }: GigGoalsTrackerProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("Active Milestones");
  
  // Notes State
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  // New Goal State
  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchNotes();
  }, [appId]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/settings?key=gig_notes_${appId}`);
      const json = await res.json();
      if (json.value && Array.isArray(json.value)) {
        setNotes(json.value);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGoals = () => {
    setIsLoading(true);
    fetch(`/api/goals?applicationId=${appId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGoals(data.data);
        }
      })
      .finally(() => setIsLoading(false));
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return toast.error("Goal title is required");
    
    setIsCreatingGoal(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          deadline: newDeadline || null,
          application_id: appId
        })
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Goal added successfully");
      setNewTitle("");
      setNewDeadline("");
      setIsAdding(false);
      fetchGoals();
    } catch (e) {
      toast.error("Failed to add goal");
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeletingGoal(true);
    try {
      await fetch(`/api/goals/${goalToDelete}`, { method: "DELETE" });
      toast.success("Goal deleted");
      setGoals(prev => prev.filter(g => g.id !== goalToDelete));
    } catch (e) {
      console.error(e);
      toast.error("Error deleting goal");
      fetchGoals();
    } finally {
      setIsDeletingGoal(false);
      setGoalToDelete(null);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const updateGoal = async (id: string, updates: any) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
    try {
      await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      fetchGoals();
    } catch (e) {
      toast.error("Failed to update goal");
    }
  };

  const handleAddTimelineStep = (goalId: string, text: string) => {
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

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    const newNoteObj = { id: Date.now().toString(), text: newNote, createdAt: Date.now() };
    const updatedNotes = [newNoteObj, ...notes];
    setNotes(updatedNotes);
    setNewNote("");
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `gig_notes_${appId}`, value: updatedNotes })
      });
      toast.success("Note added");
    } catch (e) {
      toast.error("Failed to add note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeletingNote(true);
    const updatedNotes = notes.filter(n => n.id !== noteToDelete);
    setNotes(updatedNotes);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `gig_notes_${appId}`, value: updatedNotes })
      });
      toast.success("Note deleted");
    } catch (e) {
      toast.error("Failed to delete note");
    } finally {
      setIsDeletingNote(false);
      setNoteToDelete(null);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
  };

  const quarterToColor = (q: string) => {
    switch (q) {
      case "1": return "bg-emerald-500";
      case "2": return "bg-blue-500";
      case "3": return "bg-purple-500";
      case "4": return "bg-rose-500";
      default: return "bg-slate-500";
    }
  };

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
    
    let color = "bg-slate-500"; // not started (0%)
    let text = "text-slate-400";
    let border = "border-slate-700";
    if (progress === 100) { color = "bg-emerald-500"; text = "text-emerald-400"; border = "border-emerald-500/50"; }
    else if (progress >= 50) { color = "bg-yellow-500"; text = "text-yellow-400"; border = "border-yellow-500/50"; }
    else if (progress > 0) { color = "bg-rose-500"; text = "text-rose-400"; border = "border-rose-500/50"; }

    const quarterColor = quarterToColor(quarter || "");
    return { ...g, progress, isCompleted, year, quarter, period, quarterColor, color, text, border };
  });

  const uniquePeriods = Array.from(new Set(goalsWithDerivedStatus.map(g => g.period))).filter(p => p !== "No Date").sort();
  if (goalsWithDerivedStatus.some(g => g.period === "No Date")) uniquePeriods.push("No Date");

  const yearStats = uniquePeriods.map(period => {
    const periodGoals = goalsWithDerivedStatus.filter(g => g.period === period);
    const avgProgress = periodGoals.length > 0 ? Math.round(periodGoals.reduce((acc, g) => acc + g.progress, 0) / periodGoals.length) : 0;

    let color = "bg-slate-500";
    let text = "text-slate-400";
    if (avgProgress === 100) { color = "bg-emerald-500"; text = "text-emerald-400"; }
    else if (avgProgress >= 50) { color = "bg-yellow-500"; text = "text-yellow-400"; }
    else if (avgProgress > 0) { color = "bg-rose-500"; text = "text-rose-400"; }

    return { year: period, avgProgress, color, text };
  });

  // All Goals stat
  const allAvgProgress = goalsWithDerivedStatus.length > 0 ? Math.round(goalsWithDerivedStatus.reduce((acc, g) => acc + g.progress, 0) / goalsWithDerivedStatus.length) : 0;
  let allColor = "bg-slate-500";
  let allText = "text-slate-400";
  if (allAvgProgress === 100 && goalsWithDerivedStatus.length > 0) { allColor = "bg-emerald-500"; allText = "text-emerald-400"; }
  else if (allAvgProgress >= 50) { allColor = "bg-yellow-500"; allText = "text-yellow-400"; }
  else if (allAvgProgress > 0) { allColor = "bg-rose-500"; allText = "text-rose-400"; }

  // Active Goals stat
  const activeOnlyGoals = goalsWithDerivedStatus.filter(g => g.status === "active" && g.progress < 100);
  const activeAvgProgress = activeOnlyGoals.length > 0 ? Math.round(activeOnlyGoals.reduce((acc, g) => acc + g.progress, 0) / activeOnlyGoals.length) : 0;
  let activeColor = "bg-slate-500";
  let activeText = "text-slate-400";
  if (activeAvgProgress === 100 && activeOnlyGoals.length > 0) { activeColor = "bg-emerald-500"; activeText = "text-emerald-400"; }
  else if (activeAvgProgress >= 50) { activeColor = "bg-yellow-500"; activeText = "text-yellow-400"; }
  else if (activeAvgProgress > 0) { activeColor = "bg-rose-500"; activeText = "text-rose-400"; }

  const timelineNodes = [
    { year: "Active Milestones", avgProgress: activeAvgProgress, color: activeColor, text: activeText },
    { year: "All Milestones", avgProgress: allAvgProgress, color: allColor, text: allText },
    ...yearStats
  ];

  const displayedGoals = goalsWithDerivedStatus.filter(g => {
    if (selectedYear === "All Milestones") return !g.isCompleted;
    if (selectedYear === "Active Milestones") return !g.isCompleted && g.status === "active";
    return !g.isCompleted && g.period === selectedYear;
  });

  const filteredAchievedGoals = goalsWithDerivedStatus.filter(g => g.isCompleted).filter(g => {
    if (selectedYear === "All Milestones" || selectedYear === "Active Milestones") return true;
    return g.period === selectedYear;
  });

  const headerGoals = goalsWithDerivedStatus.filter(g => {
    if (selectedYear === "All Milestones" || selectedYear === "Active Milestones") return true;
    return g.period === selectedYear;
  });
  
  const headerAchievedCount = headerGoals.filter(g => g.isCompleted).length;
  const headerTotalCount = headerGoals.length;

  return (
    <div className="text-white space-y-10 border border-zinc-800 rounded-3xl p-6 md:p-8 bg-zinc-950/30 mt-8">
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
              Milestones & Timelines
            </h1>
            <p className="text-indigo-200/70 max-w-md leading-relaxed text-base md:text-lg">
              Set personal and professional milestones, track them through interactive timelines, and celebrate your achievements.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-inner backdrop-blur-md w-full md:w-auto md:min-w-[300px]">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-2 opacity-80">
              <Flag className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium tracking-wide uppercase text-emerald-100">Milestones Achieved</span>
            </div>
            <div className="text-5xl font-black bg-gradient-to-r from-emerald-300 to-teal-500 bg-clip-text text-transparent drop-shadow-sm flex justify-center md:justify-start items-baseline">
              {headerAchievedCount} <span className="text-2xl text-emerald-500/50 ml-2">/ {headerTotalCount}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Goal Overview: Left (List) / Right (Timeline) */}
      <div className="mb-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 flex flex-col-reverse md:flex-row gap-8">
        
        {/* Left Side: Goals List */}
        <div className="flex-1 pt-8 md:pt-0 border-t md:border-t-0 border-slate-800">
            <h2 className="text-2xl font-bold flex items-center text-slate-200 mb-6">
            <List className="w-6 h-6 mr-3 text-indigo-400" />
            {selectedYear} Overview
          </h2>
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-slate-500 italic">Loading milestones...</p>
            ) : displayedGoals.length === 0 ? (
              <p className="text-slate-500 italic">No milestones found for {selectedYear}.</p>
            ) : (
              displayedGoals.map((g, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={`overview-item-${g.id}`}
                  className={`relative flex flex-col p-4 bg-slate-900 border ${g.border} rounded-xl`}
                >
                  <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-tr-xl rounded-br-xl ${g.quarterColor}`} />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${g.color} shadow-[0_0_10px_currentColor] ${g.text}`} />
                      <div>
                        <p className={`font-semibold ${g.text}`}>{g.title}</p>
                        <p className="text-xs text-slate-500">
                          {g.period !== "No Date" ? g.period : "No deadline set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pr-4">
                      <span className={`text-sm font-bold ${g.text}`}>{g.progress}%</span>
                    </div>
                  </div>
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
      </div>

      {/* Goals Grid */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold flex items-center text-slate-200 bg-zinc-900 px-4 py-1.5 rounded-lg border border-zinc-800">
              Active Milestones
            </h2>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="group relative inline-flex items-center justify-center px-6 py-2 font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-500 focus:outline-none"
          >
            <Plus className={`w-4 h-4 mr-2 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
            {isAdding ? "Cancel" : "Add Milestone"}
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
                  placeholder="What do you want to achieve?"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                />
                <input
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-w-[150px] [color-scheme:dark]"
                />
                <button
                  onClick={handleAddGoal}
                  disabled={isCreatingGoal}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/25 shrink-0"
                >
                  {isCreatingGoal ? "Creating..." : <>Create <ArrowRight className="w-4 h-4 ml-2" /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative max-w-3xl mx-auto">
          {displayedGoals.filter(g => !g.isCompleted).length > 0 && (
            <div className="absolute left-[38px] top-10 bottom-10 w-1 bg-gradient-to-b from-indigo-500/20 via-purple-500/20 to-transparent rounded-full hidden md:block pointer-events-none" />
          )}

          <div className="flex flex-col space-y-8 relative z-10">
            {displayedGoals.filter(g => !g.isCompleted).length === 0 && !isAdding && (
              <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <p className="text-slate-400 italic">No active milestones found for {selectedYear}.</p>
              </div>
            )}

            {displayedGoals.filter(g => !g.isCompleted).map((goal, i) => {
              const timeline = Array.isArray(goal.timeline) ? goal.timeline : [];
              const completedSteps = timeline.filter((t: any) => t.completed).length;
              const progress = timeline.length > 0 ? (completedSteps / timeline.length) * 100 : 0;

              return (
                <div key={goal.id} className="group relative md:pl-16">
                  {/* Master Timeline Node (Desktop only) */}
                  <div className="absolute left-[34px] top-8 w-3 h-3 bg-indigo-500 rounded-full hidden md:block z-20 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                  <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 shadow-xl">
                    <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-tr-2xl rounded-br-2xl ${goal.quarterColor}`} />

                    <div className="pl-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-xl text-slate-100 flex-1 pr-4">
                            <span className="text-indigo-400 mr-2">#{i + 1}.</span>
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
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Milestone"
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
                      
                      {/* Checklists for Large Card */}
                      <div className="mt-6 space-y-3">
                        {timeline.map((step: any) => (
                          <div key={step.id} className="group/step flex items-start gap-3">
                            <button
                              onClick={() => handleToggleTimelineStep(goal.id, step.id)}
                              className="mt-0.5 text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                            >
                              {step.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <span className={`text-sm pt-0.5 flex-1 ${step.completed ? "text-slate-500 line-through" : "text-slate-300"}`}>
                              {step.text}
                            </span>
                            <button
                              onClick={() => handleDeleteTimelineStep(goal.id, step.id)}
                              className="text-slate-600 hover:text-rose-500 opacity-0 group-hover/step:opacity-100 transition-opacity p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-3 pt-2">
                          <Circle className="w-5 h-5 text-slate-700 shrink-0" />
                          <input
                            type="text"
                            placeholder="Add new step..."
                            className="bg-transparent border-none text-sm text-white placeholder-slate-600 focus:outline-none flex-1 py-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
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
              );
            })}
          </div>
        </div>
        
        {/* Notes Section at the Bottom */}
        <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-slate-800/50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-3 text-indigo-400" />
              Notes
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <textarea 
                  placeholder="Add a new note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none min-h-[80px]"
                />
                <button 
                  onClick={handleAddNote}
                  disabled={isSavingNote || !newNote.trim()}
                  className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20 px-5 py-2.5 rounded-xl font-medium text-sm self-start transition-colors disabled:opacity-50"
                >
                  {isSavingNote ? "Saving..." : "Add Note"}
                </button>
              </div>
              
              {notes.length === 0 ? (
                <p className="text-slate-500 italic text-sm pt-4">No notes yet for this gig.</p>
              ) : (
                <div className="space-y-3 pt-4">
                  {notes.map((note, idx) => (
                    <div key={note.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group">
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                      <h4 className="font-semibold text-indigo-400/80 mb-1 text-xs uppercase tracking-wider">Note #{notes.length - idx}</h4>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {filteredAchievedGoals.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-800/50">
          <h2 className="text-xl font-bold flex items-center text-slate-400 mb-6 px-2">
            <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500/50" /> Completed Milestones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredAchievedGoals.map((goal, i) => {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={goal.id}
                  className={`relative overflow-hidden bg-slate-900 border ${goal.border} rounded-xl p-5 flex flex-col justify-between`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${goal.quarterColor}`} />
                  
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className={`font-semibold ${goal.text} line-clamp-2 pr-4`}>{goal.title}</h4>
                      <CheckCircle2 className={`w-5 h-5 ${goal.text} opacity-80 shrink-0 mt-0.5`} />
                    </div>
                    
                    {goal.deadline && (
                      <p className="text-xs text-slate-500 mb-4">
                        Achieved by: {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                    <span className="text-xs font-medium text-emerald-500/80 bg-emerald-500/10 px-2 py-1 rounded">100% Completed</span>
                    <button
                      onClick={() => updateGoal(goal.id, { status: "active" })}
                      className="text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 px-2 py-1 rounded transition-colors"
                    >
                      Undo
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {noteToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl max-w-sm w-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Note</h3>
                <p className="text-slate-400 text-sm mb-8">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setNoteToDelete(null)}
                    disabled={isDeletingNote}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteNote}
                    disabled={isDeletingNote}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 disabled:opacity-70 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    {isDeletingNote ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goalToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl max-w-sm w-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Milestone</h3>
                <p className="text-slate-400 text-sm mb-8">
                  Are you sure you want to delete this milestone? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => setGoalToDelete(null)}
                    disabled={isDeletingGoal}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteGoal}
                    disabled={isDeletingGoal}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 disabled:opacity-70 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    {isDeletingGoal ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
