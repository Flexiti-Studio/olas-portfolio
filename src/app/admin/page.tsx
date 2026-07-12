"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  MessageSquare, 
  DollarSign, 
  Bell,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Briefcase,
  Target,
  Building,
  X
} from "lucide-react";
import CvTailor from "@/components/admin/CvTailor";
import JobWebsites from "@/components/admin/JobWebsites";
import ApplicationTracker from "@/components/admin/ApplicationTracker";
import CoverLetterGenerator from "@/components/admin/CoverLetterGenerator";
import CompanyResearch from "@/components/admin/CompanyResearch";
import InterviewPrepList from "@/app/admin/interview-prep/page";
import BudgetStrategy from "@/app/admin/budget-strategy/page";
import FocusMode from "@/app/admin/focus/page";
import KnowledgeHub from "@/app/admin/knowledge/page";
import BankAccounts from "@/components/admin/BankAccounts";
import { Brain, Focus, PiggyBank, Landmark } from "lucide-react";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Main statistics" },
  { id: "cv-tailor", label: "CV Tailor", icon: FileText, desc: "Manage CV templates" },
  { id: "job-tracker", label: "Application Tracker", icon: Briefcase, desc: "Kanban pipeline" },
  { id: "cover-letters", label: "Cover Letters", icon: Target, desc: "AI Cover Letter Gen" },
  { id: "job-websites", label: "Job Websites", icon: Building, desc: "Saved career pages" },
  { id: "company-research", label: "Company Research", icon: Search, desc: "Deep dive companies" },
  { id: "interview-prep", label: "Interview Prep", icon: MessageSquare, desc: "Notes & questions" },
  { id: "salary-benchmarker", label: "Salary Benchmarker", icon: DollarSign, desc: "Compare offers" },
  { id: "budget-strategy", label: "Budget Strategy", icon: PiggyBank, desc: "50/30/20 Budgeting" },
  { id: "bank-accounts", label: "Bank Accounts", icon: Landmark, desc: "Manage balances" },
  { id: "focus-mode", label: "Focus Mode", icon: Focus, desc: "Single-project tracking" },
  { id: "knowledge-hub", label: "Knowledge Hub", icon: Brain, desc: "Ideas and facts" },
  { id: "follow-up", label: "Follow-up Reminders", icon: Bell, desc: "Don't miss a beat" },
];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(SIDEBAR_ITEMS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const ActiveComponent = () => {
    const activeItem = SIDEBAR_ITEMS.find(item => item.id === activeTab);
    
    if (activeTab === "overview") {
      return (
        <motion.div 
          key="overview"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col"
        >
          <div className="mb-12 border-b border-zinc-800 pb-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-400 mt-2">Welcome back. Here is the overview of your portfolio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-zinc-400 text-sm mb-2">Total Views</h3>
              <p className="text-3xl font-bold">1,248</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-zinc-400 text-sm mb-2">Projects</h3>
              <p className="text-3xl font-bold">12</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-zinc-400 text-sm mb-2">Messages</h3>
              <p className="text-3xl font-bold">5</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
            <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div>
                  <p className="font-medium">New contact message from John</p>
                  <p className="text-sm text-zinc-500">Just now</p>
                </div>
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs">Unread</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-zinc-800/50">
                <div>
                  <p className="font-medium">Project &quot;Olas UI&quot; deployed successfully</p>
                  <p className="text-sm text-zinc-500">2 hours ago</p>
                </div>
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs">System</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Sanity CMS backup completed</p>
                  <p className="text-sm text-zinc-500">Yesterday</p>
                </div>
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs">System</span>
              </div>
            </div>
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
          <ActiveComponent />
        </AnimatePresence>
      </div>
    </div>
  );
}
