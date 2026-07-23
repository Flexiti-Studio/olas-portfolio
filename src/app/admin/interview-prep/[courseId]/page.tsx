"use client";
import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, RefreshCw, Shuffle, Check, X, Loader2, Target, Brain, ArrowLeft, Clock, Timer, LineChart as LineChartIcon, Video, Upload, Trash2, Film, Plus, Copy } from "lucide-react";
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
  const [quizStarted, setQuizStarted] = useState(false);
  
  const [quizStep, setQuizStep] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Flashcard swipe state
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);

  // Video Upload & Edit Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Cover image state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Toast & confirmation modal states
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedSectionIdx, setCopiedSectionIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedSectionIdx(idx);
      setTimeout(() => setCopiedSectionIdx(null), 2000);
    });
  };

  const showToast = (message: string, type: "error" | "success" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  useEffect(() => {
    fetch(`/api/interview-prep/${courseId}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(data => {
        if (data.error) {
          setCourse(null);
          setLoading(false);
          return;
        }
        setCourse(data);
        if (data.modules?.length) {
          setActiveModuleId(data.modules[0].id);
          if (data.modules[0].lessons?.length) setActiveViewId(data.modules[0].lessons[0].id);
          else setActiveViewId("final-quiz");
        }
        setLoading(false);
      })
      .catch(() => {
        setCourse(null);
        setLoading(false);
      });
  }, [courseId]);

  const activeModule = course?.modules?.find((m: any) => m.id === activeModuleId);
  const activeLesson = activeModule?.lessons?.find((l: any) => l.id === activeViewId);
  const completedLessons = course?.progress?.completed_lessons || [];

  const allQuestions = (course?.modules ?? []).map((m: any) => (m.quiz?.questions || []).map((q: any) => ({ ...q, id: `${m.id}_${q.id || Math.random()}` }))).flat();
  const allFlashcards = (course?.modules ?? []).map((m: any) => m.flashcards || []).flat();

  const handleCoverImageUpload = async (file: File) => {
    if (!activeLesson) return;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success && data?.url) {
        const existingContent = activeLesson.content || {};
        const updatedContent = { ...existingContent, coverImage: data.url };

        const updateRes = await fetch(`/api/interview-prep/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeLessonId: activeLesson.id, updatedContent })
        });

        if (updateRes.ok) {
          setCourse((prevCourse: any) => {
            if (!prevCourse) return prevCourse;
            const newModules = prevCourse.modules.map((m: any) => {
              if (m.id !== activeModuleId) return m;
              const newLessons = m.lessons.map((l: any) => {
                if (l.id !== activeLesson.id) return l;
                return { ...l, content: updatedContent };
              });
              return { ...m, lessons: newLessons };
            });
            return { ...prevCourse, modules: newModules };
          });
          showToast("Cover image uploaded successfully!", "success");
        } else {
          showToast("Failed to save cover image to lesson.", "error");
        }
      } else {
        showToast("Image upload failed: " + (data?.error || "Unknown error"), "error");
      }
    } catch (err: any) {
      showToast("Failed to upload image: " + err?.message, "error");
    }
    setIsUploadingImage(false);
  };

  const handleRemoveCoverImage = async () => {
    if (!activeLesson) return;
    showConfirm(
      "Remove Cover Image",
      "Are you sure you want to remove the cover image from this lesson?",
      async () => {
        try {
          const existingContent = activeLesson.content || {};
          const updatedContent = { ...existingContent, coverImage: null };

          const updateRes = await fetch(`/api/interview-prep/${courseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeLessonId: activeLesson.id, updatedContent })
          });

          if (updateRes.ok) {
            setCourse((prevCourse: any) => {
              if (!prevCourse) return prevCourse;
              const newModules = prevCourse.modules.map((m: any) => {
                if (m.id !== activeModuleId) return m;
                const newLessons = m.lessons.map((l: any) => {
                  if (l.id !== activeLesson.id) return l;
                  return { ...l, content: updatedContent };
                });
                return { ...m, lessons: newLessons };
              });
              return { ...prevCourse, modules: newModules };
            });
            showToast("Cover image removed successfully.", "success");
          } else {
            showToast("Failed to remove cover image.", "error");
          }
        } catch (err: any) {
          showToast("Error removing image: " + err?.message, "error");
        }
      }
    );
  };

  const handleVideoFileUpload = async (file: File) => {
    setIsUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success && data?.url) {
        setVideoUrlInput(data.url);
        showToast("Video uploaded successfully!", "success");
      } else {
        showToast("Video upload failed: " + (data?.error || "Unknown error"), "error");
      }
    } catch (err: any) {
      showToast("Failed to upload video: " + err?.message, "error");
    }
    setIsUploadingVideo(false);
  };

  const handleSaveVideoSection = async () => {
    if (!activeLesson || !videoUrlInput) {
      showToast("Please provide or upload a video.", "error");
      return;
    }
    setIsSavingVideo(true);
    try {
      const existingContent = activeLesson.content || {};
      const existingSections = Array.isArray(existingContent.sections) ? [...existingContent.sections] : [];
      
      const newVideoSection = {
        type: "video",
        heading: videoTitle || "Video Resource",
        video_url: videoUrlInput,
        body: videoDescription || ""
      };

      const updatedSections = [...existingSections, newVideoSection];
      const updatedContent = { ...existingContent, sections: updatedSections };

      const res = await fetch(`/api/interview-prep/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeLessonId: activeLesson.id, updatedContent })
      });

      if (res.ok) {
        setCourse((prevCourse: any) => {
          if (!prevCourse) return prevCourse;
          const newModules = prevCourse.modules.map((m: any) => {
            if (m.id !== activeModuleId) return m;
            const newLessons = m.lessons.map((l: any) => {
              if (l.id !== activeLesson.id) return l;
              return { ...l, content: updatedContent };
            });
            return { ...m, lessons: newLessons };
          });
          return { ...prevCourse, modules: newModules };
        });

        setVideoTitle("");
        setVideoUrlInput("");
        setVideoDescription("");
        setShowVideoModal(false);
        showToast("Video section added to lesson!", "success");
      } else {
        showToast("Failed to save video to lesson.", "error");
      }
    } catch (e: any) {
      showToast("Error saving video section: " + e?.message, "error");
    }
    setIsSavingVideo(false);
  };

  const handleDeleteVideoSection = async (indexToDelete: number) => {
    if (!activeLesson) return;
    showConfirm(
      "Remove Video Section",
      "Are you sure you want to remove this video section from the lesson?",
      async () => {
        try {
          const existingContent = activeLesson.content || {};
          const existingSections = Array.isArray(existingContent.sections) ? [...existingContent.sections] : [];
          const updatedSections = existingSections.filter((_, i) => i !== indexToDelete);
          const updatedContent = { ...existingContent, sections: updatedSections };

          const res = await fetch(`/api/interview-prep/${courseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeLessonId: activeLesson.id, updatedContent })
          });

          if (res.ok) {
            setCourse((prevCourse: any) => {
              if (!prevCourse) return prevCourse;
              const newModules = prevCourse.modules.map((m: any) => {
                if (m.id !== activeModuleId) return m;
                const newLessons = m.lessons.map((l: any) => {
                  if (l.id !== activeLesson.id) return l;
                  return { ...l, content: updatedContent };
                });
                return { ...m, lessons: newLessons };
              });
              return { ...prevCourse, modules: newModules };
            });
            showToast("Video section removed successfully.", "success");
          } else {
            showToast("Failed to remove video section.", "error");
          }
        } catch (e: any) {
          showToast("Error removing video: " + e?.message, "error");
        }
      }
    );
  };

  const updateProgress = async (lessonId: string): Promise<boolean> => {
    try {
      const currentCompleted = course?.progress?.completed_lessons || [];
      if (currentCompleted.includes(lessonId)) return true;
      const newCompleted = [...currentCompleted, lessonId];
      const res = await fetch(`/api/interview-prep/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed_lessons: newCompleted }),
      });
      if (res.ok) {
        setCourse((prev: any) => ({ ...prev, progress: { ...(prev?.progress || {}), completed_lessons: newCompleted } }));
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
      const modIndex = (course?.modules ?? []).findIndex((m: any) => m.id === activeModuleId);
      if (modIndex !== -1 && modIndex < (course?.modules ?? []).length - 1) {
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
      showConfirm(
        "Submit Quiz",
        "You have unanswered questions. Are you sure you want to submit the assessment?",
        () => performSubmitQuiz()
      );
      return;
    }
    await performSubmitQuiz();
  };

  const performSubmitQuiz = async () => {
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
    <div className="min-h-screen md:h-screen bg-zinc-950 text-white flex flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 w-full shrink-0">
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold text-sm truncate max-w-[200px] text-zinc-200">{course.title}</span>
        <div className="w-10"></div> {/* spacer */}
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-800 bg-zinc-900/95 flex flex-col shrink-0 transition-transform duration-300 md:static md:translate-x-0 md:bg-zinc-900/50 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <button onClick={() => router.push("/admin/interview-prep")} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"><ArrowLeft size={12} /> Back to Courses</button>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
          </div>
          <h2 className="font-semibold text-sm leading-tight">{course.title}</h2>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>Progress</span><span>{course.progress?.overall_percentage || 0}%</span></div>
            <div className="w-full bg-zinc-800 rounded-full h-1"><div className="bg-indigo-500 h-1 rounded-full transition-all" style={{width: `${course.progress?.overall_percentage || 0}%`}} /></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {(course?.modules ?? []).map((m: any, i: number) => {
              const modDone = m.lessons?.every((l: any) => completedLessons.includes(l.id)) ?? false;
              return (
                <div key={m.id} className="space-y-1">
                  <button onClick={() => { setActiveModuleId(m.id); setActiveViewId(m.lessons?.[0]?.id || "final-quiz"); setSidebarOpen(false); }}
                    className={`w-full text-left text-sm font-medium px-2 py-1.5 rounded-lg flex items-center justify-between ${activeModuleId === m.id ? "text-indigo-400" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
                    <span>Module {i + 1}</span>
                    {modDone && <CheckCircle2 size={14} className="text-emerald-500" />}
                  </button>
                  {activeModuleId === m.id && (
                    <div className="pl-3 space-y-0.5 border-l border-zinc-800 ml-2 mt-1">
                      {(m.lessons ?? []).map((l: any) => {
                        const done = completedLessons.includes(l.id);
                        const active = activeViewId === l.id;
                        return (
                          <button key={l.id} onClick={() => { setActiveViewId(l.id); setSidebarOpen(false); }}
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
            <button onClick={() => { setActiveViewId("final-quiz"); setQuizResults(null); setQuizStep(0); setSidebarOpen(false); }} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "final-quiz" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <Target size={16} className="shrink-0" />
              <span className="flex-1">Take Final Quiz</span>
              {course.progress?.quiz_average > 0 && <span className="text-xs text-indigo-400">{course.progress.quiz_average}%</span>}
            </button>
            <button onClick={() => { setActiveViewId("flashcards"); setCardFlipped(false); setFlashcardSessionFinished(false); setFlashcardSessionScores([]); setFlashcardIndex(0); setSidebarOpen(false); }} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "flashcards" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <Brain size={16} className="shrink-0" />
              <span className="flex-1">Practice Flashcards</span>
              {course.progress?.flashcard_mastery > 0 && <span className="text-xs text-fuchsia-400">{course.progress.flashcard_mastery}%</span>}
            </button>
            <button onClick={() => { setActiveViewId("assessment-history"); setSidebarOpen(false); }} className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center gap-2 ${activeViewId === "assessment-history" ? "bg-indigo-950/40 text-indigo-300" : "text-zinc-300 hover:bg-zinc-800/50"}`}>
              <LineChartIcon size={16} className="shrink-0" />
              <span>Performance History</span>
            </button>
          </div>
        </div>
      </div>
 
      {/* Centre Panel */}
      <div className="flex-1 overflow-y-auto bg-zinc-950 relative md:h-full">
        <div className="max-w-4xl mx-auto py-10 px-8 pb-32">
          {activeLesson ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={activeLesson.id} className="max-w-3xl mx-auto">
              {/* Lesson Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-800/50">
                  {activeModule?.title}
                </div>
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 hover:text-white hover:bg-indigo-900/60 flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Video size={14} />
                  <span>+ Add Video</span>
                </button>
              </div>

              <h1 className="text-3xl font-bold mb-2 leading-tight">{activeLesson.title}</h1>
              <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8">
                <span className="flex items-center gap-1"><Clock size={13}/> {activeLesson.estimated_minutes} min read</span>
                {completedLessons.includes(activeLesson.id) && (
                  <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={13}/> Completed</span>
                )}
              </div>

              {/* Introduction */}
              {activeLesson.content?.introduction && (
                <div className="mb-8 p-5 bg-gradient-to-br from-indigo-950/40 to-zinc-900/60 border border-indigo-800/30 rounded-2xl">
                  <p className="text-zinc-200 text-[16px] leading-relaxed font-medium">{activeLesson.content.introduction}</p>
                </div>
              )}

              {/* Cover Image */}
              <input 
                ref={imageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCoverImageUpload(e.target.files[0])}
              />
              {isUploadingImage ? (
                <div className="mb-8 border-2 border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-indigo-400 bg-zinc-900/30">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-sm font-medium text-zinc-400">Uploading cover image...</p>
                </div>
              ) : activeLesson.content?.coverImage ? (
                <div className="mb-8 relative group rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl aspect-video w-full bg-zinc-950">
                  <img src={activeLesson.content.coverImage} alt="Lesson Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setPreviewImageUrl(activeLesson.content.coverImage)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={() => imageFileRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200 transition-colors"
                    >
                      Change Image
                    </button>
                    <button 
                      onClick={handleRemoveCoverImage}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => imageFileRef.current?.click()}
                  className="mb-8 border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-zinc-600 hover:border-zinc-700 hover:text-zinc-500 transition-colors cursor-pointer group"
                >
                  <div className="text-4xl group-hover:scale-110 transition-transform">🖼️</div>
                  <p className="text-sm font-medium">Click to add a cover image for this lesson</p>
                  <p className="text-xs">PNG, JPG, GIF, WebP supported</p>
                </div>
              )}

              {/* Content Sections */}
              <div className="space-y-6">
                {(activeLesson.content?.sections ?? []).map((sec: any, i: number) => {
                  if (sec.type === "video") return (
                    <div key={i} className="space-y-3 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                          <Video size={18} className="text-indigo-400" />{sec.heading || "Video Explanation"}
                        </h4>
                        <button onClick={() => handleDeleteVideoSection(i)} className="text-xs text-red-400 hover:text-red-300 p-1.5 hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1">
                          <Trash2 size={13} /><span>Remove</span>
                        </button>
                      </div>
                      {sec.video_url?.includes("youtube.com") || sec.video_url?.includes("youtu.be") || sec.video_url?.includes("vimeo.com") ? (
                        <iframe src={sec.video_url.replace("watch?v=", "embed/")} className="w-full aspect-video rounded-xl border border-zinc-800 bg-black shadow-inner" allowFullScreen />
                      ) : (
                        <video src={sec.video_url || sec.body} controls className="w-full rounded-xl border border-zinc-800 bg-black aspect-video shadow-2xl" />
                      )}
                      {sec.body && sec.body !== sec.video_url && <p className="text-xs text-zinc-400 italic bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/50">{sec.body}</p>}
                    </div>
                  );
                  if (sec.type === "paragraph") return (
                    <div key={i} className="space-y-2">
                      {sec.heading && <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-4"><span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"/>{sec.heading}</h3>}
                      <p className="text-zinc-300 text-[15px] leading-relaxed pl-3">{sec.body}</p>
                    </div>
                  );
                  if (sec.type === "callout") return (
                    <div key={i} className="p-5 bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-2xl shadow-lg">
                      {sec.heading && <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">💡 {sec.heading}</div>}
                      <p className="text-indigo-100 text-[15px] leading-relaxed">{sec.body}</p>
                    </div>
                  );
                  if (sec.type === "code") return (
                    <div key={i} className="space-y-0">
                      {sec.heading && <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-4 mb-2"><span className="w-1 h-5 bg-emerald-500 rounded-full inline-block"/>{sec.heading}</h3>}
                      {sec.description && (
                        <p className="text-zinc-400 text-sm mb-2 leading-relaxed">{sec.description}</p>
                      )}
                      <div className="relative rounded-xl overflow-hidden border border-zinc-700/60 shadow-2xl">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 h-10 bg-zinc-800/90 border-b border-zinc-700/50">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500/70"/>
                            <span className="w-3 h-3 rounded-full bg-yellow-500/70"/>
                            <span className="w-3 h-3 rounded-full bg-green-500/70"/>
                            {sec.language && (
                              <span className="ml-3 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 uppercase tracking-wider">
                                {sec.language}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopyCode(sec.body || "", i)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                              copiedSectionIdx === i
                                ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/50"
                                : "bg-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-600/60 border border-zinc-600/40"
                            }`}
                          >
                            {copiedSectionIdx === i ? (
                              <><Check size={12} /> Copied!</>
                            ) : (
                              <><Copy size={12} /> Copy</>
                            )}
                          </button>
                        </div>
                        {/* Code body */}
                        <pre className="py-5 px-5 bg-zinc-950/90 overflow-x-auto text-sm font-mono text-emerald-300 leading-relaxed whitespace-pre">{sec.body}</pre>
                      </div>
                    </div>
                  );
                  if (sec.type === "bullets") return (
                    <div key={i} className="space-y-3">
                      {sec.heading && <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-4"><span className="w-1 h-5 bg-purple-500 rounded-full inline-block"/>{sec.heading}</h3>}
                      <ul className="space-y-2">
                        {sec.items?.map((item: string, j: number) => (
                          <li key={j} className="flex items-start gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{j+1}</span>
                            <span className="text-zinc-300 text-sm leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                  if (sec.type === "steps") return (
                    <div key={i} className="space-y-3">
                      {sec.heading && <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-4"><span className="w-1 h-5 bg-amber-500 rounded-full inline-block"/>{sec.heading}</h3>}
                      <ol className="space-y-3">
                        {sec.items?.map((item: string, j: number) => (
                          <li key={j} className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm font-bold shrink-0">{j+1}</span>
                            <div className="flex-1 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                              <p className="text-zinc-300 text-sm leading-relaxed">{item}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                  if (sec.type === "table") return (
                    <div key={i} className="space-y-3">
                      {sec.heading && <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-4"><span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"/>{sec.heading}</h3>}
                      <div className="overflow-x-auto border border-zinc-800 rounded-2xl bg-zinc-900/40">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/80">
                              {sec.headers?.map((h: string, idx: number) => (
                                <th key={idx} className="px-5 py-3.5 font-bold text-zinc-300 uppercase tracking-wider text-xs">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {sec.rows?.map((row: string[], rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-zinc-800/20 transition-colors">
                                {row.map((cell: string, cIdx: number) => (
                                  <td key={cIdx} className="px-5 py-4 text-zinc-300 leading-relaxed font-medium">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                  if (sec.type === "definition") {
                    const parts = (sec.body || "").split(":");
                    const term = parts[0];
                    const def = parts.slice(1).join(":");
                    return (
                      <div key={i} className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                        {sec.heading && <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">📖 {sec.heading}</div>}
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-bold text-lg">{term}</span>
                          <span className="text-zinc-400 text-sm leading-relaxed">{def}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Why This Matters */}
              {activeLesson.content?.whyThisMatters && (
                <div className="mt-10 p-6 bg-gradient-to-br from-amber-950/30 to-orange-950/20 border border-amber-900/50 rounded-2xl shadow-lg">
                  <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <Target size={16}/> Why This Matters in an Interview
                  </h4>
                  <p className="text-amber-100/80 text-[15px] leading-relaxed">{activeLesson.content.whyThisMatters}</p>
                </div>
              )}

              {/* Tip banner */}
              <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3 text-sm text-zinc-500">
                <Video size={16} className="text-indigo-400 shrink-0" />
                <span>Use <strong className="text-zinc-300">+ Add Video</strong> above to attach videos, demos, or walkthroughs to this lesson.</span>
              </div>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t border-zinc-800 flex items-center justify-between">
                <div className="text-xs text-zinc-600">
                  {activeModule?.lessons && `Lesson ${(activeModule.lessons.findIndex((l: any) => l.id === activeLesson.id) + 1)} of ${activeModule.lessons.length}`}
                </div>
                <button
                  onClick={handleLessonComplete}
                  disabled={isCompletingLesson || completedLessons.includes(activeLesson.id)}
                  className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-60 shadow-lg ${
                    completedLessons.includes(activeLesson.id)
                      ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/50"
                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                  }`}
                >
                  {isCompletingLesson ? <Loader2 size={18} className="animate-spin" /> : completedLessons.includes(activeLesson.id) ? <CheckCircle2 size={18}/> : null}
                  {isCompletingLesson ? "Saving..." : completedLessons.includes(activeLesson.id) ? "✓ Completed" : "Mark as Complete →"}
                </button>
              </div>
            </motion.div>

          ) : activeViewId === "final-quiz" ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key="final-quiz" className="max-w-3xl mx-auto">

              {/* ─── Quiz Results ─── */}
              {quizResults ? (
                <div className="mt-4">
                  {/* Score Hero */}
                  <div className={`rounded-3xl p-10 text-center mb-8 border ${
                    quizResults.passed
                      ? "bg-gradient-to-br from-emerald-950/60 to-zinc-900 border-emerald-800/50"
                      : "bg-gradient-to-br from-amber-950/60 to-zinc-900 border-amber-800/50"
                  }`}>
                    <div className="text-7xl mb-4">{quizResults.passed ? "🎉" : "📚"}</div>
                    <div className={`text-8xl font-black mb-3 ${
                      quizResults.passed ? "text-emerald-400" : "text-amber-400"
                    }`}>{quizResults.score}%</div>
                    <h2 className="text-2xl font-bold mb-1">{quizResults.passed ? "Assessment Passed!" : "Keep Studying"}</h2>
                    <p className="text-zinc-400 text-sm">
                      {quizResults.correct} correct out of {allQuestions.length} questions
                    </p>
                    <div className="flex justify-center gap-3 mt-8">
                      <button onClick={() => { setQuizResults(null); setQuizAnswers({}); setQuizStep(0); setQuizStarted(false); }} className="px-6 py-2.5 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
                        Retake Quiz
                      </button>
                      <button onClick={() => { setActiveViewId("flashcards"); setCardFlipped(false); setFlashcardSessionFinished(false); setFlashcardIndex(0); setFlashcardSessionScores([]); }} className="px-6 py-2.5 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-colors flex items-center gap-2">
                        <Brain size={16}/> Practice Flashcards
                      </button>
                    </div>
                  </div>

                  {/* Per-question breakdown */}
                  <h3 className="text-lg font-bold mb-4 text-zinc-300">Question Review</h3>
                  <div className="space-y-4">
                    {allQuestions.map((q: any, i: number) => {
                      const chosen = quizAnswers[q.id];
                      const correct = q.correctAnswer;
                      const isRight = chosen === correct;
                      const opts = q.options?.length ? q.options : ["True", "False"];
                      const letters = ["A", "B", "C", "D", "E"];
                      return (
                        <div key={q.id} className={`rounded-2xl border p-5 ${
                          isRight ? "bg-emerald-950/20 border-emerald-800/40" : "bg-red-950/20 border-red-800/40"
                        }`}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isRight ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            }`}>{i + 1}</span>
                            <p className="text-zinc-200 font-medium text-[15px] leading-snug">{q.question}</p>
                          </div>
                          <div className="space-y-1.5 pl-10">
                            {opts.map((opt: string, j: number) => {
                              const isChosen = opt === chosen;
                              const isCorrect = opt === correct;
                              let cls = "bg-zinc-900/50 border-zinc-800 text-zinc-400";
                              if (isCorrect) cls = "bg-emerald-950/50 border-emerald-700 text-emerald-300";
                              else if (isChosen && !isCorrect) cls = "bg-red-950/50 border-red-700 text-red-300";
                              return (
                                <div key={opt} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${cls}`}>
                                  <span className="w-5 h-5 rounded border border-current flex items-center justify-center text-xs font-bold shrink-0">{letters[j]}</span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <CheckCircle2 size={14} className="text-emerald-400 shrink-0"/>}
                                  {isChosen && !isCorrect && <XCircle size={14} className="text-red-400 shrink-0"/>}
                                </div>
                              );
                            })}
                          </div>
                          {q.explanation && (
                            <div className="mt-3 pl-10 text-xs text-zinc-500 leading-relaxed">
                              <span className="font-semibold text-zinc-400">Explanation: </span>{q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : !quizStarted ? (
                /* ─── Quiz Start Screen ─── */
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                  <div className="w-24 h-24 bg-indigo-500/20 rounded-3xl flex items-center justify-center border border-indigo-500/30 mb-6 shadow-2xl shadow-indigo-900/20">
                    <Target size={44} className="text-indigo-400"/>
                  </div>
                  <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Course Assessment</h1>
                  <p className="text-zinc-400 text-lg mb-8 max-w-sm">
                    Test your knowledge across all {course.modules?.length} modules with {allQuestions.length} questions.
                  </p>

                  <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{allQuestions.length}</div>
                      <div className="text-xs text-zinc-500 mt-1">Questions</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{Math.ceil(allQuestions.length * 1.5)}</div>
                      <div className="text-xs text-zinc-500 mt-1">Minutes</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-400">80%</div>
                      <div className="text-xs text-zinc-500 mt-1">Pass Mark</div>
                    </div>
                  </div>

                  {course.progress?.quiz_average > 0 && (
                    <div className="mb-6 text-sm text-zinc-500">
                      Your best score: <span className="text-indigo-400 font-bold">{course.progress.quiz_average}%</span>
                    </div>
                  )}

                  <button
                    onClick={() => { setQuizStarted(true); setQuizStep(0); setQuizAnswers({}); }}
                    className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-2xl transition-all hover:scale-105 shadow-2xl shadow-indigo-900/40 flex items-center gap-3"
                  >
                    <Target size={22}/> Start Quiz
                  </button>
                </div>

              ) : allQuestions.length > 0 ? (
                /* ─── Active Quiz ─── */
                <div className="space-y-6">
                  {/* Progress bar */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{width: `${((quizStep + 1) / allQuestions.length) * 100}%`}} />
                    </div>
                    <div className="text-sm font-semibold text-zinc-400 shrink-0">{quizStep + 1}/{allQuestions.length}</div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shrink-0 ${
                      timeLeft && timeLeft < 60 ? "bg-red-950/40 text-red-400 border-red-500/50 animate-pulse" : "bg-zinc-900 text-zinc-300 border-zinc-700"
                    }`}>
                      <Timer size={14}/> {formatTime(timeLeft)}
                    </div>
                  </div>

                  {/* Question jump dots */}
                  <div className="flex flex-wrap gap-2">
                    {allQuestions.map((q: any, i: number) => {
                      const answered = !!quizAnswers[q.id];
                      const active = i === quizStep;
                      return (
                        <button key={q.id} onClick={() => setQuizStep(i)}
                          className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                            active ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-zinc-950 scale-110"
                            : answered ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                          }`}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Card */}
                  <AnimatePresence mode="wait">
                    <motion.div key={quizStep}
                      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.18 }}
                      className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-xl"
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-800/50">
                          {allQuestions[quizStep].type === "true_false" ? "True / False" : "Multiple Choice"}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-7 leading-relaxed text-white">{allQuestions[quizStep].question}</h3>

                      <div className="space-y-3">
                        {(allQuestions[quizStep].options?.length
                          ? allQuestions[quizStep].options
                          : ["True", "False"]
                        ).map((opt: string, oi: number) => {
                          const letters = ["A", "B", "C", "D", "E"];
                          const selected = quizAnswers[allQuestions[quizStep].id] === opt;
                          return (
                            <button key={opt}
                              onClick={() => setQuizAnswers(p => ({...p, [allQuestions[quizStep].id]: opt}))}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${
                                selected
                                  ? "bg-indigo-900/60 border-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                                  : "bg-zinc-900/60 border-zinc-700/60 hover:border-zinc-500 text-zinc-300 hover:bg-zinc-800/60"
                              }`}
                            >
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                                selected ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                              }`}>{letters[oi]}</span>
                              <span className="font-medium text-[15px] flex-1">{opt}</span>
                              {selected && <CheckCircle2 size={20} className="text-indigo-400 shrink-0"/>}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => setQuizStep(p => Math.max(0, p - 1))} disabled={quizStep === 0 || isGrading}
                      className="px-5 py-2.5 rounded-xl font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center gap-2 transition-colors">
                      <ChevronLeft size={18}/> Back
                    </button>
                    <div className="flex items-center gap-3">
                      {quizStep < allQuestions.length - 1 ? (
                        <button onClick={() => setQuizStep(p => Math.min(allQuestions.length - 1, p + 1))} disabled={isGrading}
                          className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/30">
                          Next <ChevronRight size={18}/>
                        </button>
                      ) : (
                        <button onClick={() => submitQuiz(false)} disabled={isGrading}
                          className="px-8 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/30">
                          {isGrading ? <Loader2 size={18} className="animate-spin"/> : "Submit Quiz ✓"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              ) : (
                <div className="text-center text-zinc-500 mt-12 bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800">
                  <Target size={48} className="mx-auto mb-4 opacity-40"/>
                  <h3 className="text-xl font-medium text-zinc-400">No Assessment Available</h3>
                  <p className="mt-2 text-sm">Generate a course to create quiz questions.</p>
                </div>
              )}
            </motion.div>

          ) : activeViewId === "flashcards" ? (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key="flashcards" className="max-w-2xl mx-auto">

              {flashcardSessionFinished ? (
                /* ─── Session Results ─── */
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                  <div className="text-7xl mb-4">🧠</div>
                  <div className="text-7xl font-black text-fuchsia-400 mb-2">{flashcardSessionScoreAverage}%</div>
                  <p className="text-zinc-400 uppercase tracking-widest text-xs font-bold mb-2">Session Score</p>
                  <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                  <p className="text-zinc-500 text-sm mb-8">
                    Overall mastery: <span className="text-fuchsia-400 font-bold">{course.progress?.flashcard_mastery || 0}%</span>
                  </p>

                  {/* Score breakdown */}
                  <div className="flex gap-4 mb-10">
                    {[
                      { label: "Know It", color: "text-emerald-400", count: flashcardSessionScores.filter(s => s === 100).length },
                      { label: "Almost",  color: "text-amber-400",   count: flashcardSessionScores.filter(s => s === 50).length  },
                      { label: "No Idea", color: "text-red-400",     count: flashcardSessionScores.filter(s => s === 0).length   },
                    ].map(({ label, color, count }) => (
                      <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-center">
                        <div className={`text-2xl font-bold ${color}`}>{count}</div>
                        <div className="text-xs text-zinc-500 mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setFlashcardSessionFinished(false); setFlashcardIndex(0); setCardFlipped(false); setFlashcardSessionScores([]); }}
                      className="px-6 py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
                      Practice Again
                    </button>
                    <button onClick={() => { setActiveViewId("final-quiz"); setQuizStarted(false); setQuizResults(null); setQuizStep(0); }}
                      className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2">
                      <Target size={16}/> Take Quiz
                    </button>
                  </div>
                </div>

              ) : allFlashcards.length > 0 ? (
                <div>
                  {/* Header */}
                  <div className="text-center mb-8 pt-4">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <Brain size={20} className="text-fuchsia-400"/>
                      <h1 className="text-2xl font-bold">Flashcards</h1>
                    </div>
                    <p className="text-zinc-500 text-sm">
                      {flashcardIndex + 1} of {allFlashcards.length} cards
                      {flashcardSessionScores.length > 0 && (
                        <span className="ml-3 text-fuchsia-400 font-semibold">
                          {flashcardSessionScores.filter(s => s === 100).length} known
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Progress dots */}
                  <div className="flex gap-1.5 justify-center mb-6 flex-wrap">
                    {allFlashcards.map((_: any, i: number) => {
                      const s = flashcardSessionScores[i];
                      return (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${
                          i === flashcardIndex ? "w-6 bg-fuchsia-400"
                          : s === 100 ? "w-3 bg-emerald-500"
                          : s === 50  ? "w-3 bg-amber-500"
                          : s === 0   ? "w-3 bg-red-500"
                          : "w-3 bg-zinc-700"
                        }`}/>
                      );
                    })}
                  </div>

                  {/* Swipeable Card */}
                  <div className="relative">
                    {/* Swipe hint labels */}
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 ${
                      dragX < -30 ? "opacity-100" : "opacity-0"
                    }`}>
                      <span className="bg-red-500/80 text-white text-xs font-black px-3 py-1.5 rounded-lg rotate-[-8deg] block">NOPE</span>
                    </div>
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 ${
                      dragX > 30 ? "opacity-100" : "opacity-0"
                    }`}>
                      <span className="bg-emerald-500/80 text-white text-xs font-black px-3 py-1.5 rounded-lg rotate-[8deg] block">GOT IT</span>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={flashcardIndex}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.3}
                        onDrag={(_e, info) => setDragX(info.offset.x)}
                        onDragEnd={(_e, info) => {
                          setDragX(0);
                          if (info.offset.x > 80) {
                            // swipe right = know it
                            setSwipeDir("right");
                            setTimeout(() => { setSwipeDir(null); rateFlashcard("know_it"); }, 200);
                          } else if (info.offset.x < -80) {
                            // swipe left = no idea
                            setSwipeDir("left");
                            setTimeout(() => { setSwipeDir(null); rateFlashcard("no_idea"); }, 200);
                          }
                        }}
                        animate={swipeDir === "left" ? { x: -400, opacity: 0, rotate: -20 } : swipeDir === "right" ? { x: 400, opacity: 0, rotate: 20 } : { x: 0, opacity: 1, rotate: 0 }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{ cursor: "grab", touchAction: "pan-y" }}
                        className="relative w-full [perspective:1200px]"
                        onClick={() => setCardFlipped(!cardFlipped)}
                      >
                        <motion.div
                          initial={false}
                          animate={{ rotateY: cardFlipped ? 180 : 0 }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          className="w-full [transform-style:preserve-3d] relative"
                          style={{ minHeight: "320px" }}
                        >
                          {/* Front */}
                          <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Question</div>
                            <h3 className="text-2xl font-bold text-white leading-relaxed mb-8">{allFlashcards[flashcardIndex].front}</h3>
                            <div className="flex items-center gap-2 text-zinc-600 text-xs">
                              <RefreshCw size={12}/> Tap to reveal · Swipe to rate
                            </div>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-indigo-950 to-zinc-900 border border-indigo-800/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">Answer</div>
                            <p className="text-xl text-zinc-100 leading-relaxed mb-8">{allFlashcards[flashcardIndex].back}</p>
                            <div className="flex items-center gap-2 text-indigo-700 text-xs">
                              <RefreshCw size={12}/> Swipe right = know it · Swipe left = no idea
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Rating buttons (shown after flip) */}
                  <AnimatePresence>
                    {cardFlipped ? (
                      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:20}}
                        className="flex gap-3 mt-6"
                      >
                        <button onClick={(e) => { e.stopPropagation(); rateFlashcard("no_idea"); }}
                          className="flex-1 py-3.5 bg-red-950/50 hover:bg-red-900/70 text-red-400 font-bold border-2 border-red-900/50 rounded-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                          <span className="text-lg">😕</span> No Idea
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); rateFlashcard("almost"); }}
                          className="flex-1 py-3.5 bg-amber-950/50 hover:bg-amber-900/70 text-amber-400 font-bold border-2 border-amber-900/50 rounded-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                          <span className="text-lg">🤔</span> Almost
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); rateFlashcard("know_it"); }}
                          className="flex-1 py-3.5 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-400 font-bold border-2 border-emerald-900/50 rounded-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                          <span className="text-lg">✅</span> Know It
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="flex justify-center gap-4 mt-6"
                      >
                        <button onClick={(e) => { e.stopPropagation(); setCardFlipped(false); setFlashcardIndex(p => Math.max(0, p - 1)); }}
                          disabled={flashcardIndex === 0}
                          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 flex items-center justify-center text-white shadow-lg transition-colors">
                          <ChevronLeft size={20}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setFlashcardIndex(Math.floor(Math.random() * allFlashcards.length)); setCardFlipped(false); }}
                          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white shadow-lg transition-colors" title="Shuffle">
                          <Shuffle size={18}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setCardFlipped(false); setFlashcardIndex(p => Math.min(allFlashcards.length - 1, p + 1)); }}
                          disabled={flashcardIndex === allFlashcards.length - 1}
                          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 flex items-center justify-center text-white shadow-lg transition-colors">
                          <ChevronRight size={20}/>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Finish */}
                  <div className="mt-8 flex justify-center">
                    <button onClick={() => finishFlashcardSession()}
                      className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors">
                      Finish Session
                    </button>
                  </div>
                </div>

              ) : (
                <div className="text-center text-zinc-500 mt-12 bg-zinc-900/50 p-12 rounded-3xl border border-zinc-800">
                  <Brain size={48} className="mx-auto mb-4 opacity-40"/>
                  <h3 className="text-xl font-medium text-zinc-400">No Flashcards Available</h3>
                  <p className="mt-2 text-sm">Generate a course to create flashcards.</p>
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
                        <LineChart data={(course?.progress?.assessment_history ?? []).map((h: any, i: number) => ({ attempt: `Attempt ${i + 1}`, score: h.score, date: new Date(h.date).toLocaleDateString() }))}>
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
                        {(course?.progress?.assessment_history ?? []).map((h: any, i: number) => (
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
                        <LineChart data={(course?.progress?.flashcard_history ?? []).map((h: any, i: number) => ({ session: `Session ${i + 1}`, score: h.score, date: new Date(h.date).toLocaleDateString() }))}>
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
                        {(course?.progress?.flashcard_history ?? []).map((h: any, i: number) => (
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

      {/* Video Upload & Editing Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Video className="text-indigo-400" size={20} />
                  <h3 className="text-lg font-bold text-white">Add Video to Lesson</h3>
                </div>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Video Title / Heading
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. System Design Mock Answer Video"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Video File Upload or URL
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="video-file-input"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleVideoFileUpload(f);
                        }}
                      />
                      <label
                        htmlFor="video-file-input"
                        className={`flex-1 py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-all ${
                          isUploadingVideo ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {isUploadingVideo ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                            <span>Uploading Video...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} className="text-indigo-400" />
                            <span>Upload MP4 / WebM File</span>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="text-center text-[11px] text-zinc-500 font-semibold uppercase">or paste link</div>

                    <input
                      type="text"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://... or YouTube link"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                    />

                    {videoUrlInput && (
                      <div className="mt-3">
                        <div className="text-[11px] text-zinc-500 font-semibold uppercase mb-1">Preview Player</div>
                        <div className="w-full aspect-video rounded-xl border border-zinc-800 bg-black overflow-hidden flex items-center justify-center relative shadow-inner">
                          {videoUrlInput.includes("youtube.com") || videoUrlInput.includes("youtu.be") || videoUrlInput.includes("vimeo.com") ? (
                            <iframe 
                              src={videoUrlInput.replace("watch?v=", "embed/")} 
                              className="w-full h-full" 
                              allowFullScreen 
                            />
                          ) : (
                            <video 
                              src={videoUrlInput} 
                              controls 
                              className="w-full h-full object-contain" 
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Video Description / Notes (Optional)
                  </label>
                  <textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    rows={3}
                    placeholder="Add brief notes or timestamps for this video..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVideoSection}
                  disabled={isSavingVideo || !videoUrlInput}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingVideo ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Film size={14} />
                      <span>Save Video to Lesson</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border ${
              toast.type === "error" ? "bg-red-950/90 border-red-900/50 text-red-200" : 
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-900/50 text-emerald-200" : 
              "bg-zinc-900 border-zinc-800 text-white"
            }`}
          >
            {toast.type === "error" ? <XCircle size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Lightbox */}
      <AnimatePresence>
        {previewImageUrl && (
          <div 
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 text-white hover:bg-black/85 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
