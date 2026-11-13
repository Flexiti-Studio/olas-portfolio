"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListOrdered,
  Play,
  ArrowRight,
  GripVertical,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Layers,
  GraduationCap
} from "lucide-react";

interface CourseLineupProps {
  courses: any[];
  lineupIds: string[];
  onUpdateLineup: (newLineupIds: string[]) => void;
  onOpenNewCourseModal?: () => void;
}

export default function CourseLineup({
  courses,
  lineupIds,
  onUpdateLineup,
  onOpenNewCourseModal,
}: CourseLineupProps) {
  const router = useRouter();
  const [isAddingCourse, setIsAddingCourse] = useState(false);

  // Map IDs to actual course objects in the exact line-up order
  const lineupCourses = lineupIds
    .map(id => courses.find(c => c.id === id))
    .filter(Boolean);

  // Available courses not yet added to the line-up
  const availableCourses = courses.filter(c => !lineupIds.includes(c.id));

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= lineupIds.length) return;
    const updated = [...lineupIds];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    onUpdateLineup(updated);
  };

  const removeFromLineup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateLineup(lineupIds.filter(itemId => itemId !== id));
  };

  const addToLineup = (id: string) => {
    if (!lineupIds.includes(id)) {
      onUpdateLineup([...lineupIds, id]);
    }
  };

  // Find the currently active / next-up course
  const activeCourse = lineupCourses.find(
    c => (c.progress?.overall_percentage || 0) < 100
  ) || lineupCourses[0];

  return (
    <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-indigo-900/40 rounded-3xl p-6 md:p-7 shadow-2xl relative overflow-hidden space-y-6">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ListOrdered size={16} />
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Study Line-up
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {lineupCourses.length} Queued
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Sequential study path. Complete them one after the other in your desired order.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {availableCourses.length > 0 && (
            <button
              onClick={() => setIsAddingCourse(!isAddingCourse)}
              className="text-xs px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>{isAddingCourse ? "Close List" : "Add to Line-up"}</span>
            </button>
          )}

          {activeCourse && (
            <button
              onClick={() => router.push(`/admin/interview-prep/${activeCourse.id}`)}
              className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30"
            >
              <Play size={13} fill="currentColor" />
              <span>Continue Line-up</span>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown to add available courses into line-up */}
      <AnimatePresence>
        {isAddingCourse && availableCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Pick a course to append to your study line-up:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {availableCourses.map(c => {
                  const pct = c.progress?.overall_percentage || 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        addToLineup(c.id);
                        if (availableCourses.length === 1) setIsAddingCourse(false);
                      }}
                      className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-indigo-500/60 hover:bg-indigo-950/20 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                          {c.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {c.modules?.length || 0} modules • {pct}% completed
                        </span>
                      </div>
                      <span className="p-1 rounded-lg bg-zinc-800 text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                        <Plus size={14} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {lineupCourses.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-zinc-300 mb-1">No courses in your study line-up</h3>
          <p className="text-xs text-zinc-500 max-w-md mb-5 leading-relaxed">
            Queue courses here to build a step-by-step roadmap. You can click on any course to jump straight in and tackle topics sequentially.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {courses.length > 0 ? (
              <button
                onClick={() => setIsAddingCourse(true)}
                className="text-xs px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Add from Existing Courses ({courses.length})
              </button>
            ) : onOpenNewCourseModal ? (
              <button
                onClick={onOpenNewCourseModal}
                className="text-xs px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Create Your First Course
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        /* Sequential Line-up Cards */
        <div className="space-y-3">
          <AnimatePresence>
            {lineupCourses.map((course, idx) => {
              const pct = course.progress?.overall_percentage || 0;
              const isCompleted = pct === 100;
              const isCurrent = activeCourse?.id === course.id && !isCompleted;
              const moduleCount = course.modules?.length || 0;
              const quizAvg = course.progress?.quiz_average || 0;
              const stepNumber = idx + 1;

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => router.push(`/admin/interview-prep/${course.id}`)}
                  className={`group relative p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCurrent
                      ? "bg-indigo-950/30 border-indigo-500/80 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/30"
                      : isCompleted
                      ? "bg-zinc-900/40 border-emerald-900/40 opacity-80 hover:opacity-100"
                      : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  {/* Left: Step indicator + Course Info */}
                  <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                    {/* Step Number Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isCurrent
                          ? "bg-indigo-600 text-white shadow-indigo-600/40"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : `${stepNumber}`}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                            <Sparkles size={10} /> Up Next
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Completed
                          </span>
                        )}
                        {course.application && (
                          <span className="text-[10px] text-zinc-400 font-semibold px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/40 truncate max-w-[160px]">
                            {course.application.company}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm md:text-base text-white truncate group-hover:text-indigo-300 transition-colors">
                        {course.title}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-1">
                        <span>{moduleCount} modules</span>
                        <span>•</span>
                        <span>{course.estimated_duration || "Self-paced"}</span>
                        {quizAvg > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">Quiz: {quizAvg}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Progress Bar + Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                    {/* Mini Progress */}
                    <div className="w-32 md:w-36">
                      <div className="flex justify-between text-[11px] font-bold text-zinc-400 mb-1">
                        <span>Progress</span>
                        <span className={isCompleted ? "text-emerald-400" : "text-indigo-400"}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden border border-zinc-700/40">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? "bg-emerald-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Order adjustment buttons */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(idx, "up")}
                        disabled={idx === 0}
                        title="Move up in line-up"
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => moveItem(idx, "down")}
                        disabled={idx === lineupIds.length - 1}
                        title="Move down in line-up"
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        onClick={e => removeFromLineup(course.id, e)}
                        title="Remove from line-up"
                        className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors ml-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Open Arrow Button */}
                    <div className="p-2 rounded-xl bg-zinc-800/60 group-hover:bg-indigo-600 text-zinc-400 group-hover:text-white transition-all shadow-sm">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

