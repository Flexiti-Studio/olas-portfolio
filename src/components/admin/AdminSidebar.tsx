"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  HelpCircle,
  Download,
  Zap,
  Compass,
  Briefcase,
  Building,
  Search,
  MessageSquare,
  DollarSign,
  PiggyBank,
  Target,
  Focus,
  Brain,
  Users,
  Sparkles,
  Bell,
  FileText,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  desc: string;
  href?: string;
}

export const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Main statistics" },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle, desc: "AI Question-to-Quiz Generator & Grading" },
  { id: "widget-updates", label: "Widget Updates", icon: Download, desc: "Desktop auto-updater" },
  { id: "speed-dashboard", label: "Speed Apply", icon: Zap, desc: "Personal Auto Applier" },
  { id: "career", label: "Career", icon: Compass, desc: "Career goals & profile" },
  { id: "job-tracker", label: "Application Tracker", icon: Briefcase, desc: "Kanban pipeline" },
  { id: "gigs-tracker", label: "Gigs Tracker", icon: Briefcase, desc: "Freelance & gigs pipeline" },
  { id: "job-websites", label: "Job Websites", icon: Building, desc: "Saved career pages" },
  { id: "company-research", label: "Company Research", icon: Search, desc: "Deep dive companies" },
  { id: "interview-prep", label: "Study", icon: MessageSquare, desc: "Notes & questions" },
  { id: "salary-benchmarker", label: "Salary Benchmarker", icon: DollarSign, desc: "Compare offers" },
  { id: "budget-strategy", label: "Budget Strategy", icon: PiggyBank, desc: "50/30/20 Budgeting" },
  { id: "lifestyle-cost", label: "Lifestyle Cost", icon: PiggyBank, desc: "Income vs Expenses" },
  { id: "bank-accounts", label: "Goals Tracker", icon: Target, desc: "Track progress and timelines", href: "/admin/goals" },
  { id: "focus-mode", label: "Focus Mode", icon: Focus, desc: "Single-project tracking" },
  { id: "knowledge-hub", label: "Knowledge Hub", icon: Brain, desc: "Ideas and facts" },
  { id: "creators-manager", label: "Creators Manager", icon: Users, desc: "Manage Creators" },
  { id: "social-templates", label: "Social Templates", icon: Sparkles, desc: "Outlines & frameworks" },
  { id: "follow-up", label: "Follow-up Reminders", icon: Bell, desc: "Don't miss a beat" },
  { id: "cv-tailor", label: "CV Tailor", icon: FileText, desc: "Manage CV templates" },
  { id: "cover-letters", label: "Cover Letters", icon: Target, desc: "AI Cover Letter Gen" },
];

interface AdminSidebarProps {
  activeTab: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectTab?: (tabId: string) => void;
  onLogout?: () => void;
}

export default function AdminSidebar({
  activeTab,
  isSidebarOpen,
  setIsSidebarOpen,
  onSelectTab,
  onLogout,
}: AdminSidebarProps) {
  const router = useRouter();

  const handleItemClick = (item: SidebarItem) => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    if (onSelectTab) {
      // If parent handles tab switching in-place
      onSelectTab(item.id);
      return;
    }

    // Default routing when outside main admin tab container
    if (item.href) {
      router.push(item.href);
    } else {
      router.push(`/admin?tab=${item.id}`);
    }
  };

  const handleLogoutClick = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_authenticated");
      sessionStorage.removeItem("admin_authenticated");
      document.cookie = "admin_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    if (onLogout) {
      onLogout();
    } else {
      router.push("/admin");
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-30 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Career Hub</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed left */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-zinc-800 bg-zinc-950 flex flex-col transition-all duration-300 ${isSidebarOpen
          ? "w-72 md:w-64 p-4 md:p-6 translate-x-0"
          : "w-20 p-4 items-center -translate-x-full md:translate-x-0"
          }`}
      >
        {/* Header / Brand */}
        <div
          className={`mb-8 flex items-center w-full ${isSidebarOpen ? "justify-between" : "justify-center flex-col gap-4"
            }`}
        >
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-bold tracking-tight hidden md:block text-white">
                Career Hub
              </h1>
              <h1 className="text-xl font-bold tracking-tight md:hidden text-white">
                Menu
              </h1>
              <p className="text-xs text-zinc-500 mt-1 hidden md:block">
                Admin Dashboard
              </p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors hidden md:block cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors md:hidden cursor-pointer"
            title="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 w-full overflow-y-auto pb-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {ADMIN_SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex items-center transition-all cursor-pointer ${isSidebarOpen
                  ? "w-full justify-between p-3 rounded-xl"
                  : "w-12 h-12 justify-center rounded-xl mx-auto"
                  } ${isActive
                    ? "bg-white text-black shadow-md font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={20}
                    className={`shrink-0 ${isActive ? "text-black" : "text-zinc-500"}`}
                  />
                  {isSidebarOpen && (
                    <span className="font-medium text-sm text-left truncate">
                      {item.label}
                    </span>
                  )}
                </div>
                {isActive && isSidebarOpen && (
                  <ChevronRight size={16} className="text-zinc-500 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div
          className={`pt-4 mt-2 border-t border-zinc-800 w-full ${!isSidebarOpen && "flex flex-col items-center gap-4"
            }`}
        >
          {isSidebarOpen ? (
            <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-full">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                  OP
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">Olas Portfolio</p>
                  <p className="text-xs text-zinc-500">Admin Mode</p>
                </div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Lock Dashboard"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold mx-auto shrink-0 text-white">
                OP
              </div>
              <button
                onClick={handleLogoutClick}
                className="p-3 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-colors mx-auto cursor-pointer"
                title="Lock Dashboard"
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
