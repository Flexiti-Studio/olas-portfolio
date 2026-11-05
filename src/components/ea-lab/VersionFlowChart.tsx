"use client";

import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Node,
  Edge,
  Position,
  Handle,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import dagre from 'dagre';
import {
  EaSubVersionType,
  EA_SUB_VERSIONS,
  detectSubVersion,
  findParentVersion,
  cleanSubVersionNotes,
} from '@/lib/ea-lab/subVersions';
import { VersionItem, VersionFinancials } from './CodeTab';

export interface VersionNodeData extends Record<string, unknown> {
  version: VersionItem;
  financials?: VersionFinancials;
  subType: EaSubVersionType;
  parentLabel?: string | null;
  isSelected?: boolean;
  onSelectVersion: (versionId: string) => void;
  onAddSubVersion: (version: VersionItem) => void;
}

// Custom Node for React Flow
function VersionNode({ data }: { data: VersionNodeData }) {
  const { version, financials, subType, parentLabel, isSelected, onSelectVersion, onAddSubVersion } = data;
  const svConfig = EA_SUB_VERSIONS[subType];
  const isSub = Boolean(parentLabel);

  return (
    <div
      onClick={() => onSelectVersion(version.id)}
      className={`w-72 rounded-2xl border transition-all shadow-xl backdrop-blur-md cursor-pointer select-none text-left relative overflow-hidden group ${isSelected
        ? 'bg-blue-950/80 border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/40'
        : isSub
          ? 'bg-zinc-950/95 border-purple-800/60 hover:border-purple-600 shadow-purple-950/30'
          : 'bg-zinc-950/95 border-zinc-800 hover:border-zinc-700'
        }`}
    >
      {/* Target Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-zinc-900 -ml-1.5"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-zinc-900 -mt-1.5"
      />

      {/* Top Accent Strip */}
      <div
        className={`h-1.5 w-full ${isSub ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'
          }`}
      />

      <div className="p-3.5 space-y-2.5">
        {/* Header: Label, Code Hash & Subversion Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-base text-white font-mono tracking-tight">
                {version.label}
              </span>
              {isSub && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  ↳ of {parentLabel}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Hash: {version.codeHash.slice(0, 8)}... · {version.code.split('\n').length} lines
            </div>
          </div>

          {/* Subversion regime badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${svConfig.bgColor} ${svConfig.borderColor} ${svConfig.textColor}`}
          >
            <span className="material-symbols-outlined text-[11px]">{svConfig.icon}</span>
            {svConfig.badgeLabel}
          </span>
        </div>

        {/* Financial Backtest Metrics Summary */}
        {financials && financials.hasRuns ? (
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-sans">Net P&amp;L:</span>
              <span
                className={`font-bold ${financials.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
              >
                {financials.netProfit >= 0 ? `+$${financials.netProfit.toLocaleString()}` : `-$${Math.abs(financials.netProfit).toLocaleString()}`}
                <span className="text-[10px] text-zinc-400 ml-1 font-normal">
                  ({financials.returnPct >= 0 ? '+' : ''}{financials.returnPct}%)
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
              <div>
                <span>Win Rate: </span>
                <strong className={financials.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                  {financials.winRate}%
                </strong>
              </div>
              <div className="text-right">
                <span>Runs / Trd: </span>
                <strong className="text-zinc-200">
                  {financials.runsCount} / {financials.tradesCount}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-1.5 px-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
            <span>No tester runs logged yet</span>
          </div>
        )}

        {/* Change Notes preview */}
        {version.changeNotes && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {cleanSubVersionNotes(version.changeNotes)}
          </p>
        )}

        {/* Quick Node Actions */}
        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectVersion(version.id);
            }}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-xs">visibility</span>
            Inspect Code
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddSubVersion(version);
            }}
            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded bg-purple-950/50 hover:bg-purple-950 border border-purple-800/50"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            + Sub-Version
          </button>
        </div>
      </div>

      {/* Source Connection Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-zinc-900 -mr-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-zinc-900 -mb-1.5"
      />
    </div>
  );
}

const nodeTypes = {
  versionNode: VersionNode,
};

interface VersionFlowChartProps {
  versions: VersionItem[];
  versionFinancialsMap: Record<string, VersionFinancials>;
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onAddSubVersion: (baseVersion: VersionItem) => void;
  onNewVersion: () => void;
  onClose: () => void;
}

export function VersionFlowChart({
  versions,
  versionFinancialsMap,
  selectedVersionId,
  onSelectVersion,
  onAddSubVersion,
  onNewVersion,
  onClose,
}: VersionFlowChartProps) {
  const [direction, setDirection] = React.useState<'LR' | 'TB'>('LR');
  const [filterType, setFilterType] = React.useState<'all' | EaSubVersionType>('all');

  // Compute Dagre hierarchical layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 300;
    const nodeHeight = 220;
    dagreGraph.setGraph({
      rankdir: direction,
      ranksep: direction === 'LR' ? 90 : 80,
      nodesep: direction === 'LR' ? 50 : 60,
    });

    // 1. Identify parents and map types
    const parentMap = new Map<string, VersionItem | null>();
    versions.forEach((v) => {
      const parent = findParentVersion(v, versions);
      parentMap.set(v.id, parent);
    });

    // 2. Filter versions if a subversion filter is active
    const activeVersions = versions.filter((v) => {
      if (filterType === 'all') return true;
      const subType = detectSubVersion(v);
      return subType === filterType;
    });

    // Register nodes into Dagre
    activeVersions.forEach((v) => {
      dagreGraph.setNode(v.id, { width: nodeWidth, height: nodeHeight });
    });

    const edges: Edge[] = [];

    // Helper: connect sequential root versions so major versions form the main branch
    const rootVersions = activeVersions.filter((v) => !parentMap.get(v.id));
    for (let i = 0; i < rootVersions.length - 1; i++) {
      const source = rootVersions[i];
      const target = rootVersions[i + 1];
      const edgeId = `edge-root-${source.id}-${target.id}`;
      edges.push({
        id: edgeId,
        source: source.id,
        target: target.id,
        sourceHandle: direction === 'LR' ? 'right' : 'bottom',
        targetHandle: direction === 'LR' ? 'left' : 'top',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#3b82f6', strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
        label: 'Major Evolution',
        labelStyle: { fill: '#93c5fd', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#172554', fillOpacity: 0.9, rx: 4, ry: 4 },
      });
      dagreGraph.setEdge(source.id, target.id);
    }

    // Connect subversions to their parent
    activeVersions.forEach((v) => {
      const parent = parentMap.get(v.id);
      if (parent && activeVersions.some((av) => av.id === parent.id)) {
        const subType = detectSubVersion(v);
        const svConfig = EA_SUB_VERSIONS[subType];
        const edgeId = `edge-sub-${parent.id}-${v.id}`;
        edges.push({
          id: edgeId,
          source: parent.id,
          target: v.id,
          sourceHandle: direction === 'LR' ? 'right' : 'bottom',
          targetHandle: direction === 'LR' ? 'left' : 'top',
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '4 4' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#a855f7',
          },
          label: `↳ ${svConfig.label}`,
          labelStyle: { fill: '#d8b4fe', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 },
          labelBgStyle: { fill: '#3b0764', fillOpacity: 0.9, rx: 4, ry: 4 },
        });
        dagreGraph.setEdge(parent.id, v.id);
      }
    });

    dagre.layout(dagreGraph);

    // Build positioned ReactFlow nodes
    const nodes: Node<VersionNodeData>[] = activeVersions.map((v) => {
      const nodeLayout = dagreGraph.node(v.id) || { x: 0, y: 0 };
      const subType = detectSubVersion(v);
      const parent = parentMap.get(v.id);

      return {
        id: v.id,
        type: 'versionNode',
        position: {
          x: nodeLayout.x - nodeWidth / 2,
          y: nodeLayout.y - nodeHeight / 2,
        },
        data: {
          version: v,
          financials: versionFinancialsMap[v.id],
          subType,
          parentLabel: parent?.label || null,
          isSelected: v.id === selectedVersionId,
          onSelectVersion,
          onAddSubVersion,
        },
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [versions, versionFinancialsMap, selectedVersionId, direction, filterType, onSelectVersion, onAddSubVersion]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<VersionNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges whenever initialNodes/initialEdges recomputes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const subVersionsCount = useMemo(() => {
    return versions.filter((v) => Boolean(findParentVersion(v, versions))).length;
  }, [versions]);

  return (
    <div className="w-full h-[680px] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="p-3.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-purple-400 text-lg">schema</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">EA Version Lineage Flow Chart</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                {versions.length} Total Versions
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                {subVersionsCount} Sub-Branches
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Interactive visual map of major code releases and their sub-variations (Break Even, Sessions, Chop filters).
            </p>
          </div>
        </div>

        {/* Flow Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Direction toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setDirection('LR')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${direction === 'LR' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              title="Horizontal Left-to-Right layout"
            >
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
              Left → Right
            </button>
            <button
              type="button"
              onClick={() => setDirection('TB')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${direction === 'TB' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              title="Vertical Top-to-Bottom layout"
            >
              <span className="material-symbols-outlined text-xs">arrow_downward</span>
              Top → Bottom
            </button>
          </div>

          {/* New Version Action */}
          <button
            type="button"
            onClick={onNewVersion}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Version
          </button>

          {/* Exit Flow Chart / Back to Editor */}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-900/30"
          >
            <span className="material-symbols-outlined text-sm">code</span>
            Code Editor
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          attributionPosition="bottom-right"
          className="bg-zinc-950"
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl !overflow-hidden [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300 hover:[&>button]:!bg-zinc-800 hover:[&>button]:!text-white"
          />
          <MiniMap
            nodeColor={(n) => {
              const nodeData = n.data as unknown as VersionNodeData;
              if (nodeData?.parentLabel) return '#a855f7';
              return '#3b82f6';
            }}
            maskColor="rgba(9, 9, 11, 0.75)"
            className="!bg-zinc-900 !border-zinc-800 !rounded-xl !overflow-hidden"
          />

          {/* Legend Panel */}
          <Panel position="bottom-left" className="!m-4">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1.5 shadow-lg backdrop-blur-md">
              <div className="font-sans font-bold text-xs text-white mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-blue-400">info</span>
                Lineage Guide
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" />
                <span>Solid blue arrow: Major version evolution</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-purple-500 border-t border-dashed border-purple-400 inline-block" />
                <span>Dashed purple arrow: Sub-version branch</span>
              </div>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                Click any version card to inspect source code.
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
