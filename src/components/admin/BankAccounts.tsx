"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Landmark, CreditCard, ArrowRight, Wallet, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BankAccounts() {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBankName, setNewBankName] = useState("");
  const [newBankBalance, setNewBankBalance] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/budgeting/banks");
      const json = await res.json();
      if (json.success) setBanks(json.data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleAdd = async () => {
    if (!newBankName) return;
    try {
      await fetch("/api/budgeting/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBankName, balance: Number(newBankBalance) || 0 })
      });
      setNewBankName("");
      setNewBankBalance("");
      setIsAdding(false);
      fetchBanks();
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank?")) return;
    try {
      await fetch(`/api/budgeting/banks?id=${id}`, { method: "DELETE" });
      fetchBanks();
    } catch (e) {}
  };

  const handleUpdateBalance = async (id: string, balance: number) => {
    try {
      await fetch(`/api/budgeting/banks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, balance })
      });
      fetchBanks();
    } catch (e) {}
  };

  const totalPool = banks.reduce((sum, b) => sum + Number(b.balance), 0);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="animate-spin w-10 h-10 text-indigo-500" />
    </div>
  );

  return (
    <div className="text-white space-y-10">
      
      {/* Header & Total Pool Glassmorphic Card */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-10 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-slate-900/90 to-purple-900/80 backdrop-blur-xl border border-white/10 rounded-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center tracking-tight text-white mb-3">
              <Landmark className="mr-4 w-10 h-10 text-indigo-400" /> 
              Asset Portfolio
            </h1>
            <p className="text-indigo-200/70 max-w-md leading-relaxed text-lg">
              Monitor your running bank balances and liquid assets. This data persists across all budget periods.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-inner backdrop-blur-md min-w-[300px]">
            <div className="flex items-center space-x-3 mb-2 opacity-80">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium tracking-wide uppercase text-emerald-100">Total Liquidity Pool</span>
            </div>
            <div className="text-5xl font-black bg-gradient-to-r from-emerald-300 to-teal-500 bg-clip-text text-transparent drop-shadow-sm">
              ₦{totalPool.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Banks Grid */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-2xl font-bold flex items-center text-slate-200">
            <Activity className="w-6 h-6 mr-3 text-purple-400" /> Active Accounts
          </h2>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="group relative inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          >
            <Plus className={`w-5 h-5 mr-2 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
            {isAdding ? "Cancel" : "Add Account"}
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
                  placeholder="Bank Name (e.g., Monzo)" 
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₦</span>
                  <input 
                    type="number" 
                    placeholder="Starting Balance" 
                    value={newBankBalance}
                    onChange={e => setNewBankBalance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <button 
                  onClick={handleAdd} 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/25"
                >
                  Create <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banks.map((b, i) => (
            <motion.div 
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 group-hover:bg-indigo-900/50 transition-all">
                    <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-100">{b.name}</h3>
                </div>
                <button 
                  onClick={() => handleDelete(b.id)} 
                  className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5"/>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</label>
                <div className="relative group/input">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                  <input 
                    type="number"
                    defaultValue={b.balance}
                    onBlur={(e) => handleUpdateBalance(b.id, Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-lg font-medium text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all hover:bg-slate-900"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/input:opacity-100 text-xs text-indigo-400 font-medium transition-opacity">
                    Press Enter
                  </div>
                </div>
              </div>
              
              {/* Optional: Add a subtle progress bar showing this bank's percentage of total pool */}
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Portfolio Share</span>
                <span className="text-xs text-slate-300 font-bold">
                  {totalPool > 0 ? ((Number(b.balance) / totalPool) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  style={{ width: `${totalPool > 0 ? (Number(b.balance) / totalPool) * 100 : 0}%` }}
                />
              </div>

            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
