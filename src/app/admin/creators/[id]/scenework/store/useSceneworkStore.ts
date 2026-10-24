import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';

export type Scene = {
  id: string;
  order: number;
  role: string;            // beat name from the template
  beat: string;            // source text from the story (single source of truth)
  script: string;          // voiceover, derived from beat
  mode: 'video' | 'image';
  shot: string;
  camera: string;
  visualPrompt: string;
  negativePrompt: string;
  persona: string;
  tone: string;
  pace: 'Slow' | 'Normal' | 'Fast';
  soundCue?: string;
  clipSec: number;
  locked: boolean;
  status: 'ready' | 'edited' | 'stale' | 'generating' | 'done' | 'error';
  version: number;
  templateId?: string;
  templateVersion?: number;
  assetUrl?: string;
};

interface SceneworkState {
  story: string;
  setStory: (story: string) => void;
  templateId: string;
  setTemplateId: (id: string) => void;
  formatId: string;
  setFormatId: (id: string) => void;
  
  view: 'story' | 'scenes';
  setView: (view: 'story' | 'scenes') => void;

  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  scenes: Scene[];
  setScenes: (scenes: Scene[]) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
}

export const useSceneworkStore = create<SceneworkState>((set) => ({
  story: "",
  setStory: (story) => set((state) => {
    if (state.story === story) return {};
    const newScenes = state.scenes.map(s => s.locked ? s : { ...s, status: 'stale' as const });
    return { story, scenes: newScenes };
  }),
  templateId: "explainer",
  setTemplateId: (templateId) => set((state) => {
    if (state.templateId === templateId) return {};
    const newScenes = state.scenes.map(s => s.locked ? s : { ...s, status: 'stale' as const });
    return { templateId, scenes: newScenes };
  }),
  formatId: "16:9",
  setFormatId: (formatId) => set((state) => {
    if (state.formatId === formatId) return {};
    const newScenes = state.scenes.map(s => s.locked ? s : { ...s, status: 'stale' as const });
    return { formatId, scenes: newScenes };
  }),
  
  view: 'story',
  setView: (view) => set({ view }),

  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  scenes: [],
  setScenes: (scenes) => set({ scenes }),
  updateScene: (id, updates) => set((state) => ({
    scenes: state.scenes.map(s => s.id === id ? { ...s, ...updates, version: s.version + 1 } : s)
  })),
}));
