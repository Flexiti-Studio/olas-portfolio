import { PlayCircle } from "lucide-react";

export function ProjectQueueList({ projects, onSwitchFocus, isFocusedEmpty }: { projects: any[], onSwitchFocus: (id: string) => void, isFocusedEmpty: boolean }) {
  if (projects.length === 0) {
    return <div className="text-slate-500 text-sm">No projects in queue.</div>;
  }

  return (
    <div className={`flex ${isFocusedEmpty ? 'flex-row flex-wrap gap-4' : 'flex-col space-y-3'}`}>
      {projects.map((project: any) => (
        <div 
          key={project.id} 
          className={`bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between ${isFocusedEmpty ? 'w-full sm:w-[calc(50%-8px)]' : ''}`}
        >
          <div>
            <h3 className="font-medium text-slate-200">{project.name}</h3>
            <p className="text-sm text-slate-500">
              {project._count.tasks} open task{project._count.tasks === 1 ? '' : 's'}
            </p>
          </div>
          <button 
            onClick={() => onSwitchFocus(project.id)}
            className="text-slate-400 hover:text-blue-500 transition-colors p-2"
            title="Focus this project"
          >
            <PlayCircle className="w-6 h-6" />
          </button>
        </div>
      ))}
    </div>
  );
}
