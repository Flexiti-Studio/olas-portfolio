"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Send, DollarSign, Menu, X } from "lucide-react";
import TaskApplier from "@/components/task/TaskApplier";
import PaymentTracker from "@/components/task/PaymentTracker";

export default function TaskDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [counter, setCounter] = useState<{ sessionCount: number; linkCount: number; sessionTarget: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"apply" | "payments">("apply");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-zinc-950 text-white flex print:bg-white print:text-black print:h-auto print:overflow-visible relative">
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 md:w-64 border-r border-zinc-800 bg-zinc-950 md:bg-zinc-900/50 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:sticky md:top-0 md:h-screen shrink-0 print:hidden
      `}>
        <div className="p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <Send className="text-indigo-500" />
            Task Runner
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab("apply"); setIsMobileMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'apply' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Auto Apply</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab("payments"); setIsMobileMenuOpen(false); }}
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
      <div className="flex-1 flex flex-col min-w-0 print:overflow-visible print:bg-white">
        <header className="border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-3 md:h-16 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-sm print:hidden gap-3">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <Menu size={20} />
              </button>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Send className="w-5 h-5 hidden md:block text-indigo-500" />
                {activeTab === 'apply' ? 'Job Application Task' : 'Payment Tracking'}
              </h2>
            </div>
          </div>
          
          {/* Mobile Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 md:hidden overflow-x-auto w-full">
            <button 
              onClick={() => setActiveTab("apply")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${activeTab === 'apply' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'text-zinc-400'}`}
            >
              <FileText size={16} /> Auto Apply
            </button>
            <button 
              onClick={() => setActiveTab("payments")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-colors ${activeTab === 'payments' ? 'bg-green-500/20 text-green-400 font-medium' : 'text-zinc-400'}`}
            >
              <DollarSign size={16} /> Payments
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 print:p-0 overflow-x-hidden">
          {activeTab === 'apply' ? <TaskApplier /> : <PaymentTracker />}
        </main>
      </div>
    </div>
  );
}
