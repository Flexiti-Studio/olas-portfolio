"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Send } from "lucide-react";
import TaskApplier from "@/components/task/TaskApplier";

export default function TaskDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

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
            <h1 className="text-2xl font-bold text-white mb-2">Task Access</h1>
            <p className="text-zinc-400">Enter the passcode to view the task dashboard</p>
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
              Unlock Task Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex print:bg-white print:text-black">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col hidden md:flex shrink-0 print:hidden">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <Send className="text-indigo-500" />
            Task Runner
          </div>
        </div>
        
        <div className="p-4 space-y-2 flex-1">
          <button className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all bg-indigo-500/10 text-indigo-400">
            <FileText size={20} />
            <span className="font-medium">Auto Apply</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto print:overflow-visible print:bg-white">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 sticky top-0 z-10 print:hidden">
          <h2 className="font-semibold text-lg">Job Application Task</h2>
        </header>

        <main className="p-8 print:p-0">
          <TaskApplier />
        </main>
      </div>
    </div>
  );
}
