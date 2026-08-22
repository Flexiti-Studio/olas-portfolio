import { useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FocusTaskItem } from "./FocusTaskItem";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { toast } from "sonner";

export function FocusedProjectCard({ project, onProjectUpdate, onProjectComplete }: { project: any, onProjectUpdate: () => void, onProjectComplete: () => void }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTask, setLoadingTask] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t: any) => t.done).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const activeTasks = project.tasks.filter((t: any) => !t.done) || [];
  const completedTasks = project.tasks.filter((t: any) => t.done) || [];

  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    // Kept for completion fallback, but usually FocusTaskItem handles its own toggle
    onProjectUpdate();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/focus/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId: project.id, 
          title: newTaskTitle,
          order: project.tasks ? project.tasks.length : 0 
        })
      });
      if (res.ok) {
        setNewTaskTitle("");
        onProjectUpdate();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/focus/projects/${project.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        toast.success("Project deleted");
        onProjectUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    if (result.type === "subtask") {
      const taskId = result.source.droppableId.replace('subtasks-', '');
      const task = activeTasks.find((t: any) => t.id === taskId);
      if (!task) return;

      const taskActiveSubtasks = (task.subtasks || []).filter((s: any) => !s.done);
      const taskCompletedSubtasks = (task.subtasks || []).filter((s: any) => s.done);

      const reorderedActive = Array.from(taskActiveSubtasks);
      const [movedSubtask] = reorderedActive.splice(result.source.index, 1);
      reorderedActive.splice(result.destination.index, 0, movedSubtask);

      const subIds = [...reorderedActive.map((s: any) => s.id), ...taskCompletedSubtasks.map((s: any) => s.id)];

      try {
        await fetch("/api/focus/subtasks/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subtaskIds: subIds })
        });
        onProjectUpdate();
      } catch (e) {
        console.error(e);
        onProjectUpdate();
      }
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    const reorderedActive = Array.from(activeTasks);
    const [movedTask] = reorderedActive.splice(sourceIndex, 1);
    reorderedActive.splice(destinationIndex, 0, movedTask);

    const activeIds = reorderedActive.map((t: any) => t.id);
    const completedIds = completedTasks.map((t: any) => t.id);

    try {
      // Optimistically we could update local state, but since we rely on `onProjectUpdate` to fetch
      // we'll just fire the request and refetch. A slight delay is acceptable here, or we'd need to lift state.
      await fetch("/api/focus/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...activeIds, ...completedIds] })
      });
      onProjectUpdate();
    } catch (e) {
      console.error(e);
      onProjectUpdate();
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
        <div className="text-right flex items-start gap-4">
          <div>
            <div className="text-3xl font-black text-white">{progressPercent}%</div>
            <div className="text-sm text-slate-500">{doneTasks} of {totalTasks} done</div>
          </div>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
            title="Delete Project"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2.5 mb-8">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="space-y-4">
        {activeTasks.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`droppable-main-${project.id}`}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {activeTasks.map((task: any, index: number) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <FocusTaskItem 
                          task={task} 
                          index={index} 
                          onUpdate={onProjectUpdate} 
                          provided={provided}
                          snapshot={snapshot}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <p className="text-slate-500 text-sm italic">No active tasks.</p>
        )}

        <form onSubmit={handleAddTask} className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
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

        {completedTasks.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-800 pt-6">Completed Tasks</h4>
            <div className="space-y-2 opacity-70 hover:opacity-100 transition-opacity">
              {completedTasks.map((task: any) => (
                <FocusTaskItem 
                  key={task.id}
                  task={task} 
                  isCompleted={true}
                  onUpdate={onProjectUpdate} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal 
        isOpen={showDeleteConfirm}
        title={project.name}
        isDeleting={isDeletingProject}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
