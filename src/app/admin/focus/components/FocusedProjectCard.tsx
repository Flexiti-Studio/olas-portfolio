import { useState } from "react";
import { CheckCircle2, Circle, Plus, Loader2 } from "lucide-react";

export function FocusedProjectCard({ project, onProjectUpdate, onProjectComplete }: { project: any, onProjectUpdate: () => void, onProjectComplete: () => void }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTask, setLoadingTask] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t: any) => t.done).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    setLoadingTask(taskId);
    try {
      const res = await fetch(`/api/focus/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !currentDone })
      });
      const json = await res.json();
      if (json.success) {
        if (json.data.projectCompleted) {
          onProjectComplete();
        } else {
          onProjectUpdate();
        }
      }
    } finally {
      setLoadingTask(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/focus/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, title: newTaskTitle })
      });
      if (res.ok) {
        setNewTaskTitle("");
        onProjectUpdate();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-blue-500 animate-pulse">▶</span> {project.name}
          </h2>
          {project.description && (
            <p className="text-slate-400 mt-2">{project.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white">{progressPercent}%</div>
          <div className="text-sm text-slate-500">{doneTasks} of {totalTasks} done</div>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2.5 mb-8">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="space-y-2">
        {project.tasks.map((task: any) => (
          <div 
            key={task.id} 
            className={`flex items-center gap-3 p-3 rounded-lg border ${task.done ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-800 border-slate-700'} transition-colors`}
          >
            <button 
              onClick={() => handleToggleTask(task.id, task.done)}
              disabled={loadingTask === task.id}
              className="text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
            >
              {loadingTask === task.id ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              ) : task.done ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
            <span className={`flex-1 ${task.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {task.title}
            </span>
          </div>
        ))}

        <form onSubmit={handleAddTask} className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..." 
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit" 
            disabled={!newTaskTitle.trim() || creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
