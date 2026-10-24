"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ChartScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
  filename: string;
  symbol: string;
  timeframe: string;
}

export function ChartScreenshotModal({
  isOpen,
  onClose,
  screenshotUrl,
  filename,
  symbol,
  timeframe,
}: ChartScreenshotModalProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  // Measure loaded image dimensions
  useEffect(() => {
    if (!screenshotUrl) {
      setImgDimensions(null);
      return;
    }
    const img = new Image();
    img.src = screenshotUrl;
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [screenshotUrl]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !screenshotUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = screenshotUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloaded chart snapshot');
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        const res = await fetch(screenshotUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2500);
        toast.success('Image copied to clipboard!');
      } else {
        toast.error('Clipboard copy not supported in this browser');
      }
    } catch (err: any) {
      console.error('Clipboard copy error:', err);
      toast.error('Could not copy image to clipboard');
    }
  };

  const handleOpenNewTab = () => {
    const w = window.open('');
    if (w) {
      w.document.write(`<img src="${screenshotUrl}" style="max-width:100%;height:auto;background:#131722;display:block;margin:auto;" />`);
      w.document.title = filename;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] bg-[#181c27]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-lg">photo_camera</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">Chart Snapshot</h3>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300 font-bold">
                  {symbol} · {timeframe.toUpperCase()}
                </span>
                {imgDimensions && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    {imgDimensions.width} × {imgDimensions.height} px
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono truncate max-w-md">
                {filename}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close (Esc)"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Image Preview Canvas Area */}
        <div className="relative p-3 bg-[#0c0e14] flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotUrl}
            alt="Chart Snapshot"
            className="max-h-[62vh] max-w-full rounded border border-[#2a2e39] shadow-lg object-contain bg-[#131722]"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#2a2e39] bg-[#181c27] text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors font-medium text-[11px]"
              title="Open full-resolution image in new tab"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span>Open in New Tab</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold ${
                hasCopied
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {hasCopied ? 'check' : 'content_copy'}
              </span>
              <span>{hasCopied ? 'Copied!' : 'Copy Image'}</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
