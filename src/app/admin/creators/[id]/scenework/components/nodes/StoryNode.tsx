import { Handle, Position } from '@xyflow/react';
import { useSceneworkStore } from '../../store/useSceneworkStore';

export function StoryNode({ data }: { data: any }) {
  const { setView } = useSceneworkStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm min-w-[180px] max-w-[200px]">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Story</div>
      <p className="text-xs font-serif line-clamp-2 text-slate-300 mb-2 leading-snug">{data.storySnippet}</p>
      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
        <span>{data.wordCount} words</span>
      </div>
      <button 
        onClick={() => setView('story')}
        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg text-sm font-medium transition-colors"
      >
        Edit Story
      </button>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500" />
    </div>
  );
}
