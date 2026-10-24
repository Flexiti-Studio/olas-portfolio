import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none">
      {/* Top Navigation */}
      <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <span className="material-symbols-outlined text-lg">bolt</span>
          </span>
          <span className="font-extrabold text-base tracking-tight text-white">flexStrategy</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-900/60">
            MVP
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/flexStrategy/login"
            className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/flexStrategy/dashboard"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/40 hover:scale-[1.02]"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Natural Language to Quant Strategy in Seconds
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Describe your trading strategy in chat. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            Watch it trade on the chart.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          Talk to an AI strategy engineer that translates your rules into clean JavaScript bot scripts, executes bar-by-bar simulations with intrabar SL/TP in a sandboxed Web Worker, and updates parameters in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <Link
            href="/flexStrategy/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <span>Open Strategy Workspace</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>

          <Link
            href="/flexStrategy/project/proj_gold_demo"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-amber-400 text-base">play_circle</span>
            <span>Try Live Gold Demo</span>
          </Link>
        </div>

        {/* 3 Core Feature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-16 text-left w-full">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
            </div>
            <h3 className="font-bold text-base text-white">1. Converse with AI</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Describe setups like &quot;Range breakout for Gold on 5m with 2:1 TP&quot;. The copilot writes the code, handles dry-run repair, and documents parameters.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-xl">candlestick_chart</span>
            </div>
            <h3 className="font-bold text-base text-white">2. Live Candlestick Replay</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Step or play through historical candles. Visual buy/sell markers, stop loss lines, and target hits appear right on your screen.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-xl">tune</span>
            </div>
            <h3 className="font-bold text-base text-white">3. Instant Parameter Tuning</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Adjust lookbacks, stops, and multipliers. A sandboxed Web Worker re-simulates all trades within 300ms so you find the optimal edge.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-500">
        flexStrategy MVP • Built with Next.js App Router, Tailwind, and Web Worker Sandbox.
      </footer>
    </div>
  );
}
