import { Handle, Position } from '@xyflow/react';
import { Lock, Image as ImageIcon, Video } from 'lucide-react';

export function SceneNode({ data }: { data: any }) {
  const { scene } = data;
  const isOutdated = scene.status === 'stale';

  return (
    <div className={`bg-slate-900 rounded-xl shadow-sm min-w-[260px] overflow-hidden transition-all ${
      isOutdated ? 'border-2 border-amber-500 shadow-amber-500/20' : 'border border-slate-800'
    }`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-600" />
      
      {/* Thumbnail placeholder */}
      <div className="h-28 bg-gradient-to-br from-indigo-950 to-slate-900 flex items-center justify-center relative border-b border-slate-800">
        <span className="text-4xl font-black text-indigo-500/10">{scene.order + 1}</span>
        {scene.locked && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 backdrop-blur flex items-center justify-center">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          {scene.role}
          {isOutdated && <span className="text-[10px] bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/50">Outdated</span>}
        </div>
        
        <p className="text-sm text-slate-300 line-clamp-2 italic mb-4 font-serif">"{scene.script}"</p>
        
        <div className="flex justify-between items-center pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            {scene.mode === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {scene.clipSec}s
          </div>
          
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
            scene.status === 'ready' ? 'bg-slate-800 text-slate-400' :
            scene.status === 'edited' ? 'bg-indigo-900/50 text-indigo-400' :
            scene.status === 'done' ? 'bg-emerald-900/50 text-emerald-400' :
            scene.status === 'stale' ? 'bg-amber-900/50 text-amber-400' :
            'bg-slate-800 text-slate-400'
          }`}>
            {scene.status}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500" />
    </div>
  );
}
