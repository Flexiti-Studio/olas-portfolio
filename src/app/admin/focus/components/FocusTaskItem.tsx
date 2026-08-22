import { useState } from "react";
import { CheckCircle2, Circle, Loader2, GripVertical, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { DraggableProvided, DraggableStateSnapshot, Droppable, Draggable } from "@hello-pangea/dnd";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { toast } from "sonner";

interface FocusTaskItemProps {
  task: any;
  index?: number;
  isCompleted?: boolean;
  onUpdate: () => void;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
}

export function FocusTaskItem({ task, index, isCompleted, onUpdate, provided, snapshot }: FocusTaskItemProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [loadingSubtask, setLoadingSubtask] = useState<string | null>(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState<any | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isDeletingSubtask, setIsDeletingSubtask] = useState(false);

  const handleToggleTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/focus/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done })
      });
      if (res.ok) onUpdate();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/focus/tasks/${task.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setShowTaskDeleteConfirm(false);
        toast.success("Task deleted");
        onUpdate();
      }
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentDone: boolean) => {
    setLoadingSubtask(subtaskId);
    try {
      const res = await fetch(`/api/focus/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !currentDone })
      });
      if (res.ok) onUpdate();
    } finally {
      setLoadingSubtask(null);
    }
  };

  const handleDeleteSubtask = async () => {
    if (!subtaskToDelete) return;
    setIsDeletingSubtask(true);
    try {
      const res = await fetch(`/api/focus/subtasks/${subtaskToDelete.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSubtaskToDelete(null);
        toast.success("Subtask deleted");
        onUpdate();
      }
    } finally {
      setIsDeletingSubtask(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    
    setAddingSubtask(true);
    try {
      const res = await fetch("/api/focus/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, title: newSubtaskTitle, order: task.subtasks?.length || 0 })
      });
      if (res.ok) {
        setNewSubtaskTitle("");
        setExpanded(true);
        onUpdate();
      }
    } finally {
      setAddingSubtask(false);
    }
  };

  const isDraggingStyle = snapshot?.isDragging ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-900/20' : isCompleted ? 'bg-slate-800/40 border-slate-800/50' : 'bg-slate-800 border-slate-700';
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s: any) => s.done);
  const activeSubtasks = subtasks.filter((s: any) => !s.done);

  return (
    <div 
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={`rounded-lg border transition-colors flex flex-col overflow-hidden ${isDraggingStyle}`}
    >
      <div className="flex items-center gap-3 p-3">
        {!isCompleted && provided && (
          <div {...provided.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing">
            <GripVertical size={18} />
          </div>
        )}
        
        <button 
          onClick={handleToggleTask}
          disabled={loading}
          className={`${isCompleted ? 'text-green-500 hover:text-green-400' : 'text-slate-400 hover:text-blue-500'} transition-colors disabled:opacity-50`}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>
        
        <div className="flex-1 flex items-center min-w-0">
          <span className={`flex-1 truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {!isCompleted && index !== undefined && (
              <span className="font-mono text-xs text-slate-500 mr-2">{index + 1}.</span>
            )}
            {task.title}
          </span>
          
          <div className="flex items-center gap-1 ml-2">
            <button 
              onClick={() => setShowTaskDeleteConfirm(true)}
              disabled={loading}
              className="p-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className={`p-1 rounded-md transition-colors ${subtasks.length > 0 ? 'text-blue-400 bg-blue-900/20 hover:bg-blue-900/40' : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'}`}
              title={expanded ? "Collapse Subtasks" : "Expand Subtasks"}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-900/50 border-t border-slate-700/50 p-3 pl-11">
          {activeSubtasks.length > 0 && (
            <Droppable droppableId={`subtasks-${task.id}`} type="subtask">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                  {activeSubtasks.map((sub: any, subIdx: number) => (
                    <Draggable key={sub.id} draggableId={sub.id} index={subIdx}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-start gap-2 py-1.5 group rounded-md ${snapshot.isDragging ? 'bg-slate-800 shadow-md ring-1 ring-blue-500/50 z-10 relative' : ''}`}
                        >
                          <div {...provided.dragHandleProps} className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical size={14} />
                          </div>
                          <button 
                            onClick={() => handleToggleSubtask(sub.id, sub.done)}
                            disabled={loadingSubtask === sub.id}
                            className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            {loadingSubtask === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <span className="text-sm text-slate-300 flex-1">
                            <span className="font-mono text-xs text-slate-500 mr-1.5">{String.fromCharCode(97 + subIdx)}.</span>
                            {sub.title}
                          </span>
                          <button onClick={() => setSubtaskToDelete(sub)} className="opacity-50 hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}

          <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2 items-center pl-6">
            <button 
              type="submit" 
              disabled={!newSubtaskTitle.trim() || addingSubtask}
              className="mt-0.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors flex-shrink-0"
              title="Add Subtask"
            >
              {addingSubtask ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
            <input 
              type="text" 
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask..." 
              className="flex-1 bg-transparent border-b border-slate-700 px-1 py-1 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </form>

          {completedSubtasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/50 space-y-1.5 opacity-60 hover:opacity-100 transition-opacity pl-6">
              {completedSubtasks.map((sub: any) => (
                <div key={sub.id} className="flex items-start gap-2 group">
                  <button 
                    onClick={() => handleToggleSubtask(sub.id, sub.done)}
                    disabled={loadingSubtask === sub.id}
                    className="mt-0.5 text-green-500 hover:text-green-400 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {loadingSubtask === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <span className="text-sm text-slate-500 line-through flex-1">{sub.title}</span>
                  <button onClick={() => setSubtaskToDelete(sub)} className="opacity-50 hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={showTaskDeleteConfirm}
        title={task.title}
        isDeleting={isDeletingTask}
        onConfirm={handleDeleteTask}
        onCancel={() => setShowTaskDeleteConfirm(false)}
      />

      <DeleteConfirmModal 
        isOpen={!!subtaskToDelete}
        title={subtaskToDelete?.title || ""}
        isDeleting={isDeletingSubtask}
        onConfirm={handleDeleteSubtask}
        onCancel={() => setSubtaskToDelete(null)}
      />
    </div>
  );
}
