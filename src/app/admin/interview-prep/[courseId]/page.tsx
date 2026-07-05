"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, RefreshCw, Shuffle, Check, X, Loader2, Target, Brain, ArrowLeft, Clock, Timer, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CourseView({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [activeViewId, setActiveViewId] = useState<string>(""); // lessonId, "final-quiz", "flashcards"
  
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [flashcardSessionFinished, setFlashcardSessionFinished] = useState(false);
  const [flashcardSessionScores, setFlashcardSessionScores] = useState<number[]>([]);
  const [flashcardSessionScoreAverage, setFlashcardSessionScoreAverage] = useState<number>(0);
  
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizResults, setQuizResults] = useState<any>(null);
  
  const [quizStep, setQuizStep] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/interview-prep/${courseId}`).then(r => r.json()).then(data => {
      setCourse(data);
      if (data.modules?.length) {
        setActiveModuleId(data.modules[0].id);
        if (data.modules[0].lessons?.length) setActiveViewId(data.modules[0].lessons[0].id);
        else setActiveViewId("final-quiz");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [courseId]);

  const activeModule = course?.modules?.find((m: any) => m.id === activeModuleId);
  const activeLesson = activeModule?.lessons?.find((l: any) => l.id === activeViewId);
  const completedLessons = course?.progress?.completed_lessons || [];

  const allQuestions = course?.modules?.map((m: any) => (m.quiz?.questions || []).map((q: any) => ({ ...q, id: `${m.id}_${q.id || Math.random()}` }))).flat() || [];
  const allFlashcards = course?.modules?.map((m: any) => m.flashcards || []).flat() || [];

  const updateProgress = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/interview-prep/${courseId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedLessonId: lessonId, currentModuleId: activeModuleId, currentLessonId: lessonId })
      });
      if (res.ok) {
        const prog = await res.json();
        setCourse((c: any) => ({ ...c, progress: prog }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLessonComplete = async () => {
    if (!activeLesson || !activeModule) return;
    
    setIsCompletingLesson(true);
    const success = await updateProgress(activeLesson.id);
    if (!success) {
      setIsCompletingLesson(false);
      return;
    }
    setIsCompletingLesson(false);

    const currentIndex = activeModule.lessons.findIndex((l: any) => l.id === activeLesson?.id);
    if (currentIndex < activeModule.lessons.length - 1) {
      setActiveViewId(activeModule.lessons[currentIndex + 1].id);
      window.scrollTo(0, 0);
    } else {
      const modIndex = course.modules.findIndex((m: any) => m.id === activeModuleId);
      if (modIndex < course.modules.length - 1) {
        const nextMod = course.modules[modIndex + 1];
        setActiveModuleId(nextMod.id);
        setActiveViewId(nextMod.lessons[0]?.id || "final-quiz");
        window.scrollTo(0, 0);
      } else {
        setActiveViewId("final-quiz");
        setQuizStep(0);
        window.scrollTo(0, 0);
      }
    }
  };

  const submitQuiz = async (forceSubmit = false) => {
    if (!forceSubmit && Object.keys(quizAnswers).length < allQuestions.length) {
      if (!window.confirm("You have unanswered questions. Are you sure you want to submit?")) return;
    }

    setIsGrading(true);
    let score = 0;
    const total = allQuestions.length;
    if (total === 0) {
      setIsGrading(false);
      return;
    }

    for (const q of allQuestions) {
      if (q.type === "multiple_choice" || q.type === "true_false") {
        if (quizAnswers[q.id] === q.correctAnswer) score++;
      }
    }

    const pct = Math.round((score / total) * 100);
    const passed = pct >= 80;
    
    setQuizResults({ score: pct, passed });

    try {
      await fetch(`/api/interview-prep/${courseId}/progress`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalQuizScore: pct })
      });
      setCourse((c: any) => ({ ...c, progress: { ...c.progress, quiz_average: pct } }));
    } catch {}
    
    setIsGrading(false);
  };

  useEffect(() => {
    if (activeViewId === "final-quiz" && !quizResults && allQuestions.length > 0) {
      if (timeLeft === null) {
        setTimeLeft(allQuestions.length * 180);
      }
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    } else if (activeViewId !== "final-quiz" || quizResults) {
      setTimeLeft(null);
    }
  }, [activeViewId, quizResults, allQuestions.length, timeLeft === null]);

  useEffect(() => {
    if (timeLeft === 0 && !isGrading && !quizResults) {
      submitQuiz(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const rateFlashcard = async (rating: string) => {
    const fc = allFlashcards[flashcardIndex];
    if (!fc) return;

    let score = 0;
    if (rating === "know_it") score = 100;
    else if (rating === "almost") score = 50;
    
    const newScores = [...flashcardSessionScores, score];
    setFlashcardSessionScores(newScores);

    try {
      const res = await fetch(`/api/interview-prep/flashcard/${fc.id}/rate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, courseId })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.mastery === 'number') {
           setCourse((c: any) => ({ ...c, progress: { ...c.progress, flashcard_mastery: data.mastery } }));
        }
      }
    } catch {}
    
    setCardFlipped(false);
    if (flashcardIndex < allFlashcards.length - 1) {
      setFlashcardIndex(prev => prev + 1);
    } else {
      finishFlashcardSession(newScores);
    }
  };

  const finishFlashcardSession = async (scoresToUse = flashcardSessionScores) => {
    setFlashcardSessionFinished(true);
    if (scoresToUse.length === 0) return;
    
    const avg = Math.round(scoresToUse.reduce((a, b) => a + b, 0) / scoresToUse.length);
    setFlashcardSessionScoreAverage(avg);

    try {
      const res = await fetch(`/api/interview-prep/${courseId}/progress`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flashcardSessionScore: avg })
      });
      if (res.ok) {
        const prog = await res.json();
        setCourse((c: any) => ({ ...c, progress: prog }));
      }
    } catch {}
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex justify-center items-center"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>;
  if (!course) return <div className="min-h-screen bg-zinc-950 text-white p-8">Course not found.</div>;

  return (
    <div className="h-screen bg-zinc-950 text-white flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <button onClick={() => router.push("/admin/interview-prep")} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 mb-3"><ArrowLeft size={12} /> Back to Courses</button>
          <h2 className="font-semibold text-sm leading-tight">{course.title}</h2>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>Progress</span><span>{course.progress?.overall_percentage || 0}%</span></div>
            <div className="w-full bg-zinc-800 rounded-full h-1"><div className="bg-indigo-500 h-1 rounded-full transition-all" style={{width: `${course.progress?.overall_percentage || 0}%`}} /></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {course.modules.map((m: any, i: number) => {
              const modDone = m.lessons.every((l: any) => completedLessons.includes(l.id));
              return (
                <div key={m.id} className="space-y-1">
                  <button onClick={() => { setActiveModuleId(m.id); setActiveViewId(m.lessons[0]?.id || "final-quiz"); }}
                    className={`w-full text-left text-sm font-medium px-2 py-1.5 rounded-lg flex items-center justify-between ${activeModuleId === m.id ? "text-indigo-400" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
                    <span>Module {i + 1}</span>
                    {modDone && <CheckCircle2 size={14} className="text-emerald-500" />}
                  </button>
                  {activeModuleId === m.id && (
                    <div className="pl-3 space-y-0.5 border-l border-zinc-800 ml-2 mt-1">
                      {m.lessons.map((l: any) => {
                        const done = completedLessons.includes(l.id);
                        const active = activeViewId === l.id;
                        return (
                          <button key={l.id} onClick={() => setActiveViewId(l.id)}
                            className={`w-full text-left text-xs px-3 py-1.5 rounded flex items-center gap-2 ${active ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-400 hover:text-zinc-200"}`}>
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/20 border-emerald-500" : "border-zinc-600"}`}>
                              {done && <Check size={8} className="text-emerald-500" />}
                            </div>
                            <span className="truncate">{l.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 mb-4 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Course Assessment</div>
          <div className="space-y-1">
            <button onClick={() => { setActiveViewId("final-quiz"); setQuizResults(null); setQuizStep(0); }} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "final-quiz" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <Target size={16} className="shrink-0" />
              <span className="flex-1">Take Final Quiz</span>
              {course.progress?.quiz_average > 0 && <span className="text-xs text-indigo-400">{course.progress.quiz_average}%</span>}
            </button>
            <button onClick={() => { setActiveViewId("flashcards"); setCardFlipped(false); setFlashcardSessionFinished(false); setFlashcardSessionScores([]); setFlashcardIndex(0); }} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "flashcards" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <Brain size={16} className="shrink-0" />
              <span className="flex-1">Practice Flashcards</span>
              {course.progress?.flashcard_mastery > 0 && <span className="text-xs text-fuchsia-400">{course.progress.flashcard_mastery}%</span>}
            </button>
            <button onClick={() => setActiveViewId("assessment-history")} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "assessment-history" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <LineChartIcon size={16} className="shrink-0" />
              <span>Performance History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Centre Panel */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 relative">
        <div className="max-w-4xl mx-auto py-10 px-8 pb-32">
          {activeLesson ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={activeLesson.id} className="max-w-3xl mx-auto">
              <div className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">{activeModule?.title}</div>
              <h1 className="text-3xl font-bold mb-3">{activeLesson.title}</h1>
              <div className="text-sm text-zinc-500 mb-8 flex items-center gap-2"><Clock size={14}/> {activeLesson.estimated_minutes} min read</div>
              
              <div className="space-y-6 text-zinc-300 text-[15px] leading-relaxed">
                {activeLesson.content.introduction && <p>{activeLesson.content.introduction}</p>}
                
                {activeLesson.content.sections?.map((sec: any, i: number) => (
                  <div key={i} className="mb-6">
                    {sec.heading && <h3 className="text-lg font-semibold text-white mt-6 mb-3">{sec.heading}</h3>}
                    {sec.type === "paragraph" && <p>{sec.body}</p>}
                    {sec.type === "callout" && <div className="p-4 bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-lg text-indigo-100">{sec.body}</div>}
                    {sec.type === "code" && <pre className="p-4 bg-zinc-900 rounded-lg overflow-x-auto text-sm font-mono border border-zinc-800 text-zinc-300">{sec.body}</pre>}
                    {sec.type === "bullets" && <ul className="list-disc list-inside space-y-1">{sec.items?.map((item:string, j:number) => <li key={j}>{item}</li>)}</ul>}
                    {sec.type === "steps" && <ol className="list-decimal list-inside space-y-2">{sec.items?.map((item:string, j:number) => <li key={j} className="pl-2">{item}</li>)}</ol>}
                    {sec.type === "definition" && <div className="flex gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800"><span className="font-semibold text-white">{sec.body.split(':')[0]}:</span><span className="text-zinc-400">{sec.body.split(':').slice(1).join(':')}</span></div>}
                  </div>
                ))}

                {activeLesson.content.whyThisMatters && (
                  <div className="mt-10 p-5 bg-amber-950/20 border border-amber-900/50 rounded-xl">
                    <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2"><Target size={16}/> Why this matters in an interview</h4>
                    <p className="text-sm text-amber-200/80">{activeLesson.content.whyThisMatters}</p>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-6 border-t border-zinc-800 flex items-center justify-between">
                <button onClick={handleLessonComplete} disabled={isCompletingLesson || completedLessons.includes(activeLesson.id)} className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 ${completedLessons.includes(activeLesson.id) ? "bg-zinc-800 text-zinc-300" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}>
                  {isCompletingLesson ? <Loader2 size={18} className="animate-spin" /> : completedLessons.includes(activeLesson.id) ? <CheckCircle2 size={18}/> : null}
                  {isCompletingLesson ? "Saving Progress..." : completedLessons.includes(activeLesson.id) ? "Completed" : "Mark as Complete"}
                </button>
              </div>
            </motion.div>
          ) : activeViewId === "final-quiz" ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key="final-quiz" className="max-w-3xl mx-auto">
              {quizResults ? (
                <div className="text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 mt-12">
                  <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 mx-auto mb-6"><Target size={32}/></div>
                  <div className={`text-7xl font-bold mb-6 ${quizResults.passed ? "text-emerald-500" : "text-amber-500"}`}>{quizResults.score}%</div>
                  <h3 className="text-2xl font-semibold mb-8">{quizResults.passed ? "Assessment Passed! 🎉" : "Needs Review"}</h3>
                  <div className="flex justify-center gap-4">
                    <button onClick={() => { setQuizResults(null); setQuizAnswers({}); setQuizStep(0); }} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-medium">Retake Assessment</button>
                    <button onClick={() => { setActiveViewId("flashcards"); setCardFlipped(false); }} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold">Practice Flashcards</button>
                  </div>
                </div>
              ) : allQuestions.length > 0 ? (
                <div className="space-y-8">
                  {/* Pagination Header & Jump Grid */}
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Course Assessment</h1>
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold px-4 py-1.5 rounded-full border flex items-center gap-2 ${timeLeft && timeLeft < 60 ? "bg-red-950/40 text-red-400 border-red-500/50 animate-pulse" : "bg-zinc-900/80 text-zinc-300 border-zinc-700"}`}>
                        <Timer size={16}/> {formatTime(timeLeft)}
                      </div>
                      <div className="text-sm font-semibold text-indigo-400 bg-indigo-950/40 px-4 py-1.5 rounded-full border border-indigo-500/30">
                        Question {quizStep + 1} of {allQuestions.length}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 mb-10 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                    {allQuestions.map((q: any, i: number) => {
                      const isAnswered = !!quizAnswers[q.id];
                      const isActive = i === quizStep;
                      
                      let btnClass = "bg-zinc-800 text-zinc-400 hover:bg-zinc-700";
                      if (isActive) btnClass = "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-950";
                      else if (isAnswered) btnClass = "bg-indigo-950/80 text-indigo-300 border border-indigo-800/50";

                      return (
                        <button key={q.id} onClick={() => setQuizStep(i)} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${btnClass}`}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Content */}
                  <AnimatePresence mode="wait">
                    <motion.div key={quizStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl shadow-xl">
                      <h3 className="text-xl font-medium mb-8 leading-relaxed">{allQuestions[quizStep].question}</h3>
                      
                      {(allQuestions[quizStep].type === "multiple_choice" || allQuestions[quizStep].type === "true_false") && (
                        <div className="space-y-4">
                          {(allQuestions[quizStep].options?.length ? allQuestions[quizStep].options : (allQuestions[quizStep].type === "true_false" ? ["True", "False"] : [])).map((opt: string) => {
                            const selected = quizAnswers[allQuestions[quizStep].id] === opt;
                            return (
                              <button key={opt} onClick={() => setQuizAnswers(p => ({...p, [allQuestions[quizStep].id]: opt}))}
                                className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between ${selected ? "bg-indigo-900/80 border-indigo-500 text-white" : "bg-zinc-900/80 border-zinc-700 hover:border-zinc-500 text-zinc-300"}`}>
                                <span className="font-medium text-[16px]">{opt}</span>
                                {selected && <CheckCircle2 size={22} className="text-indigo-400"/>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Footer Nav */}
                  <div className="flex items-center justify-between mt-8 pt-8 border-t border-zinc-800">
                    <button onClick={() => setQuizStep(p => Math.max(0, p - 1))} disabled={quizStep === 0 || isGrading} className="px-6 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white flex items-center gap-2">
                      <ChevronLeft size={18}/> Previous
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {quizStep < allQuestions.length - 1 && (
                        <button onClick={() => submitQuiz(false)} disabled={isGrading} className="px-6 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white transition-colors">
                          Submit Early
                        </button>
                      )}
                      
                      {quizStep === allQuestions.length - 1 ? (
                        <button onClick={() => submitQuiz(false)} disabled={isGrading} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                          {isGrading ? <Loader2 size={18} className="animate-spin"/> : "Submit Assessment"}
                        </button>
                      ) : (
                        <button onClick={() => setQuizStep(p => Math.min(allQuestions.length - 1, p + 1))} disabled={isGrading} className="px-6 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                          Next <ChevronRight size={18}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 mt-12 bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800">
                  <Target size={48} className="mx-auto mb-4 opacity-50"/>
                  <h3 className="text-xl font-medium text-zinc-400">No Assessment Available</h3>
                  <p className="mt-2 text-sm">This course does not have any generated quiz questions.</p>
                </div>
              )}
            </motion.div>
          ) : activeViewId === "flashcards" ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key="flashcards" className="max-w-2xl mx-auto mt-8">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-fuchsia-500/20 text-fuchsia-400 rounded-3xl flex items-center justify-center border border-fuchsia-500/30 mx-auto mb-6">
                  <Brain size={32}/>
                </div>
                <h1 className="text-3xl font-bold mb-2">Spaced Repetition Flashcards</h1>
                <p className="text-zinc-500 text-lg">Master {allFlashcards.length} key concepts from this course</p>
              </div>

              {flashcardSessionFinished ? (
                <div className="text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 mt-12">
                  <div className="w-16 h-16 bg-fuchsia-500/20 text-fuchsia-400 rounded-2xl flex items-center justify-center border border-fuchsia-500/30 mx-auto mb-6"><Brain size={32}/></div>
                  <div className="text-7xl font-bold mb-2 text-fuchsia-500">{flashcardSessionScoreAverage}%</div>
                  <p className="text-zinc-500 font-medium mb-6 uppercase tracking-widest text-sm">Session Score</p>
                  
                  <div className="bg-zinc-800/50 rounded-xl p-4 inline-block mb-8 border border-zinc-700">
                    <span className="text-zinc-400">Overall Mastery:</span>
                    <span className="text-fuchsia-400 font-bold ml-2">{course.progress?.flashcard_mastery || 0}%</span>
                  </div>

                  <h3 className="text-2xl font-semibold mb-8">Session Completed!</h3>
                  <div className="flex justify-center gap-4">
                    <button onClick={() => { setFlashcardSessionFinished(false); setFlashcardIndex(0); setCardFlipped(false); setFlashcardSessionScores([]); }} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-medium">Practice Again</button>
                    <button onClick={() => { setActiveViewId("final-quiz"); setQuizResults(null); setQuizStep(0); }} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold">Take Final Quiz</button>
                  </div>
                </div>
              ) : allFlashcards.length > 0 ? (
                <div className="max-w-xl mx-auto">
                  <div className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6">Card {flashcardIndex + 1} of {allFlashcards.length}</div>
                  
                  <div className="relative w-full aspect-[4/3] [perspective:1000px] cursor-pointer group" onClick={() => setCardFlipped(!cardFlipped)}>
                    <motion.div initial={false} animate={{ rotateY: cardFlipped ? 180 : 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="w-full h-full relative [transform-style:preserve-3d]">
                      {/* Front */}
                      <div className="absolute inset-0 [backface-visibility:hidden] bg-white text-zinc-900 rounded-3xl p-10 shadow-2xl border border-zinc-200 flex items-center justify-center text-center">
                        <h4 className="text-2xl font-bold leading-relaxed">{allFlashcards[flashcardIndex].front}</h4>
                        <div className="absolute bottom-6 text-xs text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2"><RefreshCw size={14}/> Click to flip</div>
                      </div>
                      {/* Back */}
                      <div className="absolute inset-0 [backface-visibility:hidden] bg-zinc-800 text-white rounded-3xl p-10 shadow-2xl border border-zinc-700 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)]">
                        <div className="text-sm font-semibold text-indigo-400 mb-4 uppercase tracking-widest">Answer</div>
                        <p className="text-xl leading-relaxed text-zinc-100">{allFlashcards[flashcardIndex].back}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Controls */}
                  <div className="mt-10">
                    <AnimatePresence mode="wait">
                      {!cardFlipped ? (
                        <motion.div key="nav" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex justify-center gap-6">
                          <button onClick={(e) => { e.stopPropagation(); setCardFlipped(false); setFlashcardIndex(p => Math.max(0, p - 1)); }} disabled={flashcardIndex === 0} className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 disabled:opacity-50 text-white shadow-lg"><ChevronLeft size={24}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setFlashcardIndex(Math.floor(Math.random() * allFlashcards.length)); }} className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 text-white shadow-lg" title="Shuffle"><Shuffle size={20}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setCardFlipped(false); setFlashcardIndex(p => Math.min(allFlashcards.length - 1, p + 1)); }} disabled={flashcardIndex === allFlashcards.length - 1} className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-zinc-700 disabled:opacity-50 text-white shadow-lg"><ChevronRight size={24}/></button>
                        </motion.div>
                      ) : (
                        <motion.div key="rate" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="flex gap-4 w-full">
                          <button onClick={(e) => { e.stopPropagation(); rateFlashcard("no_idea"); }} className="flex-1 py-4 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold border-2 border-red-900/50 rounded-2xl transition-all hover:scale-[1.02]">No Idea</button>
                          <button onClick={(e) => { e.stopPropagation(); rateFlashcard("almost"); }} className="flex-1 py-4 bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 font-bold border-2 border-amber-900/50 rounded-2xl transition-all hover:scale-[1.02]">Almost</button>
                          <button onClick={(e) => { e.stopPropagation(); rateFlashcard("know_it"); }} className="flex-1 py-4 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 font-bold border-2 border-emerald-900/50 rounded-2xl transition-all hover:scale-[1.02]">Know It</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-8 flex justify-center border-t border-zinc-800 pt-6">
                    <button onClick={() => finishFlashcardSession()} className="px-6 py-3 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
                      Finish Practice Session
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 mt-12 bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800">
                  <Brain size={48} className="mx-auto mb-4 opacity-50"/>
                  <h3 className="text-xl font-medium text-zinc-400">No Flashcards Available</h3>
                  <p className="mt-2 text-sm">This course does not have any generated flashcards.</p>
                </div>
              )}
            </motion.div>
          ) : activeViewId === "assessment-history" ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key="history" className="max-w-3xl mx-auto mt-8">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-3xl flex items-center justify-center border border-blue-500/30 mx-auto mb-6">
                  <LineChartIcon size={32}/>
                </div>
                <h1 className="text-3xl font-bold mb-2">Performance History</h1>
                <p className="text-zinc-500 text-lg">Track your quiz scores over time</p>
              </div>

              {course.progress?.assessment_history?.length > 0 ? (
                <div className="space-y-8">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-semibold mb-6">Score Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={course.progress.assessment_history.map((h: any, i: number) => ({ attempt: `Attempt ${i + 1}`, score: h.score, date: new Date(h.date).toLocaleDateString() }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                          <XAxis dataKey="attempt" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#818cf8' }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#6366f1' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-900 text-zinc-400">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Attempt</th>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Score</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {course.progress.assessment_history.map((h: any, i: number) => (
                          <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-zinc-300">Attempt {i + 1}</td>
                            <td className="px-6 py-4 text-zinc-500">{new Date(h.date).toLocaleString()}</td>
                            <td className="px-6 py-4 font-bold">{h.score}%</td>
                            <td className="px-6 py-4">
                              {h.score >= 80 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-xs font-semibold"><CheckCircle2 size={14}/> Passed</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md text-xs font-semibold"><XCircle size={14}/> Needs Review</span>
                              )}
                            </td>
                          </tr>
                        )).reverse()}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 mt-12 bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800">
                  <LineChartIcon size={48} className="mx-auto mb-4 opacity-50"/>
                  <h3 className="text-xl font-medium text-zinc-400">No Assessment Data</h3>
                  <p className="mt-2 text-sm">Complete your first quiz to see your performance history.</p>
                </div>
              )}

              {course.progress?.flashcard_history?.length > 0 && (
                <div className="space-y-8 mt-16 pt-12 border-t border-zinc-800">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold mb-2">Flashcard Mastery</h2>
                    <p className="text-zinc-500">Track your practice session scores</p>
                  </div>
                  
                  <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Brain size={18} className="text-fuchsia-400"/> Flashcard Session Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={course.progress.flashcard_history.map((h: any, i: number) => ({ session: `Session ${i + 1}`, score: h.score, date: new Date(h.date).toLocaleDateString() }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                          <XAxis dataKey="session" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#e879f9' }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#e879f9" strokeWidth={3} dot={{ r: 4, fill: '#e879f9', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#d946ef' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-900 text-zinc-400">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Session</th>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Average Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {course.progress.flashcard_history.map((h: any, i: number) => (
                          <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-zinc-300">Session {i + 1}</td>
                            <td className="px-6 py-4 text-zinc-500">{new Date(h.date).toLocaleString()}</td>
                            <td className="px-6 py-4 font-bold text-fuchsia-400">{h.score}%</td>
                          </tr>
                        )).reverse()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
