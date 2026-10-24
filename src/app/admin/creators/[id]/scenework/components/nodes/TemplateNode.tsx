import { Handle, Position } from '@xyflow/react';

export function TemplateNode({ data }: { data: any }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-600" />
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template</div>
      <div className="font-bold text-slate-300 mb-3">{data.templateName}</div>
      <div className="flex flex-wrap gap-1">
        {data.beats?.map((beat: string, i: number) => (
          <span key={i} className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            {beat}
          </span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500" />
    </div>
  );
}
