"use client";

import React, { useState, useEffect } from 'react';
import { ParamSchemaItem } from '@/lib/flexStrategy/engine/types';

interface ParametersPanelProps {
  schema: ParamSchemaItem[];
  values: Record<string, any>;
  onChange: (newValues: Record<string, any>) => void;
  strategyName: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ParametersPanel({
  schema,
  values,
  onChange,
  strategyName,
  isCollapsed = false,
  onToggleCollapse,
}: ParametersPanelProps) {
  const [localValues, setLocalValues] = useState<Record<string, any>>(values);

  // Sync when strategy or values change from outside
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  // Debounce updates by 300ms, only if values actually changed
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Check if values actually changed
    const hasChanged = Object.keys(localValues).some(
      (k) => localValues[k] !== values[k]
    );
    if (!hasChanged) return;

    const timer = setTimeout(() => {
      onChange(localValues);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValues, onChange, values]);

  const handleChange = (key: string, val: any) => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div
      className={`h-full border-l border-zinc-800 bg-zinc-950 flex flex-col select-none transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 ${
        isCollapsed ? 'w-10' : 'w-72'
      }`}
    >
      {isCollapsed ? (
        <div
          onClick={onToggleCollapse}
          className="w-10 h-full flex flex-col items-center py-3 cursor-pointer hover:bg-zinc-900/60 transition-colors group"
          title="Expand Parameters Panel"
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
          <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
            <span className="material-symbols-outlined text-xs">tune</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 tracking-wider uppercase">
              Parameters
            </span>
          </div>
        </div>
      ) : (
        <div className="w-72 h-full flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-white">
          <span className="material-symbols-outlined text-sm text-blue-400">tune</span>
          <span className="truncate max-w-[140px]">{strategyName || 'Parameters'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-mono">Live Sync</span>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Collapse Parameters Panel"
            >
              <span className="material-symbols-outlined text-sm">dock_to_right</span>
            </button>
          )}
        </div>
      </div>

      {/* Inputs list */}
      <div className="p-3 overflow-y-auto flex-1 space-y-3.5">
        {schema.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs">
            No adjustable parameters defined in this strategy version.
          </div>
        ) : (
          schema.map((p) => {
            const currentVal = localValues[p.key] !== undefined ? localValues[p.key] : p.default;

            return (
              <div key={p.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    {p.label || p.key}
                  </label>
                  {p.type === 'number' && (
                    <span className="text-[11px] font-mono text-blue-400 font-bold">
                      {currentVal}
                    </span>
                  )}
                </div>

                {p.type === 'number' && (
                  <div className="space-y-1">
                    <input
                      type="number"
                      step={p.step ?? 0.1}
                      min={p.min}
                      max={p.max}
                      value={currentVal}
                      onChange={(e) => handleChange(p.key, parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    {p.min !== undefined && p.max !== undefined && (
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step ?? (p.max - p.min) / 100}
                        value={currentVal}
                        onChange={(e) => handleChange(p.key, parseFloat(e.target.value) || 0)}
                        className="w-full accent-blue-600 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    )}
                  </div>
                )}

                {p.type === 'boolean' && (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(currentVal)}
                      onChange={(e) => handleChange(p.key, e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs text-zinc-400">
                      {currentVal ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                )}

                {p.type === 'select' && (
                  <select
                    value={currentVal}
                    onChange={(e) => handleChange(p.key, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {(p.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 border-t border-zinc-900 bg-zinc-950/80 text-[10px] text-zinc-500 flex items-center gap-1.5 shrink-0">
        <span className="material-symbols-outlined text-xs text-emerald-400">bolt</span>
        <span>Re-simulates in Web Worker on edit (300ms debounce)</span>
      </div>
    </div>
  )}
</div>
);
}
