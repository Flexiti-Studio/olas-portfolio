"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import GoalTrackerView from "@/components/admin/GoalTrackerView";

export default function GoalsTrackerPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="bg-zinc-950 text-white min-h-screen relative overflow-x-hidden">
      {/* Career Hub Main Admin Sidebar */}
      <AdminSidebar
        activeTab="bank-accounts"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <main
        className={`min-h-screen p-3 sm:p-5 md:p-8 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <GoalTrackerView />
        </div>
      </main>
    </div>
  );
}
