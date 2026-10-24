"use client";

import React, { useState, useRef, useEffect } from 'react';
import { StrategyContract, SimulationStats } from '@/lib/flexStrategy/engine/types';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolStatus?: string | null;
  versionCreated?: number | null;
}

interface StrategyChatPanelProps {
  messages: MessageItem[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  currentVersion: number;
  activeStrategy: StrategyContract | null;
  stats?: SimulationStats | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StrategyChatPanel({
  messages,
  onSendMessage,
  isLoading,
  currentVersion,
  activeStrategy,
  stats,
  isCollapsed = false,
  onToggleCollapse,
}: StrategyChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText;
    setInputText('');
    onSendMessage(msg);
  };

  return (
    <div
      className={`h-full border-l border-zinc-800 bg-zinc-950 flex flex-col select-none transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 ${
        isCollapsed ? 'w-10' : 'w-80 md:w-96'
      }`}
    >
      {isCollapsed ? (
        <div
          onClick={onToggleCollapse}
          className="w-10 h-full flex flex-col items-center py-3 cursor-pointer hover:bg-zinc-900/60 transition-colors group"
          title="Expand Strategy Copilot Panel"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
            className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 group-hover:text-white hover:bg-zinc-800 transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
            <span className="material-symbols-outlined text-xs">smart_toy</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 tracking-wider uppercase">
              Copilot AI
            </span>
          </div>
        </div>
      ) : (
        <div className="w-80 md:w-96 h-full flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-xs text-blue-400">smart_toy</span>
          </div>
          <div>
            <span className="font-bold text-white block leading-none">Strategy Copilot</span>
            <span className="text-[10px] text-zinc-500">Llama-3.3 70B Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Version Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 font-mono font-bold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>v{currentVersion}</span>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-0.5"
              title="Collapse Strategy Copilot Panel"
            >
              <span className="material-symbols-outlined text-sm">dock_to_right</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Strategy Context Banner */}
      <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-zinc-300 font-semibold truncate">{activeStrategy?.name || 'Active Strategy'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-zinc-400">
          <span>{stats?.totalTrades ?? 0} trades</span>
          <span className={(stats?.winRate ?? 0) >= 50 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {stats?.winRate ?? 0}% WR
          </span>
        </div>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => {
          const isUser = m.role === 'user';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                }`}
              >
                {/* Tool status chip if present */}
                {m.toolStatus && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-blue-400 font-mono border border-zinc-700/50">
                    <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    <span>{m.toolStatus}</span>
                  </div>
                )}

                {/* Content */}
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Script Version Tag */}
                {m.versionCreated && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Strategy Updated
                    </span>
                    <span className="font-bold text-white">v{m.versionCreated}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-start space-y-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm animate-spin text-blue-400">
                progress_activity
              </span>
              <span>Analyzing strategy & generating preview...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Quick Prompts */}
      <div className="px-3 py-1.5 border-t border-zinc-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => onSendMessage('Explain how my current strategy logic works and when it opens trades.')}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 border border-zinc-800 transition-colors flex items-center gap-1"
        >
          <span>💡 Explain Logic</span>
        </button>
        <button
          type="button"
          onClick={() => onSendMessage('Analyze my backtest stats and suggest optimized SL & TP parameters.')}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 border border-zinc-800 transition-colors flex items-center gap-1"
        >
          <span>🎯 Optimize SL/TP</span>
        </button>
        <button
          type="button"
          onClick={() => onSendMessage('Add a 50 EMA trend filter so we only buy when price is above 50 EMA and sell when below.')}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 border border-zinc-800 transition-colors flex items-center gap-1"
        >
          <span>📈 Add 50 EMA</span>
        </button>
        <button
          type="button"
          onClick={() => onSendMessage('Diagnose why the strategy had losses and how to reduce false signals.')}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 border border-zinc-800 transition-colors flex items-center gap-1"
        >
          <span>⚠️ Diagnose Losses</span>
        </button>
        <button
          type="button"
          onClick={() => onSendMessage('Add an RSI momentum confirmation filter to avoid buying when overbought')}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0 border border-zinc-800 transition-colors flex items-center gap-1"
        >
          <span>📊 Add RSI</span>
        </button>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-950 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI to modify strategy or explain entries..."
          disabled={isLoading}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center disabled:opacity-40 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </form>
    </div>
  )}
</div>
);
}
