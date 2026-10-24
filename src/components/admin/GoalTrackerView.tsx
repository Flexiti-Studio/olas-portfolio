"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Calendar,
  Clock,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
  X,
  Check,
  ListTodo,
  StickyNote,
  Flag,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { toast } from "sonner";

export interface TimelineStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  status: "active" | "achieved" | "abandoned" | string;
  deadline: string | null;
  targetAmount?: number | string | null;
  currentAmount?: number | string | null;
  timeline?: TimelineStep[] | string | null;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalNote {
  id: string;
  text: string;
  createdAt: number;
}

// Quarter color palette matching authentic design
const quarterToColor = (q: string) => {
  switch (q) {
    case "1":
      return "bg-indigo-500";
    case "2":
      return "bg-emerald-500";
    case "3":
      return "bg-yellow-500";
    case "4":
      return "bg-rose-500";
    default:
      return "bg-slate-600";
  }
};

export default function GoalTrackerView() {
  // Goals State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "achieved">("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("All Goals");

  // Collapsible Subgoals: Record of goalId -> boolean.
  // CRITICAL REQUIREMENT: SUBGOALS ARE HIDDEN BY DEFAULT (expandedGoals[id] === true only when explicitly opened)
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  // Subgoal Editing & Loading States
  const [editingStep, setEditingStep] = useState<{ goalId: string; stepId: string } | null>(null);
  const [editingStepText, setEditingStepText] = useState("");
  const [stepLoadingId, setStepLoadingId] = useState<string | null>(null);
  const [addingStepGoalId, setAddingStepGoalId] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newSteps, setNewSteps] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<GoalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Inline step adders state: { [goalId]: text }
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});

  // 1. Fetch Goals
  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/goals?t=${Date.now()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setGoals(json.data);
      }
    } catch (e) {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Goal Notes
  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/settings?key=goal_notes");
      const json = await res.json();
      if (json.value && Array.isArray(json.value)) {
        setNotes(json.value);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchGoals();
    fetchNotes();
  }, []);

  // Helper: Parse timeline array safely
  const parseTimeline = (timeline: unknown): TimelineStep[] => {
    if (!timeline) return [];
    if (Array.isArray(timeline)) return timeline;
    if (typeof timeline === "string") {
      try {
        const parsed = JSON.parse(timeline);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper: Compute period & quarter
  const getQuarterPeriod = (deadlineStr: string | null) => {
    if (!deadlineStr) return { period: "No Date", quarter: "0", quarterColor: "bg-slate-700" };
    try {
      const date = new Date(deadlineStr);
      if (isNaN(date.getTime())) return { period: "No Date", quarter: "0", quarterColor: "bg-slate-700" };
      const month = date.getMonth() + 1;
      const quarter = Math.ceil(month / 3).toString();
      const year = date.getFullYear();
      return {
        period: `${year} Q${quarter}`,
        quarter,
        quarterColor: quarterToColor(quarter),
      };
    } catch {
      return { period: "No Date", quarter: "0", quarterColor: "bg-slate-700" };
    }
  };

  // Derived Goals with stats
  const goalsWithDerived = useMemo(() => {
    return goals.map((g) => {
      const steps = parseTimeline(g.timeline);
      const totalSteps = steps.length;
      const completedSteps = steps.filter((s) => s.completed).length;
      const isAchieved = g.status === "achieved";
      const progress = isAchieved
        ? 100
        : totalSteps > 0
        ? Math.round((completedSteps / totalSteps) * 100)
        : 0;

      const { period, quarter, quarterColor } = getQuarterPeriod(g.deadline);

      let daysRemaining: number | null = null;
      let isOverdue = false;
      if (g.deadline) {
        const due = new Date(g.deadline).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays;
        if (diffDays < 0 && !isAchieved) {
          isOverdue = true;
        }
      }

      return {
        ...g,
        timeline: steps,
        totalSteps,
        completedSteps,
        progress,
        isAchieved,
        isOverdue,
        daysRemaining,
        period,
        quarter,
        quarterColor,
      };
    });
  }, [goals]);

  // Chronologically Sorted Goals for Vertical Timeline (matches admin/career/[id] design)
  const timelineChronologicalGoals = useMemo(() => {
    const list = [...goalsWithDerived];
    return list.sort((a, b) => {
      // Completed goals at bottom or chronological
      if (a.isAchieved && !b.isAchieved) return 1;
      if (!a.isAchieved && b.isAchieved) return -1;

      // Both active or both achieved: sort by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }, [goalsWithDerived]);

  // Next Upcoming Goal for Timeline Info Card
  const nextTargetGoal = useMemo(() => {
    const activeWithDate = goalsWithDerived
      .filter((g) => !g.isAchieved && g.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
    return activeWithDate[0] || goalsWithDerived.find((g) => !g.isAchieved) || null;
  }, [goalsWithDerived]);

  // Filtered Goals for Main Stream
  const displayedGoals = useMemo(() => {
    return goalsWithDerived.filter((goal) => {
      // 1. Period Filter
      if (selectedPeriod === "Active Goals" && goal.isAchieved) return false;
      if (
        selectedPeriod !== "All Goals" &&
        selectedPeriod !== "Active Goals" &&
        goal.period !== selectedPeriod
      ) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter === "active" && goal.isAchieved) return false;
      if (statusFilter === "achieved" && !goal.isAchieved) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = goal.title.toLowerCase().includes(q);
        const matchesSteps = goal.timeline.some((s) => s.text.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSteps) return false;
      }

      return true;
    });
  }, [goalsWithDerived, selectedPeriod, statusFilter, searchQuery]);

  // Overall Counts
  const headerTotalCount = goalsWithDerived.length;
  const headerAchievedCount = goalsWithDerived.filter((g) => g.isAchieved).length;
  const overallPercentage =
    headerTotalCount > 0 ? Math.round((headerAchievedCount / headerTotalCount) * 100) : 0;

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------

  // Toggle Collapse of Subgoals
  const toggleSubgoals = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  // Toggle Main Goal Completion
  const handleToggleMainGoal = async (goalId: string, currentStatus: string) => {
    const isNowAchieved = currentStatus !== "achieved";
    const targetStatus = isNowAchieved ? "achieved" : "active";

    // Optimistic Update
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const timeline = parseTimeline(g.timeline);
        return {
          ...g,
          status: targetStatus,
          timeline: isNowAchieved
            ? timeline.map((step) => ({ ...step, completed: true }))
            : timeline,
        };
      })
    );

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          ...(isNowAchieved
            ? {
                timeline: parseTimeline(
                  goals.find((g) => g.id === goalId)?.timeline
                ).map((s) => ({ ...s, completed: true })),
              }
            : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      if (isNowAchieved) {
        toast.success("🎯 Goal marked as Achieved! Great job!");
      } else {
        toast.info("Goal reopened to Active");
      }
    } catch (e) {
      toast.error("Failed to update goal status");
      fetchGoals();
    }
  };

  // Toggle Timeline Sub-Step with Loading Indicator
  const handleToggleStep = async (goalId: string, stepId: string) => {
    if (stepLoadingId) return;
    setStepLoadingId(stepId);

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      setStepLoadingId(null);
      return;
    }

    const currentTimeline = parseTimeline(goal.timeline);
    const updatedTimeline = currentTimeline.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );

    const allStepsCompleted =
      updatedTimeline.length > 0 && updatedTimeline.every((s) => s.completed);

    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, timeline: updatedTimeline } : g))
    );

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      if (!res.ok) throw new Error("Failed to update step");

      if (allStepsCompleted && goal.status !== "achieved") {
        toast.success("All milestones completed! You can check off the main goal now.", {
          action: {
            label: "Check Off Goal",
            onClick: () => handleToggleMainGoal(goalId, "active"),
          },
        });
      }
    } catch (e) {
      toast.error("Failed to update step");
      fetchGoals();
    } finally {
      setStepLoadingId(null);
    }
  };

  // Add Step to Goal with Loading Indicator
  const handleAddStep = async (goalId: string) => {
    const text = stepInputs[goalId]?.trim();
    if (!text || addingStepGoalId) return;

    setAddingStepGoalId(goalId);
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      setAddingStepGoalId(null);
      return;
    }

    const currentTimeline = parseTimeline(goal.timeline);
    const newStep: TimelineStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      completed: false,
    };
    const updatedTimeline = [...currentTimeline, newStep];

    setStepInputs((prev) => ({ ...prev, [goalId]: "" }));
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, timeline: updatedTimeline } : g))
    );

    // If subgoals were hidden, expand so user sees newly added step
    setExpandedGoals((prev) => ({ ...prev, [goalId]: true }));

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      if (!res.ok) throw new Error("Failed to add step");
      toast.success("Milestone step added");
    } catch (e) {
      toast.error("Failed to add step");
      fetchGoals();
    } finally {
      setAddingStepGoalId(null);
    }
  };

  // Start Editing Step
  const handleStartEditStep = (goalId: string, step: TimelineStep) => {
    setEditingStep({ goalId, stepId: step.id });
    setEditingStepText(step.text);
  };

  // Save Edited Step with Loading Indicator
  const handleSaveEditStep = async (goalId: string, stepId: string) => {
    const trimmed = editingStepText.trim();
    if (!trimmed) {
      toast.error("Subgoal text cannot be empty");
      return;
    }

    setStepLoadingId(stepId);
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      setStepLoadingId(null);
      return;
    }

    const currentTimeline = parseTimeline(goal.timeline);
    const updatedTimeline = currentTimeline.map((s) =>
      s.id === stepId ? { ...s, text: trimmed } : s
    );

    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, timeline: updatedTimeline } : g))
    );
    setEditingStep(null);
    setEditingStepText("");

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      toast.success("Milestone step updated");
    } catch (e) {
      toast.error("Failed to update step");
      fetchGoals();
    } finally {
      setStepLoadingId(null);
    }
  };

  // Delete Step with Loading Indicator
  const handleDeleteStep = async (goalId: string, stepId: string) => {
    if (stepLoadingId) return;
    setStepLoadingId(stepId);

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      setStepLoadingId(null);
      return;
    }

    const currentTimeline = parseTimeline(goal.timeline);
    const updatedTimeline = currentTimeline.filter((s) => s.id !== stepId);

    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, timeline: updatedTimeline } : g))
    );

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      if (!res.ok) throw new Error("Failed to delete step");
      toast.success("Milestone step deleted");
    } catch (e) {
      toast.error("Failed to delete step");
      fetchGoals();
    } finally {
      setStepLoadingId(null);
    }
  };

  // Create Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    setIsSubmitting(true);
    try {
      const validSteps = newSteps
        .filter((s) => s.trim().length > 0)
        .map((text, i) => ({
          id: `step-${Date.now()}-${i}`,
          text: text.trim(),
          completed: false,
        }));

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          deadline: newDeadline || null,
          timeline: validSteps,
          status: "active",
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");

      toast.success("🎯 Goal created successfully!");
      setNewTitle("");
      setNewDeadline("");
      setNewSteps([""]);
      setIsCreateModalOpen(false);
      fetchGoals();
    } catch (e) {
      toast.error("Failed to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Goal Modal
  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDeadline(
      goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : ""
    );
  };

  // Save Edit Goal
  const handleSaveEdit = async () => {
    if (!editingGoal || !editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/goals/${editingGoal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update goal");

      toast.success("Goal updated");
      setEditingGoal(null);
      fetchGoals();
    } catch (e) {
      toast.error("Failed to update goal");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Goal
  const handleConfirmDelete = async () => {
    if (!deletingGoalId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/goals/${deletingGoalId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete goal");

      toast.success("Goal deleted");
      setGoals((prev) => prev.filter((g) => g.id !== deletingGoalId));
      setDeletingGoalId(null);
    } catch (e) {
      toast.error("Failed to delete goal");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Quick Note
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    const newNote: GoalNote = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: Date.now(),
    };
    const updated = [newNote, ...notes];

    setNotes(updated);
    setNewNoteText("");

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "goal_notes",
          value: updated,
        }),
      });
      toast.success("Note saved");
    } catch (e) {}
  };

  // Delete Quick Note
  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "goal_notes",
          value: updated,
        }),
      });
    } catch (e) {}
  };

  // Drag Reorder Goals
  const handleReorder = async (reorderedGoals: typeof displayedGoals) => {
    setGoals((prev) => {
      const otherGoals = prev.filter(
        (g) => !reorderedGoals.some((rg) => rg.id === g.id)
      );
      return [...reorderedGoals, ...otherGoals];
    });

    try {
      await fetch("/api/goals/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalIds: reorderedGoals.map((g) => g.id),
        }),
      });
    } catch (e) {}
  };

  // Smooth scroll to goal
  const scrollToGoal = (goalId: string) => {
    const element = document.getElementById(`goal-${goalId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-indigo-500/60");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-indigo-500/60");
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-[1400px] mx-auto pb-16">
      {/* ======================================================== */}
      {/* Top Banner: Authentic Strategic Header */}
      {/* ======================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-900/80 to-purple-900/60 backdrop-blur-xl -z-10" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              Strategic Goals Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Target className="text-indigo-400 w-8 h-8 shrink-0" />
              Goals & Milestones Tracker
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/70 max-w-xl leading-relaxed">
              Track targets through an authentic stages timeline, check off main goals with one tap, and manage collapsible milestone subgoals with full editing controls.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Achieved Counter Card */}
            <div className="bg-white/5 border border-white/10 px-5 py-4 rounded-2xl shadow-inner backdrop-blur-md flex flex-col justify-center">
              <div className="flex items-center space-x-2 mb-1 opacity-80">
                <Flag className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200">
                  Goals Achieved
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent flex items-baseline">
                {headerAchievedCount}{" "}
                <span className="text-lg sm:text-xl text-emerald-500/50 ml-2">
                  / {headerTotalCount}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex sm:flex-col gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Goal</span>
              </button>

              <button
                onClick={() => setIsNotesOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <StickyNote size={14} className="text-amber-400" />
                <span>Notes ({notes.length})</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2-Column Responsive Layout: Goals Stream on Left, Timeline on Right */}
      <div className="flex flex-col lg:flex-row items-start gap-6 sm:gap-8">
        {/* ======================================================== */}
        {/* LEFT COLUMN: Goals List & Controls (~65% width on Desktop) */}
        {/* ======================================================== */}
        <div className="w-full lg:flex-1 space-y-5">
          {/* Filters Bar: Search & Status Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search goals or subgoals..."
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "achieved", label: "Achieved" },
                ] as const
              ).map((tab) => {
                const isSelected = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Period Header Badge + Expand/Collapse All Subgoals */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <span>Goals Feed</span>
              <span className="text-xs text-zinc-500 font-mono">
                ({displayedGoals.length})
              </span>
            </h3>

            {displayedGoals.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const anyOpen = displayedGoals.some((g) => expandedGoals[g.id]);
                  const nextState: Record<string, boolean> = {};
                  displayedGoals.forEach((g) => {
                    nextState[g.id] = !anyOpen;
                  });
                  setExpandedGoals(nextState);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ListTodo size={14} />
                <span>
                  {displayedGoals.some((g) => expandedGoals[g.id])
                    ? "Collapse All Subgoals"
                    : "Expand All Subgoals"}
                </span>
              </button>
            )}
          </div>

          {/* Goals List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 h-32 animate-pulse"
                />
              ))}
            </div>
          ) : displayedGoals.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mx-auto text-zinc-400">
                <Target size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">No goals found</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? "No goals match your search term."
                    : "No goals match the current filters."}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Goal</span>
              </button>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={displayedGoals}
              onReorder={handleReorder}
              className="space-y-4"
            >
              {displayedGoals.map((goal, index) => {
                const isAchieved = goal.isAchieved;
                // CRITICAL REQUIREMENT: SUBGOALS HIDDEN BY DEFAULT!
                const isSubgoalsExpanded = !!expandedGoals[goal.id];

                return (
                  <Reorder.Item
                    key={goal.id}
                    id={`goal-${goal.id}`}
                    value={goal}
                    className={`relative bg-slate-900/90 border transition-all rounded-2xl overflow-hidden shadow-sm ${
                      isAchieved
                        ? "border-emerald-500/40 bg-[#0c1514]/90"
                        : goal.isOverdue
                        ? "border-rose-500/40 bg-slate-900"
                        : "border-slate-800/90 hover:border-slate-700"
                    }`}
                  >
                    {/* Quarter Color Ribbon on Right Edge */}
                    <div
                      className={`absolute top-0 right-0 bottom-0 w-2.5 rounded-tr-2xl rounded-br-2xl ${goal.quarterColor}`}
                    />

                    <div className="p-4 sm:p-6 pr-6 space-y-4">
                      {/* Top Row: Check-off Circle + Title + Badges + Action Buttons */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Main Goal Check-off Button */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleMainGoal(goal.id, goal.status)}
                            className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90 ${
                              isAchieved
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/30"
                                : "border-2 border-zinc-600 hover:border-emerald-400 text-transparent hover:text-emerald-400 bg-zinc-950"
                            }`}
                            title={
                              isAchieved
                                ? "Mark as Active (Uncheck Goal)"
                                : "Check off Goal as Achieved"
                            }
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-mono font-bold text-indigo-400">
                                #{index + 1}
                              </span>

                              {isAchieved ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Award size={11} /> Achieved
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                                  Active
                                </span>
                              )}

                              {goal.period !== "No Date" && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium font-mono">
                                  {goal.period}
                                </span>
                              )}

                              {goal.isOverdue && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1">
                                  <AlertCircle size={10} /> Overdue
                                </span>
                              )}
                            </div>

                            <h4
                              className={`text-base sm:text-lg font-bold tracking-tight break-words transition-all ${
                                isAchieved
                                  ? "text-zinc-400 line-through decoration-zinc-600"
                                  : "text-white"
                              }`}
                            >
                              {goal.title}
                            </h4>

                            {goal.deadline && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                                <Calendar size={12} className="text-zinc-400" />
                                <span>
                                  Due:{" "}
                                  {new Date(goal.deadline).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                {goal.daysRemaining !== null && !isAchieved && (
                                  <span
                                    className={`text-[11px] font-medium ml-1 ${
                                      goal.daysRemaining <= 7
                                        ? "text-rose-400 font-bold"
                                        : goal.daysRemaining <= 30
                                        ? "text-amber-400"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    ({goal.daysRemaining}d left)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Buttons (Edit & Delete) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(goal)}
                            className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit Goal"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingGoalId(goal.id)}
                            className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Goal"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-400">
                            Progress ({goal.completedSteps}/{goal.totalSteps} steps)
                          </span>
                          <span
                            className={`font-mono text-xs ${
                              isAchieved ? "text-emerald-400 font-bold" : "text-zinc-300"
                            }`}
                          >
                            {goal.progress}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isAchieved
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-indigo-500 to-purple-500"
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Collapsible Subgoals Header & Toggle (HIDDEN BY DEFAULT) */}
                      <div className="pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => toggleSubgoals(goal.id)}
                          className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800/80 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <ListTodo size={14} className="text-indigo-400" />
                            <span>
                              Subgoals ({goal.completedSteps}/{goal.totalSteps})
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                            <span>{isSubgoalsExpanded ? "Hide Subgoals" : "View Subgoals"}</span>
                            {isSubgoalsExpanded ? (
                              <ChevronUp size={14} className="text-indigo-400" />
                            ) : (
                              <ChevronDown size={14} className="text-zinc-400" />
                            )}
                          </span>
                        </button>

                        {/* Collapsible Subgoal Checklist Container */}
                        <AnimatePresence initial={false}>
                          {isSubgoalsExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden pt-3 pl-2 sm:pl-4 space-y-2.5"
                            >
                              {goal.timeline.length > 0 ? (
                                <div className="relative space-y-2 pl-4 border-l-2 border-slate-800">
                                  {goal.timeline.map((step) => {
                                    const isThisStepLoading = stepLoadingId === step.id;
                                    const isThisStepEditing =
                                      editingStep?.goalId === goal.id &&
                                      editingStep?.stepId === step.id;

                                    return (
                                      <div
                                        key={step.id}
                                        className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800/40 transition-colors group/step"
                                      >
                                        {/* Checkbox with Loading Spinner */}
                                        <button
                                          type="button"
                                          disabled={isThisStepLoading}
                                          onClick={() => handleToggleStep(goal.id, step.id)}
                                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                            step.completed
                                              ? "bg-emerald-500 text-white"
                                              : "border border-zinc-600 hover:border-indigo-400 bg-zinc-950 text-transparent"
                                          }`}
                                          title={step.completed ? "Mark Incomplete" : "Mark Complete"}
                                        >
                                          {isThisStepLoading ? (
                                            <Loader2 size={12} className="animate-spin text-white" />
                                          ) : step.completed ? (
                                            <Check size={12} strokeWidth={3} />
                                          ) : null}
                                        </button>

                                        {/* Step Content: View vs Edit Mode */}
                                        {isThisStepEditing ? (
                                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                            <input
                                              type="text"
                                              value={editingStepText}
                                              onChange={(e) => setEditingStepText(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleSaveEditStep(goal.id, step.id);
                                                } else if (e.key === "Escape") {
                                                  setEditingStep(null);
                                                }
                                              }}
                                              autoFocus
                                              className="flex-1 bg-zinc-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                                            />
                                            <button
                                              type="button"
                                              disabled={isThisStepLoading}
                                              onClick={() => handleSaveEditStep(goal.id, step.id)}
                                              className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                                              title="Save (Enter)"
                                            >
                                              {isThisStepLoading ? (
                                                <Loader2 size={12} className="animate-spin" />
                                              ) : (
                                                <Check size={12} strokeWidth={3} />
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingStep(null)}
                                              className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                              title="Cancel (Esc)"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <span
                                              className={`text-xs flex-1 break-words transition-colors leading-relaxed ${
                                                step.completed
                                                  ? "text-zinc-500 line-through"
                                                  : "text-zinc-200"
                                              }`}
                                            >
                                              {step.text}
                                            </span>

                                            {/* Subgoal Edit & Delete Buttons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleStartEditStep(goal.id, step)}
                                                className="p-1 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                                                title="Edit Subgoal"
                                              >
                                                <Edit2 size={13} />
                                              </button>

                                              <button
                                                type="button"
                                                disabled={isThisStepLoading}
                                                onClick={() => handleDeleteStep(goal.id, step.id)}
                                                className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                title="Delete Subgoal"
                                              >
                                                {isThisStepLoading ? (
                                                  <Loader2 size={13} className="animate-spin text-rose-400" />
                                                ) : (
                                                  <Trash2 size={13} />
                                                )}
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-zinc-500 italic pl-2">
                                  No subgoals added yet.
                                </p>
                              )}

                              {/* Add New Subgoal Step Input with Loading Indicator */}
                              <div className="flex items-center gap-2 pt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ml-1" />
                                <input
                                  type="text"
                                  value={stepInputs[goal.id] || ""}
                                  onChange={(e) =>
                                    setStepInputs((prev) => ({
                                      ...prev,
                                      [goal.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddStep(goal.id);
                                    }
                                  }}
                                  placeholder="Add subgoal step (Enter or tap +)..."
                                  className="flex-1 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 px-3 py-1.5 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                                />
                                <button
                                  type="button"
                                  disabled={addingStepGoalId === goal.id}
                                  onClick={() => handleAddStep(goal.id)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Add Subgoal"
                                >
                                  {addingStepGoalId === goal.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                  <span className="hidden sm:inline">Add</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Authentic Timeline (Matches admin/career/[id]) */}
        {/* ======================================================== */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          {/* 1. Timeline Info Card (Identical layout to career/[id]) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Timeline Info
            </h3>

            <div className="flex items-start gap-3 mb-4">
              <div className="mt-0.5 p-2 bg-zinc-800 rounded-lg text-indigo-400 shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 font-medium mb-0.5">
                  Next Target Date
                </p>
                <p className="text-white font-medium text-sm truncate">
                  {nextTargetGoal?.deadline && !isNaN(new Date(nextTargetGoal.deadline).getTime())
                    ? new Date(nextTargetGoal.deadline).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No pending deadline"}
                </p>
                {nextTargetGoal && (
                  <p className="text-[11px] text-indigo-400 font-medium mt-0.5 truncate">
                    ↳ {nextTargetGoal.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-zinc-800 rounded-lg text-emerald-400 shrink-0">
                <Target size={16} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-medium mb-0.5">Overall Status</p>
                <p className="text-white font-medium text-sm">
                  {headerAchievedCount} of {headerTotalCount} Achieved ({overallPercentage}%)
                </p>
              </div>
            </div>
          </div>

          {/* 2. Vertical Stages Timeline (Identical architecture to career/[id]) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm relative group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" /> Goals Timeline
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                {timelineChronologicalGoals.length} targets
              </span>
            </div>

            {/* Timeline Rail & Nodes */}
            <div className="relative border-l-2 border-zinc-800 ml-3 space-y-8 pb-4">
              {timelineChronologicalGoals.map((g, i) => {
                const isCompleted = g.isAchieved;
                const isCurrent = !g.isAchieved && (i === 0 || !timelineChronologicalGoals[i - 1]?.isAchieved);

                const formattedDate = g.deadline
                  ? new Date(g.deadline).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : g.period !== "No Date"
                  ? g.period
                  : "Flexible Deadline";

                return (
                  <div
                    key={g.id}
                    onClick={() => scrollToGoal(g.id)}
                    className="relative pl-6 cursor-pointer group/node"
                  >
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-zinc-900 transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isCurrent
                          ? "bg-blue-500 ring-2 ring-blue-500/30 scale-110"
                          : "bg-zinc-600 group-hover/node:bg-zinc-500"
                      }`}
                    />

                    {/* Green connecting line between completed goals */}
                    {isCompleted &&
                      i < timelineChronologicalGoals.length - 1 &&
                      timelineChronologicalGoals[i + 1]?.isAchieved && (
                        <div className="absolute -left-[2px] top-5 w-[2px] h-[calc(100%+16px)] bg-emerald-500" />
                      )}

                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 mb-0.5">
                        {formattedDate}
                      </span>
                      <h4
                        className={`text-sm sm:text-base font-semibold transition-colors ${
                          isCompleted
                            ? "text-zinc-200 line-through decoration-zinc-600"
                            : isCurrent
                            ? "text-blue-400 font-bold"
                            : "text-zinc-400 group-hover/node:text-zinc-200"
                        }`}
                      >
                        {g.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 leading-snug">
                        {g.totalSteps > 0
                          ? `${g.completedSteps} of ${g.totalSteps} subgoals completed (${g.progress}%)`
                          : isCompleted
                          ? "Goal marked achieved"
                          : "No milestone subgoals set"}
                      </p>
                    </div>
                  </div>
                );
              })}

              {timelineChronologicalGoals.length === 0 && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-zinc-900 bg-zinc-600" />
                  <p className="text-zinc-500 italic text-sm">No goals in timeline.</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Strategy Scratchpad Card (Under Timeline) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <StickyNote size={14} className="text-amber-400" />
                <span>Quick Notes ({notes.length})</span>
              </h4>
              <button
                onClick={() => setIsNotesOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder="Quick note (press Enter)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
              />

              {notes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 flex items-start justify-between gap-2"
                >
                  <p className="line-clamp-2 text-[11px]">{note.text}</p>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-zinc-600 hover:text-rose-400 shrink-0 p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Create Goal Modal */}
      {/* ---------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add New Goal</h3>
                  <p className="text-xs text-slate-400">
                    Set a target date and initial milestone subgoals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master React 19 & Next.js App Router"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Deadline Date
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Milestone Subgoals Checklist
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewSteps((prev) => [...prev, ""])}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Step
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono w-4">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const updated = [...newSteps];
                          updated[idx] = e.target.value;
                          setNewSteps(updated);
                        }}
                        placeholder={`Subgoal milestone #${idx + 1}...`}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                      {newSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewSteps((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Goal</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Edit Goal Modal */}
      {/* ---------------------------------------------------- */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-400" /> Edit Goal
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Delete Goal Modal */}
      {/* ---------------------------------------------------- */}
      {deletingGoalId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Delete Goal?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete this goal and all of its milestone steps? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGoalId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Scratchpad Quick Notes Modal */}
      {/* ---------------------------------------------------- */}
      {isNotesOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <StickyNote size={18} className="text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  Strategy Scratchpad & Quick Notes
                </h3>
              </div>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder="Type a strategic thought and press Enter..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleAddNote}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 italic">
                  No quick notes saved yet.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-200 flex items-start justify-between gap-3 group/note"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="break-words leading-relaxed">{note.text}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
