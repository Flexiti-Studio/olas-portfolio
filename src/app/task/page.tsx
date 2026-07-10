"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Send, DollarSign } from "lucide-react";
import TaskApplier from "@/components/task/TaskApplier";
import PaymentTracker from "@/components/task/PaymentTracker";

export default function TaskDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [counter, setCounter] = useState<{ sessionCount: number; linkCount: number; sessionTarget: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"apply" | "payments">("apply");

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchCounter = async () => {
      try {
        const res = await fetch("/api/task/counter");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setCounter({ ...json.data, sessionTarget: json.sessionTarget || 20 });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchCounter();
    const interval = setInterval(fetchCounter, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);


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
    <div className="min-h-screen bg-zinc-950 text-white flex print:bg-white print:text-black print:h-auto print:overflow-visible">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col hidden md:flex shrink-0 sticky top-0 h-screen print:hidden">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <Send className="text-indigo-500" />
            Task Runner
          </div>
        </div>
        
        <div className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab("apply")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'apply' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Auto Apply</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("payments")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'payments' ? 'bg-green-500/10 text-green-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <DollarSign size={20} />
            <span className="font-medium">Payments</span>
          </button>
        </div>

        {counter && (
          <div className="p-6 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Today's Progress</h3>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-300 text-sm font-medium">
                  {counter.sessionCount > 4 ? 'Overflow Session' : `Session ${counter.sessionCount}`}
                </span>
                <span className="text-indigo-400 text-sm font-bold">
                  {counter.sessionCount > 4 ? counter.linkCount : (counter.linkCount === 0 ? 0 : ((counter.linkCount - 1) % counter.sessionTarget) + 1)} {counter.sessionCount <= 4 ? `/ ${counter.sessionTarget}` : ''}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1">
                <div 
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, counter.sessionCount > 4 ? 100 : ((counter.linkCount === 0 ? 0 : ((counter.linkCount - 1) % counter.sessionTarget) + 1) / counter.sessionTarget) * 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-right">Links saved in current session</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col print:overflow-visible print:bg-white">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-sm print:hidden">
          <h2 className="font-semibold text-lg">
            {activeTab === 'apply' ? 'Job Application Task' : 'Payment Tracking'}
          </h2>
        </header>

        <main className="p-8 print:p-0">
          {activeTab === 'apply' ? <TaskApplier /> : <PaymentTracker />}
        </main>
      </div>
    </div>
  );
}
