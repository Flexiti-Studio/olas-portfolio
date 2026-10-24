import { Handle, Position } from '@xyflow/react';
import { Copy } from 'lucide-react';

export function FinalCutNode({ data }: { data: any }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl min-w-[200px] text-center">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-700" />
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Final Cut</div>
      
      <div className="text-3xl font-black text-white mb-1">{data.sceneCount}</div>
      <div className="text-sm text-slate-500 mb-6">Total Scenes • {data.runtime}s runtime</div>
      
      {data.staleCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-1.5 rounded-lg mb-4 font-medium">
          {data.staleCount} scenes out of date
        </div>
      )}

      <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold transition-colors">
        <Copy className="w-4 h-4" /> Copy all prompts
      </button>
    </div>
  );
}
