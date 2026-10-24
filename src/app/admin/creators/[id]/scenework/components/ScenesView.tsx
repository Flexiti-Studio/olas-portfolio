import { useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useSceneworkStore } from '../store/useSceneworkStore';
import { TEMPLATES } from '../config/templates';
import { StoryNode } from './nodes/StoryNode';
import { TemplateNode } from './nodes/TemplateNode';
import { BriefNode } from './nodes/BriefNode';
import { SceneNode } from './nodes/SceneNode';
import { FinalCutNode } from './nodes/FinalCutNode';
import { SceneDialog } from './dialogs/SceneDialog';
import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { generateScenesAction } from '../actions/generateScenes';

const nodeTypes = {
  storyNode: StoryNode,
  templateNode: TemplateNode,
  briefNode: BriefNode,
  sceneNode: SceneNode,
  finalCutNode: FinalCutNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 300;
  const nodeHeight = 200;

  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? 'left' as any : 'top' as any;
    node.sourcePosition = direction === 'LR' ? 'right' as any : 'bottom' as any;

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

export default function ScenesView() {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  const {
    story, templateId, formatId, scenes,
    nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, setScenes
  } = useSceneworkStore();

  const [isRebuilding, setIsRebuilding] = useState(false);

  const staleScenesCount = scenes.filter(s => s.status === 'stale').length;

  const handleRebuildStale = async () => {
    setIsRebuilding(true);
    try {
      const newScenesData = await generateScenesAction({ story, templateId });

      const newScenes = scenes.map(s => {
        if (!s.locked && s.status === 'stale') {
          // If we had a matching newly generated scene (e.g. by index), we could pull its properties
          // For now, we will just completely replace the unlocked ones with the new generation
          return null;
        }
        return s;
      }).filter(Boolean) as any[];

      // This is a naive rebuild for demo: we just re-merge the locked ones and inject new ones.
      // In a real app, we'd weave them together by beat or order.
      // Since the user asked: "Rebuild regenerates unlocked scenes and keeps locked ones at the same position",
      // Let's replace the whole array but carry over the locked ones by index.
      const mergedScenes = newScenesData.map((ns, i): typeof scenes[number] => {
        const existingLocked = scenes.find(s => s.order === i && s.locked);
        if (existingLocked) return existingLocked;
        return {
          ...ns,
          pace: ns.pace === 'Slow' || ns.pace === 'Normal' || ns.pace === 'Fast' ? ns.pace : 'Normal',
          mode: ns.mode === 'video' || ns.mode === 'image' ? ns.mode : 'video',
          status: ns.status ?? 'ready',
          locked: Boolean(ns.locked),
          version: typeof ns.version === 'number' ? ns.version : 1,
          clipSec: typeof ns.clipSec === 'number' ? ns.clipSec : 0,
        };
      });

      setScenes(mergedScenes as typeof scenes);
    } catch (err) {
      console.error(err);
      alert("Failed to rebuild scenes.");
    } finally {
      setIsRebuilding(false);
    }
  };

  useEffect(() => {
    // We should ideally have the template data in the store, but we can fetch it briefly for the node display
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/video-templates/${templateId}`);
        const data = await res.json();
        const template = data.template;

        if (!template) return;

        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        // 1. Story Node
        initialNodes.push({
          id: 'story',
          type: 'storyNode',
          position: { x: 0, y: 0 },
          data: {
            storySnippet: story,
            wordCount: story.split(/\s+/).length,
          }
        });

        // 2. Template Node
        initialNodes.push({
          id: 'template',
          type: 'templateNode',
          position: { x: 0, y: 0 },
          data: {
            templateName: template.name,
            beats: template.data.structure.map((b: any) => b.name),
          }
        });

        // 3. Brief Node
        initialNodes.push({
          id: 'brief',
          type: 'briefNode',
          position: { x: 0, y: 0 },
          data: {
            format: template.data.format || '16:9',
            sceneCount: scenes.length,
            persona: template.data.voice.persona,
          }
        });

        // Edges into Brief
        initialEdges.push({ id: 'e-story-brief', source: 'story', target: 'brief', type: 'smoothstep', animated: true });
        initialEdges.push({ id: 'e-template-brief', source: 'template', target: 'brief', type: 'smoothstep', animated: true });

        // 4. Scene Nodes
        scenes.forEach((scene, i) => {
          initialNodes.push({
            id: scene.id,
            type: 'sceneNode',
            position: { x: 0, y: 0 },
            data: { scene }
          });

          initialEdges.push({
            id: `e-brief-${scene.id}`,
            source: 'brief',
            target: scene.id,
            type: 'smoothstep',
            style: { stroke: '#6366f1' }
          });

          // Edge from scene to final cut
          initialEdges.push({
            id: `e-${scene.id}-final`,
            source: scene.id,
            target: 'finalCut',
            type: 'smoothstep',
            style: { stroke: scene.status === 'stale' ? '#f59e0b' : '#cbd5e1', strokeDasharray: scene.status === 'stale' ? '5,5' : 'none' }
          });
        });

        // 5. Final Cut Node
        const runtime = scenes.reduce((acc, s) => acc + s.clipSec, 0);
        const staleCount = scenes.filter(s => s.status === 'stale').length;

        initialNodes.push({
          id: 'finalCut',
          type: 'finalCutNode',
          position: { x: 0, y: 0 },
          data: {
            sceneCount: scenes.length,
            runtime,
            staleCount,
          }
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (err) {
        console.error("Error fetching template for DAG:", err);
      }
    };

    fetchTemplate();
  }, [scenes, story, templateId, formatId, setNodes, setEdges]);

  return (
    <div className="w-full h-[800px] border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 relative">
      {staleScenesCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-50 border-2 border-amber-400 text-amber-800 px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/10 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-sm">Template changed. {staleScenesCount} scenes are out of date.</span>
          <button
            onClick={handleRebuildStale}
            disabled={isRebuilding}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {isRebuilding ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Rebuild scenes"}
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.type === 'sceneNode') setSelectedSceneId(node.id);
        }}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#334155" gap={16} />
        <Controls />
        <MiniMap zoomable pannable nodeColor={(n) => {
          if (n.type === 'sceneNode') return '#e2e8f0';
          if (n.type === 'briefNode' || n.type === 'finalCutNode') return '#0f172a';
          return '#ffffff';
        }} />
      </ReactFlow>

      {selectedSceneId && (
        <SceneDialog
          sceneId={selectedSceneId}
          onClose={() => setSelectedSceneId(null)}
          onNavigate={(id) => setSelectedSceneId(id)}
        />
      )}
    </div>
  );
}
