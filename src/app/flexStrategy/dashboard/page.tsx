"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface ProjectItem {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  updatedAt: string;
  versionsCount: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      id: 'proj_gold_1',
      name: 'XAUUSD Range Breakout System',
      symbol: 'XAUUSD',
      timeframe: '5m',
      updatedAt: 'Just now',
      versionsCount: 3,
    },
    {
      id: 'proj_trend_2',
      name: 'London Session Momentum Bot',
      symbol: 'GBPUSD',
      timeframe: '15m',
      updatedAt: '2 hours ago',
      versionsCount: 1,
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newSymbol, setNewSymbol] = useState('XAUUSD');
  const [newTimeframe, setNewTimeframe] = useState('5m');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: ProjectItem = {
      id: 'proj_' + Math.random().toString(36).substring(2, 8),
      name: newProjectName.trim(),
      symbol: newSymbol,
      timeframe: newTimeframe,
      updatedAt: 'Just now',
      versionsCount: 1,
    };

    setProjects([newProj, ...projects]);
    setNewProjectName('');
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/flexStrategy" className="flex items-center gap-2 font-bold text-base text-white">
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">bolt</span>
            </span>
            <span>flexStrategy</span>
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-400 font-semibold">Workspace Projects</span>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-900/40"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Strategy Project
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Strategy Projects</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Build, converse with AI, backtest intrabar on candles, and fine-tune your trading strategies.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <Link
              key={proj.id}
              href={`/flexStrategy/project/${proj.id}`}
              className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-all hover:bg-zinc-900 flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-900/60">
                      {proj.symbol}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 font-semibold">
                      {proj.timeframe}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {proj.updatedAt}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                  {proj.name}
                </h3>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-xs text-amber-400">history</span>
                  {proj.versionsCount} version{proj.versionsCount !== 1 ? 's' : ''}
                </span>

                <span className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                  Open Workspace
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* New Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">create_new_folder</span>
                Create Strategy Project
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Strategy Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold 5m Session Breakout"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Symbol
                  </label>
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="XAUUSD">XAUUSD (Gold)</option>
                    <option value="EURUSD">EURUSD</option>
                    <option value="GBPUSD">GBPUSD</option>
                    <option value="BTCUSD">BTCUSD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Timeframe
                  </label>
                  <select
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
