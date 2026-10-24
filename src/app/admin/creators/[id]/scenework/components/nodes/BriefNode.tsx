import { Handle, Position } from '@xyflow/react';

export function BriefNode({ data }: { data: any }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl min-w-[220px] text-slate-300">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-700" />
      <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Master Brief</div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="text-slate-500">Format</span>
          <span className="font-medium text-white">{data.format}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="text-slate-500">Scenes</span>
          <span className="font-medium text-white">{data.sceneCount}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="text-slate-500">Voice</span>
          <span className="font-medium text-white">{data.persona}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500" />
    </div>
  );
}
