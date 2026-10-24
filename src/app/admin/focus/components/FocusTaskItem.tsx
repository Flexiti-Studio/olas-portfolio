import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  GripVertical, 
  ChevronDown, 
  Plus, 
  Trash2,
  FileText,
  Copy,
  Check,
  Pencil,
  Clock
} from "lucide-react";
import { DraggableProvided, DraggableStateSnapshot, Droppable, Draggable } from "@hello-pangea/dnd";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

  // Task details editing & copy state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hover Tooltip state
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState<{ top: number; left: number; maxW: number; placeAbove: boolean } | null>(null);
  const titleContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isHovered) return;
    const handleScrollOrResize = () => setIsHovered(false);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (expanded || snapshot?.isDragging) return;
    if (!titleContainerRef.current) return;
    const rect = titleContainerRef.current.getBoundingClientRect();
    const tooltipHeightEstimate = 160;
    const placeAbove = rect.bottom + tooltipHeightEstimate > window.innerHeight;
    const maxW = Math.min(Math.max(rect.width, 320), 460);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - maxW - 20));
    setTooltipCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left,
      maxW,
      placeAbove
    });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const formatDate = (dateValue?: string | Date | null) => {
    if (!dateValue) return null;
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return null;
    }
  };

  const handleCopyTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(task.title || "");
      setCopied(true);
      toast.success("Task details copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/focus/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      if (res.ok) {
        setIsEditing(false);
        toast.success("Task details updated");
        onUpdate();
      } else {
        toast.error("Failed to update task details");
      }
    } catch (err) {
      toast.error("Failed to update task details");
    } finally {
      setIsSavingEdit(false);
    }
  };

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

  const isDraggingStyle = snapshot?.isDragging 
    ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-900/20' 
    : isCompleted 
      ? 'bg-slate-800/40 border-slate-800/50' 
      : 'bg-slate-800 border-slate-700';
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s: any) => s.done);
  const activeSubtasks = subtasks.filter((s: any) => !s.done);

  return (
    <div 
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={`rounded-lg border transition-colors flex flex-col overflow-hidden w-full max-w-full ${isDraggingStyle}`}
    >
      <div 
        className={`flex items-start gap-2.5 sm:gap-3 p-3 transition-colors select-none ${!expanded ? 'cursor-pointer hover:bg-slate-800/60' : 'bg-slate-800/20'}`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('input') && !target.closest('textarea') && !target.closest('form')) {
            setExpanded(!expanded);
          }
        }}
      >
        {!isCompleted && provided && (
          <div {...provided.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing mt-0.5 flex-shrink-0">
            <GripVertical size={18} />
          </div>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTask();
          }}
          disabled={loading}
          className={`mt-0.5 ${isCompleted ? 'text-green-500 hover:text-green-400' : 'text-slate-400 hover:text-blue-500'} transition-colors disabled:opacity-50 flex-shrink-0`}
          title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        
        <div 
          ref={titleContainerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="flex-1 flex items-start justify-between min-w-0 gap-2"
        >
          <div className="flex-1 min-w-0" title={!expanded ? task.title : undefined}>
            <div className={`${expanded ? 'whitespace-normal break-words font-medium text-white' : 'truncate text-slate-200'} ${isCompleted ? 'line-through text-slate-500' : ''} text-sm leading-snug select-text`}>
              {!isCompleted && index !== undefined && (
                <span className="font-mono text-xs text-slate-500 mr-2 flex-shrink-0 font-medium">{index + 1}.</span>
              )}
              {task.title}
            </div>

            {!expanded && (
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span>Click to view full details</span>
                {subtasks.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400 font-medium">{subtasks.length} subtask{subtasks.length === 1 ? '' : 's'}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowTaskDeleteConfirm(true);
              }}
              disabled={loading}
              className="p-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className={`p-1 rounded-md transition-all duration-200 ${expanded ? 'text-blue-400 bg-blue-900/30 ring-1 ring-blue-500/30' : subtasks.length > 0 ? 'text-blue-400 bg-blue-900/20 hover:bg-blue-900/40' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
              title={expanded ? "Collapse task details" : "Expand full details & subtasks"}
            >
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-200 transform ${expanded ? 'rotate-0' : '-rotate-90'}`} 
              />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`task-details-${task.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden w-full max-w-full"
          >
            <div className="bg-slate-900/80 border-t border-slate-700/60 p-3 sm:p-4 space-y-3 w-full max-w-full">
              {/* Full Task Details Card - Fits available space */}
              <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 shadow-inner space-y-2.5 w-full max-w-full">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 truncate">
                      Task Details
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> In Progress
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyTitle}
                      className="px-2 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1.5 transition-colors"
                      title="Copy full task text"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setEditTitle(task.title);
                      }}
                      className="px-2 py-1 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1.5 transition-colors"
                      title="Edit task text"
                    >
                      <Pencil size={12} />
                      <span className="text-[11px]">Edit</span>
                    </button>
                  </div>
                </div>

                {/* Content area: Editing vs Viewing */}
                {isEditing ? (
                  <form onSubmit={handleSaveEdit} className="space-y-2 w-full">
                    <textarea
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      rows={3}
                      className="w-full max-h-48 bg-slate-900 border border-blue-500/60 rounded-lg p-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                      placeholder="Task title or details..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(task.title);
                        }}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!editTitle.trim() || isSavingEdit}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save Details
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="max-h-56 overflow-y-auto text-sm text-slate-100 leading-relaxed whitespace-pre-wrap select-text break-words font-normal bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 pr-2">
                    {task.title}
                  </div>
                )}

                {/* Timestamps & Info strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500">
                  {task.createdAt && (
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      <span>Created: {formatDate(task.createdAt)}</span>
                    </div>
                  )}
                  {task.completedAt && (
                    <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
                      <CheckCircle2 size={11} />
                      <span>Completed: {formatDate(task.completedAt)}</span>
                    </div>
                  )}
                  {subtasks.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Subtasks: {completedSubtasks.length}/{subtasks.length} done</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtasks Section - Fits space cleanly */}
              <div className="space-y-2 pt-1 border-t border-slate-800/70 w-full max-w-full">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-0.5 pt-1">
                  <span className="text-[11px]">Subtasks & Steps {subtasks.length > 0 ? `(${subtasks.length})` : ''}</span>
                  {subtasks.length > 0 && (
                    <span className="text-[10px] text-slate-500 lowercase font-normal">
                      {completedSubtasks.length} of {subtasks.length} completed
                    </span>
                  )}
                </div>

                {activeSubtasks.length > 0 && (
                  <Droppable droppableId={`subtasks-${task.id}`} type="subtask">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1 w-full max-w-full">
                        {activeSubtasks.map((sub: any, subIdx: number) => (
                          <Draggable key={sub.id} draggableId={sub.id} index={subIdx}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-start gap-2 py-1.5 px-2 group rounded-md hover:bg-slate-800/40 transition-colors w-full max-w-full ${snapshot.isDragging ? 'bg-slate-800 shadow-md ring-1 ring-blue-500/50 z-10 relative' : ''}`}
                              >
                                <div {...provided.dragHandleProps} className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <GripVertical size={14} />
                                </div>
                                <button 
                                  onClick={() => handleToggleSubtask(sub.id, sub.done)}
                                  disabled={loadingSubtask === sub.id}
                                  className="mt-0.5 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50 flex-shrink-0"
                                >
                                  {loadingSubtask === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Circle className="w-3.5 h-3.5" />}
                                </button>
                                <span className="text-xs sm:text-sm text-slate-300 flex-1 break-words min-w-0">
                                  <span className="font-mono text-[11px] text-slate-500 mr-1.5">{String.fromCharCode(97 + subIdx)}.</span>
                                  {sub.title}
                                </span>
                                <button onClick={() => setSubtaskToDelete(sub)} className="opacity-0 group-hover:opacity-80 hover:!opacity-100 text-red-500 hover:text-red-400 transition-opacity p-0.5 flex-shrink-0">
                                  <Trash2 size={13} />
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

                <form onSubmit={handleAddSubtask} className="flex gap-2 mt-1.5 items-center pl-2 sm:pl-4 w-full">
                  <button 
                    type="submit" 
                    disabled={!newSubtaskTitle.trim() || addingSubtask}
                    className="mt-0.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors flex-shrink-0"
                    title="Add Subtask"
                  >
                    {addingSubtask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  </button>
                  <input 
                    type="text" 
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask step..." 
                    className="flex-1 min-w-0 bg-transparent border-b border-slate-700/80 px-1 py-1 text-xs sm:text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </form>

                {completedSubtasks.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50 space-y-1 opacity-60 hover:opacity-100 transition-opacity pl-2 sm:pl-4 w-full">
                    {completedSubtasks.map((sub: any) => (
                      <div key={sub.id} className="flex items-start gap-2 group py-0.5">
                        <button 
                          onClick={() => handleToggleSubtask(sub.id, sub.done)}
                          disabled={loadingSubtask === sub.id}
                          className="mt-0.5 text-green-500 hover:text-green-400 transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          {loadingSubtask === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs sm:text-sm text-slate-500 line-through flex-1 break-words min-w-0">{sub.title}</span>
                        <button onClick={() => setSubtaskToDelete(sub)} className="opacity-0 group-hover:opacity-80 hover:!opacity-100 text-red-500 hover:text-red-400 transition-opacity p-0.5 flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Rich Floating Hover Tooltip */}
      {mounted && typeof document !== "undefined" && isHovered && !expanded && tooltipCoords && createPortal(
        <AnimatePresence>
          <motion.div
            key={`tooltip-${task.id}`}
            initial={{ opacity: 0, y: tooltipCoords.placeAbove ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: tooltipCoords.placeAbove ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: tooltipCoords.placeAbove ? "auto" : `${tooltipCoords.top}px`,
              bottom: tooltipCoords.placeAbove ? `${window.innerHeight - tooltipCoords.top}px` : "auto",
              left: `${tooltipCoords.left}px`,
              maxWidth: `${tooltipCoords.maxW}px`,
              width: "max-content"
            }}
            className="z-[9999] pointer-events-none p-3.5 bg-slate-950/98 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl ring-1 ring-white/10 space-y-2 text-left"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                <FileText size={12} />
                <span>Task Full Details</span>
              </div>
              {isCompleted ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                  <CheckCircle2 size={10} /> Completed
                </span>
              ) : (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> In Progress
                </span>
              )}
            </div>

            <div className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
              {task.title}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
              {task.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  <span>Created {formatDate(task.createdAt)}</span>
                </span>
              )}
              <span className="text-blue-400/90 font-medium">Click to expand & edit</span>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
