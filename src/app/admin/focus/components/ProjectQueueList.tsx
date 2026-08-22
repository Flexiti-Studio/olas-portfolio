import { useState, useEffect } from "react";
import { PlayCircle, X, Loader2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FocusTaskItem } from "./FocusTaskItem";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { toast } from "sonner";

export function ProjectQueueList({ projects, onSwitchFocus, isFocusedEmpty, onProjectUpdate }: { projects: any[], onSwitchFocus: (id: string) => void, isFocusedEmpty: boolean, onProjectUpdate?: () => void }) {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [loadingTask, setLoadingTask] = useState<string | null>(null);

  // Keep selected project in sync when projects prop updates
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;

    setCreating(true);
    try {
      const res = await fetch("/api/focus/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId: selectedProject.id, 
          title: newTaskTitle,
          order: selectedProject.tasks ? selectedProject.tasks.length : 0
        })
      });
      if (res.ok) {
        setNewTaskTitle("");
        if (onProjectUpdate) onProjectUpdate();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/focus/projects/${selectedProject.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedProject(null);
        toast.success("Project deleted");
        if (onProjectUpdate) onProjectUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    // Handled in FocusTaskItem now
    if (onProjectUpdate) onProjectUpdate();
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    if (result.type === "subtask") {
      const taskId = result.source.droppableId.replace('subtasks-', '');
      const task = (selectedProject.tasks || []).find((t: any) => t.id === taskId);
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
        if (onProjectUpdate) onProjectUpdate();
      } catch (e) {
        console.error(e);
        if (onProjectUpdate) onProjectUpdate();
      }
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // We only reorder active tasks
    const activeTasks = (selectedProject.tasks || []).filter((t: any) => !t.done);
    const completedTasks = (selectedProject.tasks || []).filter((t: any) => t.done);
    
    const reorderedActive = Array.from(activeTasks);
    const [movedTask] = reorderedActive.splice(sourceIndex, 1);
    reorderedActive.splice(destinationIndex, 0, movedTask);

    // Optimistic UI update
    setSelectedProject({
      ...selectedProject,
      tasks: [...reorderedActive, ...completedTasks]
    });

    const activeIds = reorderedActive.map((t: any) => t.id);
    const completedIds = completedTasks.map((t: any) => t.id);

    try {
      await fetch("/api/focus/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...activeIds, ...completedIds] })
      });
      if (onProjectUpdate) onProjectUpdate();
    } catch (e) {
      console.error(e);
      // Let it refetch normally to revert if it failed
      if (onProjectUpdate) onProjectUpdate();
    }
  };

  if (projects.length === 0) {
    return <div className="text-slate-500 text-sm">No projects in queue.</div>;
  }

  const activeTasks = selectedProject?.tasks?.filter((t: any) => !t.done) || [];
  const completedTasks = selectedProject?.tasks?.filter((t: any) => t.done) || [];

  return (
    <>
      <div className={`flex ${isFocusedEmpty ? 'flex-row flex-wrap gap-4' : 'flex-col space-y-3'}`}>
        {projects.map((project: any) => (
          <div 
            key={project.id} 
            onClick={() => setSelectedProject(project)}
            className={`bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors ${isFocusedEmpty ? 'w-full sm:w-[calc(50%-8px)]' : ''}`}
          >
            <div>
              <h3 className="font-medium text-slate-200">{project.name}</h3>
              <p className="text-sm text-slate-500">
                {project._count?.tasks || 0} open task{project._count?.tasks === 1 ? '' : 's'}
              </p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onSwitchFocus(project.id); }}
              className="text-slate-400 hover:text-blue-500 transition-colors p-2"
              title="Focus this project"
            >
              <PlayCircle className="w-6 h-6" />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-start flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
                  {selectedProject.description && (
                    <p className="text-slate-400 text-sm mt-1">{selectedProject.description}</p>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => setSelectedProject(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 flex flex-col hide-scrollbar">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex-shrink-0">Active Tasks</h4>
                
                {activeTasks.length > 0 ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId={`droppable-${selectedProject.id}`}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 flex-shrink-0">
                          {activeTasks.map((task: any, index: number) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <FocusTaskItem 
                          task={task} 
                          index={index} 
                          onUpdate={() => onProjectUpdate && onProjectUpdate()} 
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
                  <p className="text-slate-500 text-sm mb-4 flex-shrink-0">No active tasks.</p>
                )}

                <form onSubmit={handleAddTask} className="flex gap-2 mt-4 pt-4 border-t border-slate-800 flex-shrink-0 mb-6">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || creating}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </form>

                {completedTasks.length > 0 && (
                  <div className="flex-shrink-0">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-800 pt-6">Completed Tasks</h4>
                    <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                      {completedTasks.map((task: any) => (
                <FocusTaskItem 
                  key={task.id}
                  task={task} 
                  isCompleted={true}
                  onUpdate={() => onProjectUpdate && onProjectUpdate()} 
                />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    onSwitchFocus(selectedProject.id);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <PlayCircle size={18} />
                  Focus this Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal 
        isOpen={showDeleteConfirm}
        title={selectedProject?.name || ""}
        isDeleting={isDeletingProject}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
