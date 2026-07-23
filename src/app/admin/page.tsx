"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  MessageSquare, 
  DollarSign, 
  Bell,
  LogOut,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Briefcase,
  Target,
  Building,
  X,
  Users,
  Zap,
  Compass,
  Activity,
  Award,
  TrendingUp,
  Coins,
  ArrowUpRight,
  Clock,
  Sparkles,
  Loader2,
  GraduationCap,
  Download
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import CvTailor from "@/components/admin/CvTailor";
import JobWebsites from "@/components/admin/JobWebsites";
import ApplicationTracker from "@/components/admin/ApplicationTracker";
import CoverLetterGenerator from "@/components/admin/CoverLetterGenerator";
import CompanyResearch from "@/components/admin/CompanyResearch";
import InterviewPrepList from "@/app/admin/interview-prep/page";
import BudgetStrategy from "@/app/admin/budget-strategy/page";
import FocusMode from "@/app/admin/focus/page";
import KnowledgeHub from "@/app/admin/knowledge/page";
import CreatorsManagerPage from "@/app/admin/creators/page";
import CareerPage from "@/app/admin/career/page";
import BankAccounts from "@/components/admin/BankAccounts";
import SocialTemplates from "@/components/admin/SocialTemplates";
import { Brain, Focus, PiggyBank, Landmark } from "lucide-react";
import SpeedApplier from "@/components/task/SpeedApplier";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Main statistics" },
  { id: "widget-updates", label: "Widget Updates", icon: Download, desc: "Desktop auto-updater" },
  { id: "speed-dashboard", label: "Speed Apply", icon: Zap, desc: "Personal Auto Applier" },
  { id: "career", label: "Career", icon: Compass, desc: "Career goals & profile" },
  { id: "job-tracker", label: "Application Tracker", icon: Briefcase, desc: "Kanban pipeline" },
  { id: "job-websites", label: "Job Websites", icon: Building, desc: "Saved career pages" },
  { id: "company-research", label: "Company Research", icon: Search, desc: "Deep dive companies" },
  { id: "interview-prep", label: "Interview Prep", icon: MessageSquare, desc: "Notes & questions" },
  { id: "salary-benchmarker", label: "Salary Benchmarker", icon: DollarSign, desc: "Compare offers" },
  { id: "budget-strategy", label: "Budget Strategy", icon: PiggyBank, desc: "50/30/20 Budgeting" },
  { id: "bank-accounts", label: "Goals Tracker", icon: Target, desc: "Track progress and timelines" },
  { id: "focus-mode", label: "Focus Mode", icon: Focus, desc: "Single-project tracking" },
  { id: "knowledge-hub", label: "Knowledge Hub", icon: Brain, desc: "Ideas and facts" },
  { id: "creators-manager", label: "Creators Manager", icon: Users, desc: "Manage Creators" },
  { id: "social-templates", label: "Social Templates", icon: Sparkles, desc: "Outlines & frameworks" },
  { id: "follow-up", label: "Follow-up Reminders", icon: Bell, desc: "Don't miss a beat" },
  { id: "cv-tailor", label: "CV Tailor", icon: FileText, desc: "Manage CV templates" },
  { id: "cover-letters", label: "Cover Letters", icon: Target, desc: "AI Cover Letter Gen" },
];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(SIDEBAR_ITEMS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [knowledgeIndex, setKnowledgeIndex] = useState(0);
  const [currentGoal, setCurrentGoal] = useState<any>(null);

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    if (isAuthenticated) {
      setStatsLoading(true);
      fetch("/api/admin-stats")
        .then(res => res.json())
        .then(data => {
          if (data.knowledge) {
            data.knowledge = shuffleArray(data.knowledge);
          }
          setStats(data);
          setStatsLoading(false);
        })
        .catch(() => setStatsLoading(false));

      fetch("/api/goals")
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data?.length > 0) {
            const active = json.data.find((g: any) => g.status === "active") || json.data[0];
            setCurrentGoal(active);
          }
        })
        .catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!stats?.knowledge || stats.knowledge.length <= 1) return;
    const interval = setInterval(() => {
      setKnowledgeIndex((prev) => (prev + 1) % stats.knowledge.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [stats?.knowledge]);

  const toggleTask = async (taskId: string, isDone: boolean) => {
    try {
      const res = await fetch(`/api/focus/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: isDone })
      });
      if (res.ok) {
        setStats((prev: any) => {
          if (!prev || !prev.recentProject) return prev;
          const updatedTasks = prev.recentProject.tasks.map((t: any) => 
            t.id === taskId ? { ...t, done: isDone } : t
          );
          return {
            ...prev,
            recentProject: {
              ...prev.recentProject,
              tasks: updatedTasks
            }
          };
        });
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === "0806") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect code. Please try again.");
      setCode("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl max-w-md w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-zinc-400">Enter the passcode to view the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter passcode"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-500 transition-colors"
                autoFocus
              />
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderActiveComponent = () => {
    const activeItem = SIDEBAR_ITEMS.find(item => item.id === activeTab);
    
    if (activeTab === "overview") {
      const appStagesData = stats ? [
        { name: "Wishlist", count: stats.applications?.stages?.Wishlist || 0, fill: "#71717a" },
        { name: "Applied", count: stats.applications?.stages?.Applied || 0, fill: "#6366f1" },
        { name: "Interviewing", count: stats.applications?.stages?.Interviewing || 0, fill: "#f59e0b" },
        { name: "Offer", count: stats.applications?.stages?.Offer || 0, fill: "#10b981" },
        { name: "Rejected", count: stats.applications?.stages?.Rejected || 0, fill: "#ef4444" },
      ] : [];

      return (
        <motion.div 
          key="overview"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col space-y-8"
        >
          <div className="mb-4 border-b border-zinc-800 pb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Overview</h1>
              <p className="text-zinc-400 mt-2">Real-time statistics across all Career Hub modules</p>
            </div>
            {statsLoading && <Loader2 className="animate-spin text-indigo-400" size={24} />}
          </div>

          {statsLoading ? (
            <div className="space-y-8 animate-pulse">
              {/* Stats counters skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl h-28 flex flex-col justify-between">
                    <div className="h-3 bg-zinc-850 rounded w-2/3" />
                    <div className="h-6 bg-zinc-850 rounded w-1/3" />
                    <div className="h-2 bg-zinc-850 rounded w-1/2" />
                  </div>
                ))}
              </div>

              {/* Stored Knowledge & Focus Project Task Board skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl h-[320px] flex flex-col justify-between">
                    <div className="h-4 bg-zinc-850 rounded w-1/4 mb-4" />
                    <div className="bg-zinc-950/45 p-4 rounded-xl space-y-3 flex-1">
                      <div className="h-3 bg-zinc-850 rounded w-12" />
                      <div className="h-4 bg-zinc-850 rounded w-3/4" />
                      <div className="h-2 bg-zinc-850 rounded w-1/2" />
                    </div>
                    <div className="h-3 bg-zinc-850 rounded w-full mt-4" />
                  </div>
                ))}
              </div>

              {/* Side-by-side Pipeline status & Recent Activities skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl h-72 flex flex-col justify-between">
                  <div className="h-4 bg-zinc-850 rounded w-1/3" />
                  <div className="space-y-3 flex-1 justify-center flex flex-col">
                    <div className="h-8 bg-zinc-850 rounded w-full" />
                    <div className="h-8 bg-zinc-850 rounded w-5/6" />
                    <div className="h-8 bg-zinc-850 rounded w-4/5" />
                  </div>
                </div>
                <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl h-72 flex flex-col justify-between">
                  <div className="h-4 bg-zinc-850 rounded w-1/4 mb-4" />
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-zinc-850 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-zinc-850 rounded w-3/4" />
                          <div className="h-2 bg-zinc-850 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Line Charts Trends section skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl h-72 flex flex-col justify-between">
                    <div className="h-4 bg-zinc-850 rounded w-1/3" />
                    <div className="h-44 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-end p-4 justify-between">
                      <div className="h-12 bg-zinc-850 rounded w-8" />
                      <div className="h-20 bg-zinc-850 rounded w-8" />
                      <div className="h-28 bg-zinc-850 rounded w-8" />
                      <div className="h-24 bg-zinc-850 rounded w-8" />
                      <div className="h-16 bg-zinc-850 rounded w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Stats counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between shadow-lg relative group overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-2 bg-indigo-500 rounded-r-2xl" />
                  <div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Job Applications</h3>
                    <p className="text-3xl font-black mt-2 text-white">{stats.applications?.total || 0}</p>
                    <button onClick={() => setActiveTab("job-tracker")} className="text-indigo-400 text-xs font-semibold mt-3 hover:text-indigo-300 flex items-center gap-1">
                      Manage tracker <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-indigo-400">
                    <Briefcase size={22} />
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between shadow-lg relative group overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-2 bg-amber-500 rounded-r-2xl" />
                  <div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Interview Courses</h3>
                    <p className="text-3xl font-black mt-2 text-white">{stats.courses?.total || 0}</p>
                    <button onClick={() => setActiveTab("interview-prep")} className="text-amber-400 text-xs font-semibold mt-3 hover:text-amber-300 flex items-center gap-1">
                      Study syllabus <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-400">
                    <GraduationCap size={22} />
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between shadow-lg relative group overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-2 bg-emerald-500 rounded-r-2xl" />
                  <div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Net Savings</h3>
                    <p className="text-3xl font-black mt-2 text-white">
                      {stats.budget?.totalBalance ? '₦' + Number(stats.budget.totalBalance).toLocaleString() : '₦0'}
                    </p>
                    <button onClick={() => setActiveTab("budget-strategy")} className="text-emerald-400 text-xs font-semibold mt-3 hover:text-emerald-300 flex items-center gap-1">
                      Manage strategy <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400">
                    <Coins size={22} />
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between shadow-lg relative group overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-2 bg-fuchsia-500 rounded-r-2xl" />
                  <div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Tailored CVs</h3>
                    <p className="text-3xl font-black mt-2 text-white">{stats.cvs?.total || 0}</p>
                    <button onClick={() => setActiveTab("cv-tailor")} className="text-fuchsia-400 text-xs font-semibold mt-3 hover:text-fuchsia-300 flex items-center gap-1">
                      CV templates <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-fuchsia-400">
                    <FileText size={22} />
                  </div>
                </div>
              </div>

              {/* Stored Knowledge Slider & Recent Project Task Board */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Stored Knowledge Slider Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between relative group overflow-hidden h-[320px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                        <Brain size={16} className="text-indigo-400" /> Stored Knowledge & Ideas
                      </h3>
                      {stats.knowledge?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setKnowledgeIndex(prev => prev === 0 ? stats.knowledge.length - 1 : prev - 1)}
                            className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:text-white transition-colors"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs text-zinc-500 font-semibold select-none">
                            {knowledgeIndex + 1} / {stats.knowledge.length}
                          </span>
                          <button 
                            onClick={() => setKnowledgeIndex(prev => prev === stats.knowledge.length - 1 ? 0 : prev + 1)}
                            className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:text-white transition-colors"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {stats.knowledge?.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-xl h-[160px] flex flex-col justify-between leading-relaxed overflow-y-auto">
                          <div>
                            <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-full uppercase tracking-wider mb-3 inline-block">
                              {stats.knowledge[knowledgeIndex].type}
                            </span>
                            <p className="text-zinc-200 text-sm font-medium">
                              {stats.knowledge[knowledgeIndex].content}
                            </p>
                          </div>
                          
                          {stats.knowledge[knowledgeIndex].tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {stats.knowledge[knowledgeIndex].tags.map((tag: string, i: number) => (
                                <span key={i} className="text-[10px] text-zinc-550 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[160px] bg-zinc-950/50 rounded-xl border border-zinc-850">
                        <Brain size={24} className="text-zinc-700 mb-2" />
                        <p className="text-xs text-zinc-500 italic">No stored knowledge items found.</p>
                      </div>
                    )}
                  </div>

                  {stats.knowledge?.length > 0 && (
                    <div className="pt-4 border-t border-zinc-850 mt-4 flex justify-between items-center text-xs text-zinc-500 shrink-0">
                      <span>Source: <span className="font-semibold text-zinc-400 capitalize">{stats.knowledge[knowledgeIndex].source}</span></span>
                      <span>{new Date(stats.knowledge[knowledgeIndex].createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* 2. Recent Project Task Board Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between relative group overflow-hidden h-[320px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                      <LayoutDashboard size={16} className="text-amber-400" /> Focus Tracker: Most Recent Project
                    </h3>

                    {stats.recentProject ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
                            {stats.recentProject.status}
                          </span>
                          <h4 className="text-white font-bold text-base truncate">{stats.recentProject.name}</h4>
                          {stats.recentProject.description && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{stats.recentProject.description}</p>
                          )}
                        </div>

                        <div className="space-y-2 h-[80px] overflow-y-auto pr-2">
                          {stats.recentProject.tasks?.length > 0 ? (
                            stats.recentProject.tasks.map((task: any) => (
                              <div key={task.id} className="flex items-center gap-3 py-2 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850/50 rounded-lg group/task">
                                <input 
                                  type="checkbox" 
                                  checked={task.done}
                                  onChange={(e) => toggleTask(task.id, e.target.checked)}
                                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                />
                                <span className={`text-xs font-semibold select-none cursor-pointer flex-1 transition-all ${
                                  task.done ? 'line-through text-zinc-500' : 'text-zinc-200'
                                }`} onClick={() => toggleTask(task.id, !task.done)}>
                                  {task.title}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-550 italic py-2">No tasks added to this project yet.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[160px] bg-zinc-950/50 rounded-xl border border-zinc-850">
                        <LayoutDashboard size={24} className="text-zinc-750 mb-2" />
                        <p className="text-xs text-zinc-500 italic">No projects found. Visit Focus Mode to create one.</p>
                      </div>
                    )}
                  </div>

                  {stats.recentProject && (
                    <div className="pt-4 border-t border-zinc-850 mt-4 flex justify-between items-center text-xs text-zinc-500 shrink-0">
                      <span>Tasks Status: <span className="font-semibold text-zinc-400">
                        {stats.recentProject.tasks?.filter((t: any) => t.done).length || 0} / {stats.recentProject.tasks?.length || 0} Done
                      </span></span>
                      <span>Created {new Date(stats.recentProject.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* 3. Goals Tracker Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between relative group overflow-hidden h-[320px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                      <Target size={16} className="text-emerald-400 animate-pulse" /> Goals Tracker: Current Goal
                    </h3>

                    {currentGoal ? (() => {
                      const target = currentGoal.targetAmount ? Number(currentGoal.targetAmount) : 0;
                      const current = currentGoal.currentAmount ? Number(currentGoal.currentAmount) : 0;
                      const hasAmounts = target > 0;
                      const percent = hasAmounts ? Math.min(100, Math.round((current / target) * 100)) : 0;

                      let timelineItems: any[] = [];
                      try {
                        timelineItems = typeof currentGoal.timeline === 'string' 
                          ? JSON.parse(currentGoal.timeline) 
                          : (currentGoal.timeline || []);
                      } catch (e) {
                        timelineItems = [];
                      }
                      
                      const totalTimeline = timelineItems.length;
                      const completedTimeline = timelineItems.filter((item: any) => item.completed).length;
                      const timelinePercent = totalTimeline > 0 ? Math.round((completedTimeline / totalTimeline) * 100) : 0;

                      return (
                        <div className="space-y-4">
                          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded uppercase tracking-wider mb-2 inline-block">
                              {currentGoal.status}
                            </span>
                            <h4 className="text-white font-bold text-base truncate">{currentGoal.title}</h4>
                            
                            {hasAmounts ? (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                  <span>Progress</span>
                                  <span>₦{current.toLocaleString()} / ₦{target.toLocaleString()} ({percent}%)</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-800">
                                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            ) : totalTimeline > 0 ? (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                  <span>Tasks ({completedTimeline}/{totalTimeline})</span>
                                  <span>{timelinePercent}%</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-805">
                                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${timelinePercent}%` }} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-500 italic mt-2">No progress metrics or checklist defined.</p>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="flex flex-col items-center justify-center h-[160px] bg-zinc-950/50 rounded-xl border border-zinc-850">
                        <Target size={24} className="text-zinc-700 mb-2 animate-bounce" />
                        <p className="text-xs text-zinc-500 italic">No active goals found.</p>
                      </div>
                    )}
                  </div>

                  {currentGoal && (
                    <div className="pt-4 border-t border-zinc-850 mt-4 flex justify-between items-center text-xs text-zinc-500 shrink-0">
                      <span>
                        {currentGoal.deadline ? `Deadline: ${new Date(currentGoal.deadline).toLocaleDateString()}` : "No deadline"}
                      </span>
                      <button 
                        onClick={() => setActiveTab("bank-accounts")} 
                        className="text-emerald-450 hover:text-emerald-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        Details <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Side-by-side Pipeline status & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Application stage pipeline */}
                <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between shadow-lg">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                      <TrendingUp size={16} className="text-indigo-400" /> Application Stages Pipeline
                    </h3>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={appStagesData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                        <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                          {appStagesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent activity timeline feed */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between shadow-lg">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                      <Clock size={16} className="text-indigo-400" /> Recent Hub Activity
                    </h3>
                    <div className="space-y-4">
                      {stats.timeline?.length > 0 ? (
                        stats.timeline.map((act: any) => (
                          <div key={act.id} className="flex gap-3 text-sm">
                            <div className="mt-1 flex-shrink-0">
                              {act.type === "application" ? (
                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                  <Briefcase size={12} />
                                </div>
                              ) : act.type === "course" ? (
                                <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                  <GraduationCap size={12} />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                                  <FileText size={12} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-zinc-200 text-xs truncate leading-snug">{act.title}</p>
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{act.subtitle}</p>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-medium shrink-0 pt-0.5">
                              {new Date(act.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-500 italic py-4">No recent activities found.</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-zinc-800/60 mt-4 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1">
                      <Sparkles size={11} className="text-indigo-400" /> Active Sync Complete
                    </span>
                  </div>
                </div>

              </div>

              {/* Line Charts Trends section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* General Job Hunt Application Velocity over time */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                    <Activity size={16} className="text-indigo-400" /> Job Application Velocity (Last 12 Active Dates)
                  </h3>
                  <div className="h-56 w-full">
                    {stats.applications?.history?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.applications.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                          />
                          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} name="Applications" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500 text-xs italic">
                        Not enough application history to display.
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto Apply link submissions over time */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-6">
                    <Zap size={16} className="text-amber-400" /> Auto-Apply Link Submissions (Speed Apply)
                  </h3>
                  <div className="h-56 w-full">
                    {stats.speedApps?.history?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.speedApps.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                          />
                          <Line type="monotone" dataKey="applied" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} name="Links Submitted" />
                          <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} activeDot={{ r: 5 }} dot={{ r: 3 }} name="Sessions Run" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500 text-xs italic">
                        Not enough auto-apply data history to display.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-zinc-500 text-sm">Failed to connect to the statistics provider.</p>
            </div>
          )}
        </motion.div>
      );
    }

    if (activeTab === "widget-updates") {
      return (
        <motion.div 
          key="widget-updates"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col space-y-6"
        >
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Download className="text-blue-400" size={22} /> Desktop Widget Auto-Updater
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Manage desktop software releases, update manifests, notes, and MSI/EXE download URLs.
              </p>
            </div>
            <Link
              href="/admin/widget-updates"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 self-start sm:self-auto"
            >
              <span>Manage Releases Dashboard</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </motion.div>
      );
    }

    if (activeTab === "cv-tailor") {
      return (
        <motion.div 
          key="cv-tailor"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <CvTailor />
        </motion.div>
      );
    }
    
    if (activeTab === "job-websites") {
      return (
        <motion.div 
          key="job-websites"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <JobWebsites />
        </motion.div>
      );
    }

    if (activeTab === "job-tracker") {
      return (
        <motion.div 
          key="job-tracker"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <ApplicationTracker />
        </motion.div>
      );
    }

    if (activeTab === "cover-letters") {
      return (
        <motion.div 
          key="cover-letters"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <CoverLetterGenerator />
        </motion.div>
      );
    }

    if (activeTab === "company-research") {
      return (
        <motion.div
          key="company-research"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <CompanyResearch />
        </motion.div>
      );
    }

    if (activeTab === "interview-prep") {
      return (
        <motion.div
          key="interview-prep"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <InterviewPrepList />
        </motion.div>
      );
    }

    if (activeTab === "budget-strategy") {
      return (
        <motion.div
          key="budget-strategy"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <BudgetStrategy searchParams={{}} />
        </motion.div>
      );
    }

    if (activeTab === "bank-accounts") {
      return (
        <motion.div
          key="bank-accounts"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <BankAccounts />
        </motion.div>
      );
    }

    if (activeTab === "focus-mode") {
      return (
        <motion.div
          key="focus-mode"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <FocusMode />
        </motion.div>
      );
    }

    if (activeTab === "knowledge-hub") {
      return (
        <motion.div
          key="knowledge-hub"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <KnowledgeHub />
        </motion.div>
      );
    }

    if (activeTab === "creators-manager") {
      return (
        <motion.div
          key="creators-manager"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8"
        >
          <CreatorsManagerPage />
        </motion.div>
      );
    }

    if (activeTab === "social-templates") {
      return (
        <motion.div
          key="social-templates"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col -m-4 md:-m-8 p-4 md:p-8"
        >
          <SocialTemplates />
        </motion.div>
      );
    }

    if (activeTab === "career") {
      return (
        <motion.div
          key="career"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <CareerPage />
        </motion.div>
      );
    }

    return (
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">{activeItem?.label}</h2>
          <p className="text-zinc-400 mt-2">{activeItem?.desc}</p>
        </div>
        
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-4 bg-zinc-900 border border-zinc-800 rounded-full mb-4">
              {activeItem && <activeItem.icon className="w-8 h-8 text-zinc-400" />}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{activeItem?.label} Module</h3>
            <p className="text-zinc-400 max-w-sm">
              This module is currently under construction. Check back soon for updates.
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  // Sidebar width is handled via CSS classes now

  return (
    <div className="bg-zinc-950 text-white min-h-screen relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Career Hub</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - always fixed */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 border-r border-zinc-800 bg-zinc-950 flex flex-col transition-all duration-300 
          ${isSidebarOpen ? "w-72 md:w-64 p-4 md:p-6 translate-x-0" : "w-20 p-4 items-center -translate-x-full md:translate-x-0"}
        `}
      >
        <div className={`mb-10 flex items-center w-full ${isSidebarOpen ? "justify-between" : "justify-center flex-col gap-4"}`}>
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-bold tracking-tight hidden md:block">Career Hub</h1>
              <h1 className="text-xl font-bold tracking-tight md:hidden">Menu</h1>
              <p className="text-xs text-zinc-500 mt-1 hidden md:block">Admin Dashboard</p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors hidden md:block"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors md:hidden"
            title="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 w-full overflow-y-auto pb-4">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`flex items-center transition-all ${
                  isSidebarOpen ? "w-full justify-between p-3 rounded-xl" : "w-12 h-12 justify-center rounded-xl mx-auto"
                } ${
                  isActive 
                    ? "bg-white text-black shadow-md" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={isActive ? "text-black" : "text-zinc-500 flex-shrink-0"} />
                  {isSidebarOpen && <span className="font-medium text-sm text-left">{item.label}</span>}
                </div>
                {isActive && isSidebarOpen && <ChevronRight size={16} className="text-zinc-500 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>
        
        <div className={`pt-6 mt-6 border-t border-zinc-800 w-full ${!isSidebarOpen && "flex flex-col items-center gap-4"}`}>
          {isSidebarOpen ? (
            <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-full">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  OP
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">Olas Portfolio</p>
                  <p className="text-xs text-zinc-500">Admin Mode</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                title="Lock Dashboard"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold mx-auto flex-shrink-0">
                OP
              </div>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="p-3 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors mx-auto"
                title="Lock Dashboard"
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - pushed right by sidebar width on desktop */}
      <div
        className={`min-h-screen p-4 md:p-8 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        }`}
      >
        <AnimatePresence mode="wait">
          {renderActiveComponent()}
        </AnimatePresence>
      </div>
    </div>
  );
}
