"use client";

import { useState } from "react";
import { Sparkles, Check, Heart, Send, RefreshCw } from "lucide-react";

export default function InteractiveButtonDemo() {
  const [clicked, setClicked] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleAsyncClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCount((c) => c + 1);
    }, 800);
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h4 className="text-base font-semibold text-white">Interactive Button Micro-interactions</h4>
        <p className="text-xs text-slate-400">
          Testing spring mechanics, tactile active states, and optimistic async loaders.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Glow Action */}
        <button
          onClick={() => setClicked("glow")}
          className="group relative px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
          <span>Glow Action</span>
          {clicked === "glow" && <Check className="w-3.5 h-3.5 ml-1 text-emerald-300 animate-in fade-in" />}
        </button>

        {/* Tactile Counter */}
        <button
          onClick={() => {
            setCount((c) => c + 1);
            setClicked("counter");
          }}
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all active:scale-90 flex items-center justify-center gap-2"
        >
          <Heart className={`w-4 h-4 ${count > 0 ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
          <span>Likes: {count}</span>
        </button>

        {/* Async Loader */}
        <button
          onClick={handleAsyncClick}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{loading ? "Processing..." : "Async Trigger"}</span>
        </button>
      </div>

      <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 font-mono">
        Active status: {clicked ? `Triggered [${clicked}]` : "Awaiting user interaction"} | Interaction total: {count}
      </div>
    </div>
  );
}

