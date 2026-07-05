"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, Briefcase, GraduationCap, Clock, BarChart2, Zap, FileText } from "lucide-react";

export default function InterviewPrepList() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("last_studied");

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try { const r = await fetch("/api/interview-prep"); if (r.ok) setCourses(await r.json()); }
    catch {} finally { setLoading(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this course and all its content?")) return;
    await fetch(`/api/interview-prep/${id}`, { method: "DELETE" });
    setCourses(c => c.filter(x => x.id !== id));
  };

  const filtered = courses
    .filter(c => {
      if (filter === "in_progress") return c.progress && c.progress.overall_percentage > 0 && c.progress.overall_percentage < 100;
      if (filter === "completed") return c.progress?.overall_percentage === 100;
      if (filter === "linked") return !!c.application_id;
      return true;
    })
    .sort((a, b) => {
      if (sort === "last_studied") return new Date(b.progress?.last_studied_at || b.created_at).getTime() - new Date(a.progress?.last_studied_at || a.created_at).getTime();
      if (sort === "progress") return (b.progress?.overall_percentage || 0) - (a.progress?.overall_percentage || 0);
      if (sort === "quiz") return (b.progress?.quiz_average || 0) - (a.progress?.quiz_average || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold flex items-center gap-3"><GraduationCap className="text-indigo-400" /> Interview Prep</h1>
            <p className="text-zinc-500 mt-1">{courses.length} course{courses.length !== 1 ? "s" : ""} created</p>
          </div>
          <button onClick={() => router.push("/admin/interview-prep/new")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
            <Plus size={18} /> New Course
          </button>
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            {[["all","All"],["in_progress","In Progress"],["completed","Completed"],["linked","Linked"]].map(([id,label]) => (
              <button key={id} onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{label}</button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none ml-auto">
            <option value="last_studied">Last Studied</option>
            <option value="created">Date Created</option>
            <option value="progress">Progress</option>
            <option value="quiz">Quiz Score</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-600"><BookOpen size={32} className="animate-pulse" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <GraduationCap size={48} className="mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">No courses yet</h3>
            <p className="text-zinc-600 mb-6">Create your first interview prep course from any study material.</p>
            <button onClick={() => router.push("/admin/interview-prep/new")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Get Started</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map(course => {
                const pct = course.progress?.overall_percentage || 0;
                const mastery = course.progress?.flashcard_mastery || 0;
                const quizAvg = course.progress?.quiz_average || 0;
                const moduleCount = course.modules?.length || 0;
                const lessonCount = course.modules?.reduce((s: number, m: any) => s + (m._count?.lessons || 0), 0) || 0;
                const lastStudied = course.progress?.last_studied_at || course.created_at;

                return (
                  <motion.div key={course.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    onClick={() => router.push(`/admin/interview-prep/${course.id}`)}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-zinc-600 transition-all group relative">
                    <button onClick={e => handleDelete(course.id, e)}
                      className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-start gap-2 mb-3 pr-6">
                      {course.source_type === "pdf" ?
                        <FileText size={14} className="text-indigo-400 mt-1 shrink-0" /> :
                        <Zap size={14} className="text-amber-400 mt-1 shrink-0" />}
                      <h3 className="font-semibold text-white leading-tight">{course.title}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400">{course.source_type === "pdf" ? "PDF" : "Text"}</span>
                      {course.application && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-indigo-800 text-indigo-400 flex items-center gap-1">
                          <Briefcase size={10} /> {course.application.company}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500 mb-3 flex gap-3">
                      <span>{moduleCount} modules</span>
                      {lessonCount > 0 && <span>{lessonCount} lessons</span>}
                    </div>

                    {/* Overall progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Progress</span><span className={pct === 100 ? "text-emerald-400" : ""}>{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Flashcard mastery */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Flashcard Mastery</span><span>{mastery}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1">
                        <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${mastery}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(lastStudied).toLocaleDateString()}</span>
                      {quizAvg > 0 && (
                        <span className={`flex items-center gap-1 font-medium ${quizAvg >= 80 ? "text-emerald-400" : quizAvg >= 60 ? "text-amber-400" : "text-red-400"}`}>
                          <BarChart2 size={10} /> Quiz avg: {quizAvg}%
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
