"use client";

import React, { useState, useEffect } from 'react';
import { createEaVersion } from '@/app/actions/eaLab';
import { toast } from 'sonner';
import {
  EaSubVersionType,
  EA_SUB_VERSIONS,
  EA_SUB_VERSION_LIST,
  serializeSubVersionNotes,
} from '@/lib/ea-lab/subVersions';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  strategyName?: string;
  defaultLabel?: string;
  existingHashes?: { label: string; codeHash: string }[];
  initialCode?: string;
  initialSubVersion?: EaSubVersionType;
  baseVersionLabel?: string;
  baseVersionId?: string;
  availableVersions?: { id: string; label: string }[];
  onCreated?: (version: any) => void;
}

export function AddVersionModal({
  isOpen,
  onClose,
  strategyId,
  strategyName,
  defaultLabel = 'v1',
  existingHashes = [],
  initialCode,
  initialSubVersion = 'normal',
  baseVersionLabel,
  baseVersionId,
  availableVersions = [],
  onCreated,
}: VersionModalProps) {
  const [label, setLabel] = useState(defaultLabel);
  const [parentVersion, setParentVersion] = useState<string>(baseVersionLabel || '');
  const [subVersion, setSubVersion] = useState<EaSubVersionType>(initialSubVersion);
  const [code, setCode] = useState(initialCode || '');
  const [changeNotes, setChangeNotes] = useState('');
  const [computedHash, setComputedHash] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel(defaultLabel);
      setParentVersion(baseVersionLabel || '');
      if (initialCode !== undefined) setCode(initialCode);
      if (initialSubVersion) setSubVersion(initialSubVersion);
      setError(null);
    }
  }, [isOpen, defaultLabel, baseVersionLabel, initialCode, initialSubVersion]);

  // Compute SHA256 in browser on code change
  useEffect(() => {
    if (!code.trim()) {
      setComputedHash('');
      setDuplicateWarning(null);
      return;
    }

    let isCancelled = false;
    async function hashText() {
      try {
        const msgUint8 = new TextEncoder().encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        if (!isCancelled) {
          setComputedHash(hashHex);
          // Check if matches an existing version in this strategy
          const duplicate = existingHashes.find((h) => h.codeHash === hashHex);
          if (duplicate) {
            setDuplicateWarning(
              `Duplicate Code Alert: This exact code already exists in ${duplicate.label} (${hashHex.slice(0, 8)}...).`
            );
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch (e) {
        console.error('Error hashing code:', e);
      }
    }

    hashText();
    return () => {
      isCancelled = true;
    };
  }, [code, existingHashes]);

  if (!isOpen) return null;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCode(content);
        if (!changeNotes) {
          setChangeNotes(`Imported from ${file.name}`);
        }
      }
    };
    reader.readAsText(file);
  }

  function handleSelectSubVersion(sv: EaSubVersionType) {
    setSubVersion(sv);
    const svConfig = EA_SUB_VERSIONS[sv];
    // Suggest an intuitive label if basing off a version
    const activeBase = parentVersion || baseVersionLabel;
    if (activeBase) {
      setLabel(`${activeBase} - ${svConfig.label}`);
    } else {
      // If label matches vX or vX - Something, replace the suffix
      const baseMatch = label.match(/^(v\d+(\.\d+)*)/i);
      if (baseMatch) {
        setLabel(`${baseMatch[0]} - ${svConfig.label}`);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError('Please provide a version label.');
      toast.error('Please provide a version label.');
      return;
    }
    if (!code.trim()) {
      setError('Please paste or upload .mq5 code.');
      toast.error('Please paste or upload .mq5 code.');
      return;
    }

    setLoading(true);
    setError(null);

    const serializedNotes = serializeSubVersionNotes(subVersion, changeNotes, parentVersion || baseVersionLabel);

    const res = await createEaVersion({
      strategyId,
      label: label.trim(),
      code,
      changeNotes: serializedNotes || undefined,
    });

    setLoading(false);

    if (!res.success || !res.version) {
      setError(res.error || 'Failed to save version');
      toast.error(res.error || 'Failed to save version');
      return;
    }

    toast.success(`EA Version "${res.version.label}" (${EA_SUB_VERSIONS[subVersion].label}) saved successfully!`);
    setCode('');
    setChangeNotes('');
    onClose();
    if (onCreated) {
      onCreated(res.version);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">terminal</span>
              {parentVersion || baseVersionLabel ? `New Sub-Version under ${parentVersion || baseVersionLabel}` : 'New EA Version'}
            </h3>
            {strategyName && <p className="text-xs text-zinc-400 mt-0.5">{strategyName}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {duplicateWarning && (
          <div className="mb-4 p-3 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
            <span>{duplicateWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Branch / Parent Version Selector */}
          {availableVersions.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40">
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-purple-400 text-sm">account_tree</span>
                Created From / Branch Parent Version
              </label>
              <select
                value={parentVersion}
                onChange={(e) => {
                  const pVal = e.target.value;
                  setParentVersion(pVal);
                  if (pVal && subVersion !== 'normal') {
                    const svConfig = EA_SUB_VERSIONS[subVersion];
                    setLabel(`${pVal} - ${svConfig.label}`);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">None (Standalone Major Version)</option>
                {availableVersions.map((av) => (
                  <option key={av.id} value={av.label}>
                    {av.label} {baseVersionLabel === av.label ? '(Selected Base)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400 mt-1.5">
                {parentVersion
                  ? `This subversion will be organized directly under "${parentVersion}" in code view and flow charts.`
                  : 'Independent root version in code view and flowchart.'}
              </p>
            </div>
          )}

          {/* Sub-Version Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-400 text-sm">alt_route</span>
                Sub-Version / Code Variant *
              </label>
              <span className="text-[10px] text-zinc-500 font-normal">Select algorithm test regime</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EA_SUB_VERSION_LIST.map((sv) => {
                const isSelected = subVersion === sv.id;
                return (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => handleSelectSubVersion(sv.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${sv.bgColor} ${sv.borderColor} ring-1 ${sv.activeRing} shadow-sm`
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`material-symbols-outlined text-base ${isSelected ? sv.textColor : 'text-zinc-500'}`}>
                        {sv.icon}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      )}
                    </div>
                    <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      {sv.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-zinc-500">info</span>
              <span>{EA_SUB_VERSIONS[subVersion].description}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Version Name / Label *
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">e.g. v1 - Break Even</span>
              </div>
              <input
                type="text"
                required
                placeholder="v1 - Normal, v1 - Break Even..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500">Quick:</span>
                {['Normal', 'Break Even', 'Session Trading', 'Ranging', 'Liquidity'].map((suffix) => {
                  const base = baseVersionLabel || 'v1';
                  const candidate = `${base} - ${suffix}`;
                  return (
                    <button
                      key={suffix}
                      type="button"
                      onClick={() => setLabel(candidate)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                      {suffix}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Upload .mq5 file
              </label>
              <input
                type="file"
                accept=".mq5,.mq4,.cpp,.h,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
              />
              {initialCode && (
                <p className="text-[10px] text-zinc-500 mt-1">
                  Pre-populated with source code from {baseVersionLabel || 'selected version'}.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Source Code (.mq5 / MQL5) *
              </label>
              {computedHash && (
                <span className="text-[11px] font-mono text-zinc-500">
                  SHA-256: {computedHash.slice(0, 12)}...
                </span>
              )}
            </div>
            <textarea
              rows={9}
              required
              placeholder="// Paste full .mq5 Expert Advisor source code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full font-mono text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Change Notes
            </label>
            <textarea
              rows={2}
              placeholder="What makes this sub-version distinct? (e.g. Added 1R breakeven trigger, restricted to London session 08:00-11:00 GMT)"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Saving...
                </>
              ) : (
                'Save Version'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
