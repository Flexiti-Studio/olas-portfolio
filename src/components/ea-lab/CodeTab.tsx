"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddVersionModal } from './AddVersionModal';
import { updateEaVersionCode, deleteEaVersion } from '@/app/actions/eaLab';
import { toast } from 'sonner';
import { RunLike } from '@/lib/ea-lab/metrics';
import {
  EaSubVersionType,
  EA_SUB_VERSIONS,
  EA_SUB_VERSION_LIST,
  detectSubVersion,
  cleanSubVersionNotes,
  buildVersionTree,
  findParentVersion,
} from '@/lib/ea-lab/subVersions';
import dynamic from 'next/dynamic';
const VersionFlowChart = dynamic(() => import('./VersionFlowChart').then(m => m.VersionFlowChart), { ssr: false });

export interface VersionItem {
  id: string;
  label: string;
  code: string;
  codeHash: string;
  changeNotes?: string | null;
  createdAt: Date | string;
}

export interface VersionFinancials {
  versionId: string;
  runsCount: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  returnPct: number;
  profitFactor: number;
  totalR: number;
  hasRuns: boolean;
}

export function computeVersionFinancials(version: VersionItem, allRuns: RunLike[] = []): VersionFinancials {
  let vRuns = allRuns.filter(
    (r) =>
      r.versionId === version.id ||
      (r.versionId && r.versionId.toLowerCase() === version.label.toLowerCase()) ||
      (r.versionId && r.versionId.trim() === version.label.trim())
  );

  // If no direct ID/label match and all runs are unassigned, or this is the only code iteration, attribute runs
  if (vRuns.length === 0 && allRuns.length > 0) {
    const explicitlyOtherRuns = allRuns.filter(
      (r) => r.versionId && r.versionId !== version.id && r.versionId.toLowerCase() !== version.label.toLowerCase()
    );
    if (explicitlyOtherRuns.length === 0) {
      vRuns = allRuns;
    }
  }

  if (vRuns.length === 0) {
    return {
      versionId: version.id,
      runsCount: 0,
      tradesCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      returnPct: 0,
      profitFactor: 0,
      totalR: 0,
      hasRuns: false,
    };
  }

  let totalNet = 0;
  let totalDeposit = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let winCount = 0;
  let lossCount = 0;
  let allTradesCount = 0;
  let totalR = 0;

  vRuns.forEach((r) => {
    const runNet = r.netProfit !== undefined ? r.netProfit : ((r.finalBalance || 0) - (r.initialDeposit || 0));
    totalNet += runNet;
    totalDeposit += (r.initialDeposit || 10000);

    let runWinProfits = 0;
    let runLossProfits = 0;

    if (r.trades && r.trades.length > 0) {
      allTradesCount += r.trades.length;
      r.trades.forEach((t) => {
        const rMult = t.rMultiple ?? 0;
        totalR += rMult;

        if (t.profit !== undefined && t.profit !== null) {
          if (t.profit > 0) {
            runWinProfits += t.profit;
            winCount++;
          } else if (t.profit < 0) {
            runLossProfits += Math.abs(t.profit);
            lossCount++;
          } else {
            if (rMult > 0) winCount++;
            else if (rMult < 0) lossCount++;
          }
        } else {
          // If individual dollar profit wasn't explicitly stored, infer from R-multiple ($100 per 1R)
          if (rMult > 0) {
            winCount++;
            runWinProfits += rMult * 100;
          } else if (rMult < 0) {
            lossCount++;
            runLossProfits += Math.abs(rMult) * 100;
          }
        }
      });
    } else {
      allTradesCount += (r.tradesCount || 0);
      if (runNet > 0) {
        runWinProfits += runNet;
      } else if (runNet < 0) {
        runLossProfits += Math.abs(runNet);
      }
    }

    totalGrossProfit += runWinProfits;
    totalGrossLoss += runLossProfits;
  });

  if (totalGrossProfit === 0 && totalGrossLoss === 0) {
    if (totalNet > 0) totalGrossProfit = totalNet;
    else if (totalNet < 0) totalGrossLoss = Math.abs(totalNet);
  }

  const winRate = allTradesCount > 0 ? Number(((winCount / allTradesCount) * 100).toFixed(1)) : 0;
  const returnPct = totalDeposit > 0 ? Number(((totalNet / totalDeposit) * 100).toFixed(2)) : 0;
  const profitFactor = totalGrossLoss > 0
    ? Number((totalGrossProfit / totalGrossLoss).toFixed(2))
    : totalGrossProfit > 0 ? 99.99 : 0;

  return {
    versionId: version.id,
    runsCount: vRuns.length,
    tradesCount: allTradesCount,
    winCount,
    lossCount,
    winRate,
    grossProfit: Number(totalGrossProfit.toFixed(2)),
    grossLoss: Number(totalGrossLoss.toFixed(2)),
    netProfit: Number(totalNet.toFixed(2)),
    returnPct,
    profitFactor,
    totalR: Number(totalR.toFixed(2)),
    hasRuns: true,
  };
}

