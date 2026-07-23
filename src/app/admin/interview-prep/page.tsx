"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, Briefcase, GraduationCap, Clock, BarChart2, Zap, FileText, XCircle, CheckCircle2, X, ChevronRight, Activity, Award } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function InterviewPrepList() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("last_studied");

  // Custom confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/interview-prep");
      if (r.ok) {
        setCourses(await r.json());
      }
    } catch {} 
    finally { setLoading(false); }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      "Delete Course",
      "Are you sure you want to delete this prep course and all its modules, lessons, quizzes, and progress? This cannot be undone.",
      async () => {
        await fetch(`/api/interview-prep/${id}`, { method: "DELETE" });
        setCourses(c => c.filter(x => x.id !== id));
      }
    );
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

  // Goal & Analytics calculations
  const lastStudiedCourse = [...courses].sort((a, b) => {
    const timeA = new Date(a.progress?.last_studied_at || a.created_at).getTime();
    const timeB = new Date(b.progress?.last_studied_at || b.created_at).getTime();
    return timeB - timeA;
  })[0];

  const totalCourses = courses.length;
  const inProgressCount = courses.filter(c => c.progress && c.progress.overall_percentage > 0 && c.progress.overall_percentage < 100).length;
  const completedCount = courses.filter(c => c.progress?.overall_percentage === 100).length;
  
  const quizScores = courses.map(c => c.progress?.quiz_average || 0).filter(s => s > 0);
  const avgQuizScore = quizScores.length ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

  const chartData = courses.map(c => ({
    name: c.title.length > 15 ? c.title.substring(0, 15) + "..." : c.title,
    Progress: c.progress?.overall_percentage || 0,
    Quiz: c.progress?.quiz_average || 0
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><GraduationCap className="text-indigo-400" /> Prep Dashboard</h1>
            <p className="text-zinc-500 mt-1">Track and manage your AI-generated technical interview preparations</p>
          </div>
          <button 
            onClick={() => router.push("/admin/interview-prep/new")}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 shrink-0"
          >
            <Plus size={18} /> New Prep Course
          </button>
        </div>

        {/* Dashboard Analytics & Metrics Section */}
        {courses.length > 0 && (
          <div className="space-y-6">
            
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Courses</span>
                <span className="text-3xl font-black mt-2 text-white">{totalCourses}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">In Progress</span>
                <span className="text-3xl font-black mt-2 text-indigo-400">{inProgressCount}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Completed</span>
                <span className="text-3xl font-black mt-2 text-emerald-400">{completedCount}</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Avg Quiz Score</span>
                <span className="text-3xl font-black mt-2 text-amber-400">{avgQuizScore}%</span>
              </div>
            </div>

            {/* Hero current focus & chart side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Hero current focus */}
              {lastStudiedCourse && (
                <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950/30 to-zinc-900 border border-indigo-900/50 p-6 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      <Activity size={10} /> Active Goal
                    </span>
                    <div>
                      <h3 className="font-extrabold text-xl leading-snug text-white line-clamp-2">{lastStudiedCourse.title}</h3>
                      {lastStudiedCourse.application && (
                        <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                          <Briefcase size={12} className="text-indigo-400" /> Linked with {lastStudiedCourse.application.company}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                        <span>Course Completion</span>
                        <span className="font-bold text-indigo-300">{lastStudiedCourse.progress?.overall_percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 rounded-full h-2 border border-zinc-850">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full transition-all duration-700" 
                          style={{ width: `${lastStudiedCourse.progress?.overall_percentage || 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => router.push(`/admin/interview-prep/${lastStudiedCourse.id}`)}
                    className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md group-hover:translate-y-[-2px]"
                  >
                    <span>Resume Studying</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Right Column: Chart */}
              <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between shadow-2xl">
                <div>
                  <h3 className="font-bold text-sm text-zinc-400 flex items-center gap-2 mb-4">
                    <BarChart2 size={16} className="text-indigo-400" /> Real-time Progress & Performance
                  </h3>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ fontSize: '11px' }}
                      />
                      <Bar dataKey="Progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Quiz" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Filters & Sort & Grid */}
        <div className="space-y-6 pt-4 border-t border-zinc-850">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Award size={18} className="text-indigo-400" /> Your Study Material
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
                {[["all","All"],["in_progress","In Progress"],["completed","Completed"],["linked","Linked"]].map(([id,label]) => (
                  <button key={id} onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{label}</button>
                ))}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 outline-none">
                <option value="last_studied">Last Studied</option>
                <option value="created">Date Created</option>
                <option value="progress">Progress</option>
                <option value="quiz">Quiz Score</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-zinc-650"><BookOpen size={36} className="animate-pulse text-indigo-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-zinc-800 p-8">
              <GraduationCap size={48} className="mx-auto mb-4 text-zinc-700" />
              <h3 className="text-lg font-bold text-zinc-400 mb-2">No courses match filter</h3>
              <p className="text-zinc-600 max-w-sm mx-auto text-sm">Refine your active filter selections or add a new course.</p>
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
                      className="bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 rounded-2xl p-5 cursor-pointer transition-all group relative flex flex-col justify-between shadow-md">
                      <div>
                        <button onClick={e => handleDelete(course.id, e)}
                          className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10">
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-start gap-2 mb-3 pr-6">
                          {course.source_type === "pdf" ?
                            <FileText size={15} className="text-indigo-400 mt-0.5 shrink-0" /> :
                            <Zap size={15} className="text-amber-400 mt-0.5 shrink-0" />}
                          <h3 className="font-bold text-[15px] text-white leading-tight">{course.title}</h3>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">{course.source_type === "pdf" ? "PDF" : "Text"}</span>
                          {course.application && (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 flex items-center gap-1">
                              <Briefcase size={10} /> {course.application.company}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-500 mb-4 flex gap-3 font-semibold">
                          <span>{moduleCount} modules</span>
                          {lessonCount > 0 && <span>{lessonCount} lessons</span>}
                        </div>

                        {/* Overall progress */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Progress</span><span className={pct === 100 ? "text-emerald-400 font-bold" : ""}>{pct}%</span>
                          </div>
                          <div className="w-full bg-zinc-800/60 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Flashcard mastery */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Flashcard Mastery</span><span>{mastery}%</span>
                          </div>
                          <div className="w-full bg-zinc-800/60 rounded-full h-1">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${mastery}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800 font-semibold">
                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(lastStudied).toLocaleDateString()}</span>
                        {quizAvg > 0 && (
                          <span className={`flex items-center gap-1 font-bold ${quizAvg >= 80 ? "text-emerald-400" : quizAvg >= 60 ? "text-amber-400" : "text-red-400"}`}>
                            <BarChart2 size={11} /> Quiz: {quizAvg}%
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-350"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
