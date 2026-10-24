"use client";

import React, { useState } from 'react';
import { StrategyContract } from '@/lib/flexStrategy/engine/types';
import { generateMq5Stub } from '@/lib/flexStrategy/export/mq5';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyContract;
}

export function ExportModal({ isOpen, onClose, strategy }: ExportModalProps) {
  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(strategy, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${strategy.name.toLowerCase().replace(/\s+/g, '_')}_strategy.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMq5 = () => {
    const mq5Code = generateMq5Stub(strategy);
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(mq5Code);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${strategy.name.toLowerCase().replace(/\s+/g, '_')}.mq5`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">ios_share</span>
            <h3 className="text-base font-bold text-white">Export Strategy</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Download your strategy configuration and contract for backup, sharing, or translation.
        </p>

        {/* Export Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleDownloadJson}
            className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-white block">Strategy JSON Contract</span>
              <span className="text-[11px] text-zinc-400">Pure schema with params and JavaScript onBar code</span>
            </div>
            <span className="material-symbols-outlined text-blue-400 text-sm group-hover:translate-x-1 transition-transform">
              download
            </span>
          </button>

          <button
            onClick={handleDownloadMq5}
            className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left transition-colors flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-white block">MetaTrader 5 (.mq5) Skeleton</span>
              <span className="text-[11px] text-zinc-400">Ready-to-compile EA header & inputs definition</span>
            </div>
            <span className="material-symbols-outlined text-purple-400 text-sm group-hover:translate-x-1 transition-transform">
              download
            </span>
          </button>
        </div>

        {/* Coming soon notice */}
        <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-xs text-blue-300 flex items-center gap-2 mt-4">
          <span className="material-symbols-outlined text-sm text-blue-400">info</span>
          <span>Full 1-click Python Backtester & MQ5 code compiler coming soon in v2.</span>
        </div>
      </div>
    </div>
  );
}