interface CodeTabProps {
  strategyId: string;
  strategyName: string;
  versions: VersionItem[];
  runs?: RunLike[];
  onVersionCreated?: () => void;
}

// Simple line-by-line diff algorithm
function computeLineDiff(textA: string, textB: string) {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  const diff: { type: 'added' | 'removed' | 'unchanged'; line: string }[] = [];

  let iA = 0;
  let iB = 0;

  while (iA < linesA.length || iB < linesB.length) {
    if (iA < linesA.length && iB < linesB.length && linesA[iA] === linesB[iB]) {
      diff.push({ type: 'unchanged', line: linesA[iA] });
      iA++;
      iB++;
    } else if (iA < linesA.length && (iB >= linesB.length || !linesB.includes(linesA[iA]))) {
      diff.push({ type: 'removed', line: linesA[iA] });
      iA++;
    } else if (iB < linesB.length) {
      diff.push({ type: 'added', line: linesB[iB] });
      iB++;
    } else {
      break;
    }
  }

  return diff;
}

// Lightweight syntax highlighter for MQL5 / C++
function highlightMql5(code: string) {
  const lines = code.split('\n');
  const keywords = new Set([
    'input', 'extern', 'enum', 'void', 'int', 'double', 'float', 'bool', 'string',
    'datetime', 'color', 'uchar', 'ulong', 'struct', 'class', 'public', 'private',
    'protected', 'virtual', 'const', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'default', 'true', 'false', 'NULL',
    'OnInit', 'OnDeinit', 'OnTick', 'OnTimer', 'OnTrade', 'OnTester',
  ]);

  return lines.map((line, idx) => {
    // Comments
    if (line.trim().startsWith('//')) {
      return (
        <span key={idx} className="text-zinc-500 italic block">
          {line}
        </span>
      );
    }

    // Tokenize
    const tokens = line.split(/(\b[A-Za-z_][A-Za-z0-9_]*\b|"[^"]*"|'[^']*'|\/\/.*$)/);
    return (
      <span key={idx} className="block leading-relaxed">
        {tokens.map((token, tIdx) => {
          if (token.startsWith('//')) {
            return (
              <span key={tIdx} className="text-zinc-500 italic">
                {token}
              </span>
            );
          }
          if (token.startsWith('"') || token.startsWith("'")) {
            return (
              <span key={tIdx} className="text-emerald-400">
                {token}
              </span>
            );
          }
          if (keywords.has(token)) {
            return (
              <span key={tIdx} className="text-blue-400 font-semibold">
                {token}
              </span>
            );
          }
          if (/^\d+(\.\d+)?$/.test(token)) {
            return (
              <span key={tIdx} className="text-amber-400">
                {token}
              </span>
            );
          }
          return <span key={tIdx}>{token}</span>;
        })}
      </span>
    );
  });
}

export function CodeTab({ strategyId, strategyName, versions, runs = [], onVersionCreated }: CodeTabProps) {
  const router = useRouter();
  const [localVersions, setLocalVersions] = useState<VersionItem[]>(versions);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions[versions.length - 1]?.id || ''
  );
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffVersionAId, setDiffVersionAId] = useState<string>(versions[0]?.id || '');
  const [diffVersionBId, setDiffVersionBId] = useState<string>(
    versions[versions.length - 1]?.id || ''
  );

  const [isAddVersionModalOpen, setIsAddVersionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);

  // View mode toggle: 'editor' or 'flowchart'
  const [viewMode, setViewMode] = useState<'editor' | 'flowchart'>('editor');

  // Sub-version filter and modal state
  const [subVersionFilter, setSubVersionFilter] = useState<'all' | EaSubVersionType>('all');
  const [modalInitialCode, setModalInitialCode] = useState<string>('');
  const [modalBaseVersionLabel, setModalBaseVersionLabel] = useState<string>('');
  const [modalBaseVersionId, setModalBaseVersionId] = useState<string>('');
  const [modalDefaultLabel, setModalDefaultLabel] = useState<string>('');
  const [modalInitialSubVersion, setModalInitialSubVersion] = useState<EaSubVersionType>('normal');

  // In-place code editing state
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [computedDraftHash, setComputedDraftHash] = useState('');

  useEffect(() => {
    setLocalVersions(versions);
    if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[versions.length - 1]?.id || '');
    }
  }, [versions]);

  const currentVersion = useMemo(() => {
    return localVersions.find((v) => v.id === selectedVersionId) || localVersions[localVersions.length - 1];
  }, [localVersions, selectedVersionId]);

  // Compute financial map for all versions
  const versionFinancialsMap = useMemo(() => {
    const map: Record<string, VersionFinancials> = {};
    localVersions.forEach((v) => {
      map[v.id] = computeVersionFinancials(v, runs);
    });
    return map;
  }, [localVersions, runs]);

  // Current selected version financials
  const currentFin = currentVersion ? versionFinancialsMap[currentVersion.id] : null;

  // Sub-version classification for each version
  const versionSubTypes = useMemo(() => {
    const map: Record<string, EaSubVersionType> = {};
    localVersions.forEach((v) => {
      map[v.id] = detectSubVersion(v);
    });
    return map;
  }, [localVersions]);

  const filteredVersions = useMemo(() => {
    if (subVersionFilter === 'all') return localVersions;
    return localVersions.filter((v) => versionSubTypes[v.id] === subVersionFilter);
  }, [localVersions, versionSubTypes, subVersionFilter]);

  const subVersionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: localVersions.length };
    EA_SUB_VERSION_LIST.forEach((sv) => {
      counts[sv.id] = localVersions.filter((v) => versionSubTypes[v.id] === sv.id).length;
    });
    return counts;
  }, [localVersions, versionSubTypes]);

  // Count total sub-versions across the strategy
  const subVersionsCount = useMemo(() => {
    return localVersions.filter((v) => Boolean(findParentVersion(v, localVersions))).length;
  }, [localVersions]);

  // Hierarchical version tree (sub-versions grouped directly under parent version)
  const versionTree = useMemo(() => {
    if (subVersionFilter === 'all') {
      return buildVersionTree(localVersions);
    }
    return buildVersionTree(filteredVersions);
  }, [subVersionFilter, localVersions, filteredVersions]);

  // Reset editor mode when switching versions
  useEffect(() => {
    setIsEditingCode(false);
  }, [selectedVersionId]);

  // Compute live SHA-256 hash as code is edited
  useEffect(() => {
    if (!isEditingCode) return;
    let isCancelled = false;
    async function calcHash() {
      try {
        const msgUint8 = new TextEncoder().encode(codeDraft);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        if (!isCancelled) {
          setComputedDraftHash(hashHex);
        }
      } catch (err) {
        console.warn('Draft hash error', err);
      }
    }
    calcHash();
    return () => {
      isCancelled = true;
    };
  }, [codeDraft, isEditingCode]);

  const diffA = useMemo(() => localVersions.find((v) => v.id === diffVersionAId), [localVersions, diffVersionAId]);
  const diffB = useMemo(() => localVersions.find((v) => v.id === diffVersionBId), [localVersions, diffVersionBId]);

  const diffLines = useMemo(() => {
    if (!diffA || !diffB) return [];
    return computeLineDiff(diffA.code, diffB.code);
  }, [diffA, diffB]);

  const nextLabelSuggestion = `v${localVersions.length + 1} - Normal`;

  function handleNewVersion() {
    setModalInitialCode('');
    setModalBaseVersionLabel('');
    setModalBaseVersionId('');
    setModalDefaultLabel(`v${localVersions.length + 1} - Normal`);
    setModalInitialSubVersion('normal');
    setIsAddVersionModalOpen(true);
  }

  function handleAddSubVersion(baseVersion: VersionItem) {
    const currentSv = versionSubTypes[baseVersion.id] || 'normal';
    const nextSv: EaSubVersionType =
      currentSv === 'normal'
        ? 'break_even'
        : currentSv === 'break_even'
          ? 'session_trading'
          : currentSv === 'session_trading'
            ? 'ranging'
            : currentSv === 'ranging'
              ? 'liquidity'
              : 'normal';

    const baseLabelClean = baseVersion.label.split(' - ')[0].trim();
    setModalInitialCode(baseVersion.code);
    setModalBaseVersionLabel(baseLabelClean);
    setModalBaseVersionId(baseVersion.id);
    setModalDefaultLabel(`${baseLabelClean} - ${EA_SUB_VERSIONS[nextSv].label}`);
    setModalInitialSubVersion(nextSv);
    setIsAddVersionModalOpen(true);
  }

  function startEditingCode() {
    if (!currentVersion) return;
    setCodeDraft(currentVersion.code);
    setNotesDraft(currentVersion.changeNotes || '');
    setComputedDraftHash(currentVersion.codeHash);
    setIsEditingCode(true);
  }

  function handleCancelEdit() {
    setIsEditingCode(false);
  }

  async function handleDeleteVersion() {
    if (!currentVersion) return;
    setIsDeletingVersion(true);
    try {
      const res = await deleteEaVersion({ versionId: currentVersion.id });
      if (!res.success) {
        toast.error(res.error || 'Failed to delete version');
        setIsDeletingVersion(false);
        return;
      }

      toast.success(`Version ${currentVersion.label} deleted successfully`);
      const remaining = localVersions.filter((v) => v.id !== currentVersion.id);
      setLocalVersions(remaining);
      setIsDeleteModalOpen(false);
      if (remaining.length > 0) {
        setSelectedVersionId(remaining[remaining.length - 1].id);
      } else {
        setSelectedVersionId('');
      }
      if (onVersionCreated) onVersionCreated();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting version');
    } finally {
      setIsDeletingVersion(false);
    }
  }

  async function handleSaveCode() {
    if (!currentVersion) return;
    const trimmed = codeDraft;
    if (!trimmed.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    setIsSavingCode(true);
    try {
      const res = await updateEaVersionCode({
        versionId: currentVersion.id,
        strategyId,
        code: trimmed,
        changeNotes: notesDraft.trim() || null,
      });

      if (!res.success || !res.version) {
        toast.error(res.error || 'Failed to update code');
        setIsSavingCode(false);
        return;
      }

      setLocalVersions((prev) =>
        prev.map((v) =>
          v.id === currentVersion.id
            ? {
              ...v,
              code: res.version.code,
              codeHash: res.version.codeHash,
              changeNotes: res.version.changeNotes,
            }
            : v
        )
      );

      setIsEditingCode(false);
      toast.success(`Source code for ${currentVersion.label} updated successfully!`);
      if (onVersionCreated) onVersionCreated();
    } catch (err: any) {
      toast.error(err.message || 'Error saving code');
    } finally {
      setIsSavingCode(false);
    }
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveCode();
      return;
    }

    // Tab key indentation (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';

      const nextVal = codeDraft.substring(0, start) + spaces + codeDraft.substring(end);
      setCodeDraft(nextVal);

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-400 text-lg">code</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">EA Source Versions (.mq5)</h3>
            <p className="text-xs text-zinc-400">
              {localVersions.length} code iteration{localVersions.length !== 1 ? 's' : ''} tracked with SHA-256 fingerprinting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Code Editor vs Flow Chart */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => {
                setViewMode('editor');
                setIsDiffMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'editor' && !isDiffMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">code</span>
              <span>Code Editor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('flowchart');
                setIsDiffMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'flowchart'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              <span>Flow Chart</span>
              {subVersionsCount > 0 && (
                <span className="text-[10px] bg-purple-400/20 text-purple-200 px-1.5 py-0.2 rounded-full font-mono">
                  {subVersionsCount}
                </span>
              )}
            </button>
          </div>

          {localVersions.length >= 2 && viewMode === 'editor' && (
            <button
              onClick={() => {
                setIsEditingCode(false);
                setIsDiffMode(!isDiffMode);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${isDiffMode
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-sm">difference</span>
              {isDiffMode ? 'Exit Diff View' : 'Compare Diff'}
            </button>
          )}

          <button
            onClick={handleNewVersion}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-1.5 shadow cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Version
          </button>
        </div>
      </div>

      {viewMode === 'flowchart' ? (
        <VersionFlowChart
          versions={localVersions}
          versionFinancialsMap={versionFinancialsMap}
          selectedVersionId={selectedVersionId}
          onSelectVersion={(vId) => {
            setSelectedVersionId(vId);
            setViewMode('editor');
          }}
          onAddSubVersion={(baseV) => {
            handleAddSubVersion(baseV);
          }}
          onNewVersion={handleNewVersion}
          onClose={() => setViewMode('editor')}
        />
      ) : isDiffMode ? (
        /* Diff Viewer */
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">compare_arrows</span>
              Code Diff Comparison
            </h4>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Base (A):</span>
                <select
                  value={diffVersionAId}
                  onChange={(e) => setDiffVersionAId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs"
                >
                  {localVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-zinc-500">→</span>

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Compare (B):</span>
                <select
                  value={diffVersionBId}
                  onChange={(e) => setDiffVersionBId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs"
                >
                  {localVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 font-mono text-xs select-text">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={`py-0.5 px-2 rounded ${line.type === 'added'
                    ? 'bg-emerald-950/60 text-emerald-300 font-medium'
                    : line.type === 'removed'
                      ? 'bg-rose-950/60 text-rose-300 line-through'
                      : 'text-zinc-400'
                  }`}
              >
                <span className="inline-block w-6 text-zinc-600 select-none text-right mr-3">
                  {idx + 1}
                </span>
                <span className="inline-block w-4 font-bold select-none">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span>{line.line}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Version Viewer & Code Editor */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Version List Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Code Iterations
              </span>
              {subVersionFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSubVersionFilter('all')}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Sub-version quick filter chips */}
            <div className="flex items-center gap-1 flex-wrap pb-1">
              <button
                type="button"
                onClick={() => setSubVersionFilter('all')}
                className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${subVersionFilter === 'all'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                All ({subVersionCounts.all})
              </button>
              {EA_SUB_VERSION_LIST.map((sv) => {
                const count = subVersionCounts[sv.id] || 0;
                const isSelected = subVersionFilter === sv.id;
                return (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => setSubVersionFilter(sv.id)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${isSelected
                        ? `${sv.bgColor} ${sv.borderColor} ${sv.textColor} ring-1 ${sv.activeRing}`
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[11px]">{sv.icon}</span>
                    <span>{sv.badgeLabel}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {filteredVersions.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-500 space-y-1">
                <p>No versions tagged as <strong>{EA_SUB_VERSIONS[subVersionFilter as EaSubVersionType]?.label}</strong>.</p>
                <button
                  type="button"
                  onClick={() => setSubVersionFilter('all')}
                  className="text-blue-400 text-xs hover:underline cursor-pointer"
                >
                  View all versions
                </button>
              </div>
            ) : (
              versionTree.map((node) => {
                const renderCard = (v: VersionItem, isSub = false) => {
                  const isSelected = v.id === currentVersion?.id;
                  const fin = versionFinancialsMap[v.id];
                  const sv = versionSubTypes[v.id];
                  const svConfig = EA_SUB_VERSIONS[sv];

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersionId(v.id)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all relative ${isSelected
                          ? 'bg-blue-600/10 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                          : isSub
                            ? 'bg-zinc-950/90 border-purple-900/40 hover:border-purple-600/60'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isSub && (
                            <span className="material-symbols-outlined text-[13px] text-purple-400 rotate-90 shrink-0">
                              subdirectory_arrow_right
                            </span>
                          )}
                          <span className="font-bold text-sm text-white truncate">{v.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {v.codeHash.slice(0, 8)}...
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionId(v.id);
                              setIsDeleteModalOpen(true);
                            }}
                            title={`Delete ${v.label}`}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-version badge */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${svConfig.bgColor} ${svConfig.borderColor} ${svConfig.textColor}`}>
                          <span className="material-symbols-outlined text-[11px]">{svConfig.icon}</span>
                          {svConfig.badgeLabel}
                        </span>
                      </div>

                      {/* Financial result badge */}
                      {fin && fin.hasRuns ? (
                        <div className="my-2 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                              Net P&L:
                            </span>
                            <span
                              className={`text-xs font-mono font-bold ${fin.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                              {fin.netProfit >= 0 ? `+$${fin.netProfit.toLocaleString()}` : `-$${Math.abs(fin.netProfit).toLocaleString()}`}
                              <span className="text-[10px] font-normal ml-1 text-zinc-400">
                                ({fin.returnPct >= 0 ? '+' : ''}{fin.returnPct}%)
                              </span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono pt-0.5 border-t border-zinc-800/60">
                            <div className="text-emerald-400 truncate">
                              Won: +${fin.grossProfit.toLocaleString()}
                            </div>
                            <div className="text-rose-400 truncate text-right">
                              Lost: -${fin.grossLoss.toLocaleString()}
                            </div>
                          </div>

                          <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between pt-0.5">
                            <span>{fin.runsCount} run{fin.runsCount !== 1 ? 's' : ''} • {fin.tradesCount} trd</span>
                            <span className="text-zinc-400">{fin.winRate}% win</span>
                          </div>
                        </div>
                      ) : (
                        <div className="my-1.5 py-1 px-2 rounded bg-zinc-900/40 border border-zinc-800/50 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          No backtests logged yet
                        </div>
                      )}

                      {v.changeNotes && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-snug">
                          {cleanSubVersionNotes(v.changeNotes)}
                        </p>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-2 font-mono flex items-center justify-between">
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                        <span className="text-zinc-600">
                          {v.code.split('\n').length} lines
                        </span>
                      </div>
                    </div>
                  );
                };

                return (
                  <div key={node.version.id} className="space-y-2">
                    {/* Parent Version Card */}
                    {renderCard(node.version, false)}

                    {/* Subversions branching directly under this parent */}
                    {node.subVersions.length > 0 && (
                      <div className="ml-3 pl-3 border-l-2 border-purple-500/40 space-y-2 pt-0.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-400/90 tracking-wide uppercase px-1">
                          <span className="material-symbols-outlined text-[12px]">fork_right</span>
                          <span>Sub-versions ({node.subVersions.length})</span>
                        </div>
                        {node.subVersions.map((subNode) => renderCard(subNode.version, true))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Main Code Viewer / Editor */}
          <div className="lg:col-span-3">
            {currentVersion ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{currentVersion.label}</span>
                      {(() => {
                        const sv = versionSubTypes[currentVersion.id];
                        const svConfig = EA_SUB_VERSIONS[sv];
                        return (
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${svConfig.bgColor} ${svConfig.borderColor} ${svConfig.textColor}`}>
                            <span className="material-symbols-outlined text-xs">{svConfig.icon}</span>
                            {svConfig.label}
                          </span>
                        );
                      })()}
                      <span className="text-xs text-zinc-400">• MetaTrader 5 Expert Advisor (.mq5)</span>
                      {isEditingCode && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          Editing Code
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      SHA-256: {isEditingCode ? computedDraftHash || currentVersion.codeHash : currentVersion.codeHash}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingCode ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingCode}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCode}
                          disabled={isSavingCode}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingCode ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">save</span>
                              Save Code Changes
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAddSubVersion(currentVersion)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 border border-blue-500/20 cursor-pointer shadow-sm"
                          title={`Create a new sub-version / variant branching from ${currentVersion.label}`}
                        >
                          <span className="material-symbols-outlined text-sm">alt_route</span>
                          + Sub-Version
                        </button>
                        <button
                          type="button"
                          onClick={startEditingCode}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Edit Code
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentVersion.code);
                            toast.success('Code copied to clipboard!');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5 border border-zinc-800 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 border border-rose-900/40 cursor-pointer"
                          title={`Delete ${currentVersion.label}`}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Financial Performance Strip for this Code Version */}
                {currentFin && currentFin.hasRuns ? (
                  <div className="p-4 bg-zinc-900/50 border-b border-zinc-800/80">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800/60">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-400">payments</span>
                        Performance Recorded by {currentVersion.label} ({currentFin.runsCount} Backtest Run{currentFin.runsCount !== 1 ? 's' : ''})
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {currentFin.tradesCount} executed trades • {currentFin.winCount}W / {currentFin.lossCount}L
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Net Result */}
                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                          <span>Net Result</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${currentFin.netProfit >= 0
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                              }`}
                          >
                            {currentFin.returnPct >= 0 ? '+' : ''}{currentFin.returnPct}%
                          </span>
                        </div>
                        <div
                          className={`text-lg font-bold font-mono mt-1 ${currentFin.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                          {currentFin.netProfit >= 0
                            ? `+$${currentFin.netProfit.toLocaleString()}`
                            : `-$${Math.abs(currentFin.netProfit).toLocaleString()}`}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Total Net P&L Made
                        </div>
                      </div>

                      {/* Total Won / Gains */}
                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">trending_up</span>
                          <span>Total Amount Won</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                          +${currentFin.grossProfit.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {currentFin.winCount} Winning Trades
                        </div>
                      </div>

                      {/* Total Lost / Losses */}
                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">trending_down</span>
                          <span>Total Amount Lost</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-rose-400 mt-1">
                          -${currentFin.grossLoss.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {currentFin.lossCount} Losing Trades
                        </div>
                      </div>

                      {/* Win Rate & Expectancy */}
                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                          <span>Win Rate & R</span>
                          <span className="text-[10px] font-mono text-blue-400">
                            {currentFin.profitFactor} PF
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">
                          {currentFin.winRate}%
                          <span className="text-xs font-normal text-zinc-400 ml-1.5">
                            ({currentFin.totalR > 0 ? '+' : ''}{currentFin.totalR}R)
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Expectancy / Return
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-zinc-900/30 border-b border-zinc-800/80 text-xs text-zinc-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-zinc-600">info</span>
                    <span>No backtest runs executed on <strong>{currentVersion.label}</strong> yet. Run backtests in MT5 and add the tester logs to see its financial performance.</span>
                  </div>
                )}

                {/* Change notes banner */}
                {!isEditingCode && currentVersion.changeNotes && (
                  <div className="px-4 py-2.5 bg-blue-950/20 border-b border-blue-900/30 text-xs text-blue-300/90 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-blue-400">info</span>
                    <span>{cleanSubVersionNotes(currentVersion.changeNotes)}</span>
                  </div>
                )}

                {/* Code Body / Editor */}
                {isEditingCode ? (
                  <div className="flex flex-col flex-1 bg-zinc-950 font-mono text-xs">
                    {/* Editor Top Bar Info */}
                    <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span>Lines: {codeDraft.split('\n').length}</span>
                        <span>•</span>
                        <span>Chars: {codeDraft.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span className="text-[10px]">Tip: Press Tab for 2 spaces • Ctrl+S to save</span>
                      </div>
                    </div>

                    {/* Interactive Editor with Gutter */}
                    <div className="flex p-4 max-h-[620px] min-h-[480px] overflow-auto select-text">
                      {/* Line numbers gutter */}
                      <div className="select-none text-right pr-4 text-zinc-600 font-mono text-xs border-r border-zinc-800/80 mr-4 shrink-0">
                        {codeDraft.split('\n').map((_, i) => (
                          <div key={i} className="leading-relaxed">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        value={codeDraft}
                        onChange={(e) => setCodeDraft(e.target.value)}
                        onKeyDown={handleEditorKeyDown}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        className="flex-1 w-full bg-transparent font-mono text-xs text-emerald-300 leading-relaxed resize-none focus:outline-none p-0 selection:bg-blue-600/30 whitespace-pre"
                        rows={Math.max(25, codeDraft.split('\n').length)}
                      />
                    </div>

                    {/* Editor Bottom Bar: Change Notes & Save */}
                    <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-3 justify-between">
                      <div className="w-full sm:flex-1">
                        <input
                          type="text"
                          placeholder="Optional change notes (e.g. Adjusted trailing stop distance, added spread filter)..."
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-sans"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingCode}
                          className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCode}
                          disabled={isSavingCode}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingCode ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">check</span>
                              Save Code Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-950 font-mono text-xs overflow-x-auto max-h-[600px] select-text">
                    <div className="flex">
                      {/* Line numbers */}
                      <div className="select-none text-right pr-4 text-zinc-600 font-mono text-xs border-r border-zinc-800/80 mr-4">
                        {currentVersion.code.split('\n').map((_, i) => (
                          <div key={i} className="leading-relaxed">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Syntax Highlighted Lines */}
                      <div className="flex-1 text-zinc-300">
                        {highlightMql5(currentVersion.code)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-400 text-xs space-y-3">
                <span className="material-symbols-outlined text-3xl text-zinc-600">code_blocks</span>
                <p>No versions uploaded for this strategy yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAddVersionModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors inline-flex items-center gap-1.5 shadow"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Initial Version
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Version Modal */}
      <AddVersionModal
        isOpen={isAddVersionModalOpen}
        onClose={() => setIsAddVersionModalOpen(false)}
        strategyId={strategyId}
        strategyName={strategyName}
        defaultLabel={modalDefaultLabel || nextLabelSuggestion}
        existingHashes={localVersions.map((v) => ({ label: v.label, codeHash: v.codeHash }))}
        initialCode={modalInitialCode}
        initialSubVersion={modalInitialSubVersion}
        baseVersionLabel={modalBaseVersionLabel}
        baseVersionId={modalBaseVersionId}
        availableVersions={localVersions.map((v) => ({ id: v.id, label: v.label }))}
        onCreated={() => {
          if (onVersionCreated) onVersionCreated();
          window.location.reload();
        }}
      />

      {/* Delete Version Confirmation Modal */}
      {isDeleteModalOpen && currentVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-rose-400 text-xl">delete_forever</span>
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-white">Delete Code Version</h3>
                <p className="text-xs text-zinc-400">
                  Are you sure you want to delete <span className="text-white font-semibold">{currentVersion.label}</span>?
                </p>
              </div>
            </div>

            {currentFin && currentFin.hasRuns ? (
              <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>Associated Backtests Found</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  This version has <strong>{currentFin.runsCount} backtest run{currentFin.runsCount !== 1 ? 's' : ''}</strong> and <strong>{currentFin.tradesCount} executed trade{currentFin.tradesCount !== 1 ? 's' : ''}</strong> linked to it. Deleting this code version will also permanently remove those backtest runs.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400">
                This action cannot be undone. All source code and metadata for this version will be permanently removed.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingVersion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVersion}
                disabled={isDeletingVersion}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingVersion ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
