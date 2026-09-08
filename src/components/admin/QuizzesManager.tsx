"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  Award,
  BarChart2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  AlertCircle,
  Check,
  Brain,
  FileText,
  Timer,
  Play,
  Eye
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Attempt {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  answers: Record<string, string>;
  completedAt: string;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  sourceText: string;
  questions: Question[];
  attempts: Attempt[];
  createdAt: string;
}

export default function QuizzesManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<"direct_import" | "follow_format">("direct_import");
  const [sourceText, setSourceText] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active quiz playing / reviewing states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  
  // Submit confirmation modal
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Timer state (seconds remaining)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom time limit from create modal (minutes, 0 = auto)
  const [customTimeLimitMin, setCustomTimeLimitMin] = useState<number>(0);

  // Resume modal state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingResumeQuiz, setPendingResumeQuiz] = useState<Quiz | null>(null);

  // Attempt history modal state
  const [selectedQuizHistory, setSelectedQuizHistory] = useState<Quiz | null>(null);
  // Which specific attempt is being reviewed in detail
  const [selectedReviewAttempt, setSelectedReviewAttempt] = useState<Attempt | null>(null);
  // Which tab is expanded for per-quiz history
  const [historyTab, setHistoryTab] = useState<"all" | string>("all");

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── localStorage helpers for quiz progress ──────────────────────────────────
  const PROGRESS_KEY = (id: string) => `quiz_progress_${id}`;

  const saveProgress = useCallback((quizId: string, answers: Record<string, string>, qIdx: number, secLeft: number | null, questionIds: string[] | null = null) => {
    try {
      localStorage.setItem(PROGRESS_KEY(quizId), JSON.stringify({ answers, qIdx, secLeft, savedAt: Date.now(), questionIds }));
    } catch {}
  }, []);

  const loadProgress = (quizId: string): { answers: Record<string, string>; qIdx: number; secLeft: number | null; questionIds?: string[] } | null => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY(quizId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const clearProgress = (quizId: string) => {
    try { localStorage.removeItem(PROGRESS_KEY(quizId)); } catch {}
  };

  // ── Countdown timer effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining === null || submissionResult) return;
    if (timeRemaining <= 0) {
      // Time's up — auto-submit
      showToast("⏰ Time's up! Auto-submitting your quiz...", "info");
      setShowSubmitConfirm(false);
      handleConfirmSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, submissionResult]);

  // Save progress to localStorage whenever answers/idx change
  useEffect(() => {
    if (activeQuiz && !submissionResult) {
      const questionIds = activeQuiz.questions.map(q => q.id);
      saveProgress(activeQuiz.id, userAnswers, currentQuestionIdx, timeRemaining, questionIds);
    }
  }, [userAnswers, currentQuestionIdx, timeRemaining, activeQuiz, submissionResult, saveProgress]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/quizzes");
      const data = await res.json();
      if (data.success && Array.isArray(data.quizzes)) {
        setQuizzes(data.quizzes);
      }
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) {
      showToast("Please paste some text, notes, or questions.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          topic: topic.trim() || undefined,
          questionCount,
          mode: createMode
        })
      });


      const data = await res.json();
      if (data.success && data.quiz) {
        showToast("Quiz generated successfully!", "success");
        setShowCreateModal(false);
        setSourceText("");
        setTopic("");
        fetchQuizzes();
        // Immediately start the new quiz
        startQuiz(data.quiz);
      } else {
        showToast(data.error || "Failed to generate quiz.", "error");
      }
    } catch (err: any) {
      showToast("Error generating quiz: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this quiz?")) return;

    try {
      const res = await fetch(`/api/admin/quizzes/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showToast("Quiz deleted.", "info");
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
        if (activeQuiz?.id === id) {
          setActiveQuiz(null);
          setSubmissionResult(null);
        }
      } else {
        showToast(data.error || "Could not delete quiz.", "error");
      }
    } catch (err: any) {
      showToast("Error deleting quiz: " + err.message, "error");
    }
  };

  const launchQuiz = (quiz: Quiz, savedAnswers: Record<string, string>, savedIdx: number, savedTime: number | null, savedQuestionIds?: string[]) => {
    // Stop any existing timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    let finalQuestions = [...quiz.questions];

    if (savedQuestionIds && savedQuestionIds.length === finalQuestions.length) {
      // Restore previous shuffle order
      const idToIndex = new Map(savedQuestionIds.map((id, i) => [id, i]));
      finalQuestions.sort((a, b) => (idToIndex.get(a.id) ?? 0) - (idToIndex.get(b.id) ?? 0));
    } else {
      // Fresh start: shuffle questions
      finalQuestions.sort(() => Math.random() - 0.5);
    }

    const shuffledQuiz = { ...quiz, questions: finalQuestions };

    setActiveQuiz(shuffledQuiz);
    setCurrentQuestionIdx(savedIdx);
    setUserAnswers(savedAnswers);
    setSubmissionResult(null);
    setIsSubmitting(false);
    // Restore or compute time
    const limit = savedTime ?? (customTimeLimitMin > 0
      ? customTimeLimitMin * 60
      : quiz.questions.length * 60); // 1 min per question default
    setTimeLimitSeconds(limit);
    setTimeRemaining(limit);
  };

  const startQuiz = (quiz: Quiz) => {
    const saved = loadProgress(quiz.id);
    if (saved && Object.keys(saved.answers).length > 0) {
      setPendingResumeQuiz(quiz);
      setShowResumeModal(true);
    } else {
      const limit = customTimeLimitMin > 0
        ? customTimeLimitMin * 60
        : quiz.questions.length * 60;
      launchQuiz(quiz, {}, 0, limit, undefined);
    }
  };

  const handleSelectOption = (questionId: string, optionText: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionText
    }));
  };

  // Opens the custom confirm modal (or submits directly if all answered)
  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    setShowSubmitConfirm(true);
  };

  // Called when user confirms inside the modal
  const handleConfirmSubmit = async () => {
    if (!activeQuiz) return;
    // Stop timer immediately
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(null);
    setShowSubmitConfirm(false);
    setIsSubmitting(true);
    // Clear saved progress since we're submitting
    clearProgress(activeQuiz.id);
    try {
      const res = await fetch(`/api/admin/quizzes/${activeQuiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: userAnswers })
      });

      const data = await res.json();
      if (data.success) {
        setSubmissionResult(data);
        showToast(`Quiz completed! Score: ${data.score}%`, data.passed ? "success" : "info");
        fetchQuizzes();
      } else {
        showToast(data.error || "Failed to submit quiz.", "error");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      showToast("Error submitting quiz: " + err.message, "error");
      setIsSubmitting(false);
    }
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Statistics calculation
  const totalQuizzes = quizzes.length;
  const totalAttempts = quizzes.reduce((acc, q) => acc + (q.attempts?.length || 0), 0);
  const allAttemptsScores = quizzes.flatMap((q) => q.attempts?.map((a) => a.score) || []);
  const avgScore = allAttemptsScores.length > 0 
    ? Math.round(allAttemptsScores.reduce((a, b) => a + b, 0) / allAttemptsScores.length) 
    : 0;
  const totalPassedAttempts = quizzes.flatMap((q) => q.attempts?.filter((a) => a.passed) || []).length;
  const passRate = totalAttempts > 0 ? Math.round((totalPassedAttempts / totalAttempts) * 100) : 0;

  return (
    <div className="flex flex-col space-y-8 min-h-screen pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-800"
                : toast.type === "error"
                ? "bg-red-950/90 text-red-300 border-red-800"
                : "bg-indigo-950/90 text-indigo-300 border-indigo-800"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={18} />}
            {toast.type === "error" && <AlertCircle size={18} />}
            {toast.type === "info" && <Sparkles size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Brain size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">AI Quiz Hub</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Post questions or study material and let AI create graded tests to test your knowledge
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-1">Total Quizzes</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{totalQuizzes}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-indigo-400">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-1">Attempts</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{totalAttempts}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-400">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-1">Avg Score</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{avgScore}%</h3>
          </div>
          <div className="p-2 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400">
            <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-1">Pass Rate</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{passRate}%</h3>
          </div>
          <div className="p-2 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-fuchsia-400">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* ACTIVE QUIZ PLAYER OR RESULTS VIEW */}
      {activeQuiz ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6"
        >
          {/* Header Bar */}
          {(() => {
            const mins = timeRemaining !== null ? Math.floor(timeRemaining / 60) : null;
            const secs = timeRemaining !== null ? timeRemaining % 60 : null;
            const isLow = timeRemaining !== null && timeRemaining <= 60;
            const isCritical = timeRemaining !== null && timeRemaining <= 30;
            return (
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                    {activeQuiz.topic || "Quiz"}
                  </span>
                  <h2 className="text-xl font-bold text-white">{activeQuiz.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* Countdown Timer */}
                  {timeRemaining !== null && !submissionResult && !isSubmitting && (
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono font-black text-sm transition-all ${
                      isCritical
                        ? "bg-red-950/80 border-red-600/80 text-red-300 animate-pulse"
                        : isLow
                        ? "bg-amber-950/80 border-amber-600/60 text-amber-300"
                        : "bg-zinc-950 border-zinc-700 text-zinc-200"
                    }`}>
                      <Timer size={15} className={isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-zinc-400"} />
                      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      // Save progress before exiting
                      if (activeQuiz && !submissionResult) {
                        const questionIds = activeQuiz.questions.map(q => q.id);
                        saveProgress(activeQuiz.id, userAnswers, currentQuestionIdx, timeRemaining, questionIds);
                        showToast("Progress saved! You can continue this quiz later.", "info");
                      }
                      if (timerRef.current) clearInterval(timerRef.current);
                      setTimeRemaining(null);
                      setActiveQuiz(null);
                      setSubmissionResult(null);
                    }}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-semibold border border-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <X size={15} /> Save & Exit
                  </button>
                </div>
              </div>
            );
          })()}

          {/* SUBMISSION RESULT SCREEN */}

          {submissionResult ? (
            <div className="space-y-8">
              {/* Score Banner */}
              <div
                className={`p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden ${
                  submissionResult.passed
                    ? "bg-gradient-to-br from-emerald-950/60 to-zinc-900 border-emerald-800/80"
                    : "bg-gradient-to-br from-red-950/60 to-zinc-900 border-red-800/80"
                }`}
              >
                <div className="space-y-2 text-center md:text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      submissionResult.passed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {submissionResult.passed ? (
                      <><CheckCircle2 size={14} /> Passed</>
                    ) : (
                      <><XCircle size={14} /> Needs Practice</>
                    )}
                  </span>
                  <h3 className="text-3xl font-black text-white">
                    {submissionResult.passed ? "Great Job! Quiz Passed 🎉" : "Keep Learning & Try Again 💪"}
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    You answered <span className="font-bold text-white">{submissionResult.correctCount}</span> out of{" "}
                    <span className="font-bold text-white">{submissionResult.totalCount}</span> questions correctly.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/80 border border-zinc-800 rounded-2xl min-w-[160px]">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Final Score</span>
                  <span
                    className={`text-5xl font-black mt-1 ${
                      submissionResult.passed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {submissionResult.score}%
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">Pass mark: 70%</span>
                </div>
              </div>

              {/* Question Breakdown List */}
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-indigo-400" /> Detailed Question Breakdown
                </h4>

                <div className="space-y-4">
                  {submissionResult.questions.map((q: Question & { userAnswer?: string; isCorrect?: boolean }, idx: number) => {
                    const selected = q.userAnswer ?? userAnswers[q.id];
                    const isCorrect = q.isCorrect ?? (selected === q.correctAnswer);

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-950/20 border-emerald-800/40"
                            : "bg-red-950/20 border-red-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <h5 className="font-semibold text-white text-base leading-snug">{q.question}</h5>
                              
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, oIdx) => {
                                  const isUserChoice = selected === opt;
                                  const isRightAnswer = q.correctAnswer === opt;

                                  let optionStyle = "bg-zinc-950/60 border-zinc-800/80 text-zinc-400";
                                  if (isRightAnswer) {
                                    optionStyle = "bg-emerald-950/80 border-emerald-600/80 text-emerald-200 font-medium";
                                  } else if (isUserChoice && !isRightAnswer) {
                                    optionStyle = "bg-red-950/80 border-red-600/80 text-red-200 font-medium";
                                  }

                                  return (
                                    <div
                                      key={oIdx}
                                      className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between ${optionStyle}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border border-current/30 shrink-0">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span>{opt}</span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {isRightAnswer && (
                                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-0.5">
                                            <Check size={10} /> Correct
                                          </span>
                                        )}
                                        {isUserChoice && !isRightAnswer && (
                                          <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold uppercase">
                                            Your Pick
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* AI Explanation Box */}
                              <div className={`mt-4 p-4 rounded-xl border text-xs space-y-1.5 ${
                                isCorrect
                                  ? "bg-emerald-950/30 border-emerald-800/30"
                                  : "bg-zinc-950/80 border-zinc-800"
                              }`}>
                                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                                  <Brain size={13} /> AI Tutor Explanation
                                </span>
                                <p className="text-zinc-300 leading-relaxed">{q.explanation || "Explanation generated by AI based on your performance."}</p>
                                {!isCorrect && selected && (
                                  <p className="text-zinc-500 text-[11px] mt-1">
                                    You selected: <span className="text-red-400 font-semibold">"{selected}"</span> · Correct was: <span className="text-emerald-400 font-semibold">"{q.correctAnswer}"</span>
                                  </p>
                                )}
                                {!selected && (
                                  <p className="text-zinc-500 text-[11px] mt-1 italic">You did not answer this question.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => startQuiz(activeQuiz)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Retake Quiz
                </button>
                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setSubmissionResult(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/20 text-center"
                >
                  Done & Back to Hub
                </button>
              </div>
            </div>
          ) : isSubmitting ? (
            /* GRADING / AI EXPLANATION LOADING SCREEN */
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain size={28} className="text-indigo-400" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Grading Your Quiz...</h3>
                <p className="text-zinc-400 text-sm max-w-sm">
                  AI is reviewing your answers and writing personalized explanations for each question. This may take a few seconds.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-full text-xs text-zinc-500">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                Generating explanations with AI...
              </div>
            </div>
          ) : (
            /* ACTIVE QUIZ TAKING QUESTION PLAYER */
            <div className="space-y-6">
              {/* Question Number Navigation Panel */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400 font-semibold">
                    Question Navigation — <span className="text-indigo-400">{Object.keys(userAnswers).length}</span> of {activeQuiz.questions.length} answered
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-600 inline-block" /> Current</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600/60 inline-block" /> Answered</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-800 inline-block" /> Unanswered</span>
                  </div>
                </div>
                <div className="flex overflow-x-auto sm:flex-wrap gap-2 pb-2 sm:pb-0 scroll-smooth scrollbar-none">
                  {activeQuiz.questions.map((q, idx) => {
                    const isAnswered = !!userAnswers[q.id];
                    const isCurrent = idx === currentQuestionIdx;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`w-9 h-9 shrink-0 rounded-lg text-xs font-bold border transition-all ${
                          isCurrent
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30 scale-110"
                            : isAnswered
                            ? "bg-emerald-600/20 border-emerald-600/50 text-emerald-300 hover:border-emerald-500"
                            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Overall progress bar */}
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(Object.keys(userAnswers).length / activeQuiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              {activeQuiz.questions[currentQuestionIdx] && (
                <motion.div
                  key={currentQuestionIdx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-950 border border-zinc-850 p-4 sm:p-6 md:p-8 rounded-2xl space-y-4 sm:space-y-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-black text-indigo-400 shrink-0">
                      {currentQuestionIdx + 1}
                    </span>
                    <h3 className="text-xl font-bold text-white leading-relaxed pt-1">
                      {activeQuiz.questions[currentQuestionIdx].question}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    {activeQuiz.questions[currentQuestionIdx].options.map((option, oIdx) => {
                      const questionId = activeQuiz.questions[currentQuestionIdx].id;
                      const isSelected = userAnswers[questionId] === option;

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(questionId, option)}
                          className={`w-full p-3 sm:p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 sm:gap-4 group ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-zinc-700 text-zinc-500 group-hover:border-zinc-500"
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className="flex-1">{option}</span>
                          {isSelected && <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Navigation & Submission Controls */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between pt-4 gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                  className="w-full sm:w-auto px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 text-sm font-semibold rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft size={18} /> Previous
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {currentQuestionIdx < activeQuiz.questions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((prev) => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                      className="flex-1 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      Next <ChevronRight size={18} />
                    </button>
                  )}

                  {/* Always-visible submit button */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitQuiz}
                    className={`flex-1 px-6 py-2.5 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                      isSubmitting
                        ? "bg-emerald-700/60 text-emerald-300 shadow-none cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    }`}
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                    ) : (
                      <><CheckCircle2 size={18} /> Submit Quiz</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* QUIZ LIST & EXPLORER GRID */
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search quizzes by title or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <span className="text-xs text-zinc-500 font-medium">
              Showing <strong className="text-zinc-300">{filteredQuizzes.length}</strong> quiz(zes)
            </span>
          </div>

          {/* Quizzes Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 h-56 flex flex-col justify-between animate-pulse"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                    <div className="h-6 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                  <div className="h-10 bg-zinc-800 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          ) : filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredQuizzes.map((quiz) => {
                const attempts = quiz.attempts || [];
                const highestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;

                return (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ y: -4 }}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 sm:p-6 rounded-2xl flex flex-col justify-between shadow-lg relative group transition-all"
                  >
                    <div>
                      {/* Topic Tag & Delete Button */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-full uppercase tracking-wider truncate mr-2">
                          {quiz.topic || "General"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-950 rounded-lg transition-colors shrink-0"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug">{quiz.title}</h3>

                      {/* Info Metadata */}
                      <div className="mt-4 space-y-2 text-[11px] sm:text-xs text-zinc-400">
                        <div className="flex items-center justify-between">
                          <span>Questions:</span>
                          <span className="font-semibold text-zinc-200">{quiz.questions?.length || 0} Qs</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Attempts taken:</span>
                          <span className="font-semibold text-zinc-200">{attempts.length} attempts</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Best Score:</span>
                          {highestScore !== null ? (
                            <span
                              className={`font-bold ${
                                highestScore >= 70 ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {highestScore}%
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic text-[10px] sm:text-xs">Not taken yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 sm:mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2">
                      <button
                        onClick={() => startQuiz(quiz)}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                      >
                        <span>Start Quiz</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {attempts.length > 0 && (
                        <button
                          onClick={() => { setSelectedReviewAttempt(null); setSelectedQuizHistory(quiz); }}
                          className="px-3 py-2.5 bg-zinc-950 hover:bg-indigo-600/20 border border-zinc-800 hover:border-indigo-500/50 text-zinc-400 hover:text-indigo-400 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                          title="View Attempt History"
                        >
                          <Clock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">History</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
              <div className="inline-block p-4 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500">
                <HelpCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">No Quizzes Found</h3>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                {searchTerm
                  ? "No quiz matched your search query. Try clearing filters."
                  : "You haven't generated any quizzes yet. Click '+ Create New Quiz' above to generate one with AI."}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={16} /> Create Quiz Now
              </button>
            </div>
          )}

          {/* BOTTOM SECTION: SCORES & ATTEMPTS HISTORY FOR ALL QUIZZES */}
          <div className="pt-8 border-t border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart2 size={20} className="text-emerald-400" /> Quiz Scores & Attempt History
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Real-time log of scores and performance for every quiz attempt
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-semibold">
                Total Logged Attempts: {quizzes.flatMap((q) => q.attempts || []).length}
              </span>
            </div>

            {(() => {
              const allAttempts = quizzes
                .flatMap((quiz) =>
                  (quiz.attempts || []).map((att) => ({
                    ...att,
                    quizTitle: quiz.title,
                    quizTopic: quiz.topic,
                    quizObj: quiz
                  }))
                )
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

              if (allAttempts.length === 0) {
                return (
                  <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-2">
                    <p className="text-zinc-400 text-xs font-medium">No quiz attempts recorded yet.</p>
                    <p className="text-zinc-500 text-[11px]">
                      Select any quiz above, click "Start Quiz", and complete a test to see your scores logged here!
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-950/80 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="py-3.5 px-4">Quiz Title</th>
                          <th className="py-3.5 px-4">Topic</th>
                          <th className="py-3.5 px-4">Score</th>
                          <th className="py-3.5 px-4">Correct</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Date Completed</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {allAttempts.map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-zinc-950/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate">
                              {attempt.quizTitle}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded uppercase">
                                {attempt.quizTopic || "General"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-black text-sm">
                              <span className={attempt.passed ? "text-emerald-400" : "text-red-400"}>
                                {attempt.score}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-zinc-300">
                              {attempt.correctCount} / {attempt.totalCount}
                            </td>
                            <td className="py-3.5 px-4">
                              {attempt.passed ? (
                                <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Passed
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-red-500/15 text-red-300 border border-red-500/30 text-[10px] font-bold rounded-full uppercase inline-flex items-center gap-1">
                                  <XCircle size={12} /> Needs Practice
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-500">
                              {new Date(attempt.completedAt).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setSelectedQuizHistory(attempt.quizObj); setSelectedReviewAttempt(attempt); }}
                                  className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 font-semibold text-xs rounded-lg border border-indigo-500/30 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Review answers"
                                >
                                  <Eye size={13} /> Review
                                </button>
                                <button
                                  onClick={() => startQuiz(attempt.quizObj)}
                                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs rounded-lg border border-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Retake quiz"
                                >
                                  <RotateCcw size={13} /> Retake
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* CREATE QUIZ MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles size={20} />
                  <h3 className="text-xl font-bold text-white">Generate AI Quiz</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleGenerateQuiz} className="space-y-5">
                {/* Creation Mode Selection Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Quiz Creation Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateMode("direct_import")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        createMode === "direct_import"
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                        <FileText size={16} className="text-indigo-400" /> Exact Import (All Pasted Questions)
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Extracts EVERY question you paste verbatim without rewriting, paraphrasing, or skipping any questions.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateMode("follow_format")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        createMode === "follow_format"
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                        <Sparkles size={16} className="text-purple-400" /> Follow Format (New Questions)
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Creates brand new questions that strictly follow the exact structure, format, and style of your sample.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Topic / Quiz Title <span className="text-zinc-600 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. React Hooks, System Design..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      <span className="flex items-center gap-1.5"><Timer size={12} /> Time Limit <span className="text-zinc-600 font-normal normal-case">(minutes, blank = auto)</span></span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={180}
                        placeholder={`Auto (${createMode === "follow_format" ? questionCount : "?"} min)`}
                        value={customTimeLimitMin || ""}
                        onChange={(e) => setCustomTimeLimitMin(Number(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      {customTimeLimitMin === 0 && (
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">1 min/Q</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {createMode === "direct_import"
                      ? "Paste Question(s) or Test Material"
                      : "Paste Sample Format, Notes, or Questions"}{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder={
                      createMode === "direct_import"
                        ? "Paste your raw questions here (e.g. Question 1... Question 2...). AI will parse every single question verbatim and form a graded quiz!"
                        : "Paste sample questions or study notes here. AI will analyze the format and generate brand new questions following that exact style!"
                    }
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                  />
                </div>

                {createMode === "follow_format" ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Number of New Questions to Generate
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[3, 5, 10, 15].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setQuestionCount(count)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            questionCount === count
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          {count} Questions
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>
                      <strong>Direct Import Mode Active:</strong> All questions found in your pasted content will be extracted and converted without rewriting.
                    </span>
                  </div>
                )}


                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl border border-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Generate & Start Quiz
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESUME QUIZ MODAL */}
      <AnimatePresence>
        {showResumeModal && pendingResumeQuiz && (() => {
          const saved = loadProgress(pendingResumeQuiz.id);
          const answeredSaved = saved ? Object.keys(saved.answers).length : 0;
          const totalQ = pendingResumeQuiz.questions.length;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Play size={30} />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-2xl font-black text-white">Continue Quiz?</h3>
                  <p className="text-zinc-400 text-sm">{pendingResumeQuiz.title}</p>
                  <p className="text-zinc-500 text-xs mt-1">You have a saved session with <span className="text-indigo-400 font-bold">{answeredSaved}</span> of {totalQ} questions answered.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl text-center">
                    <div className="text-2xl font-black text-indigo-400">{answeredSaved}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 uppercase tracking-wider">Answered</div>
                  </div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
                    <div className="text-2xl font-black text-zinc-400">{totalQ - answeredSaved}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 uppercase tracking-wider">Remaining</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowResumeModal(false);
                      if (saved) launchQuiz(pendingResumeQuiz, saved.answers, saved.qIdx, saved.secLeft, saved.questionIds);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                  >
                    <Play size={18} /> Continue Where I Left Off
                  </button>
                  <button
                    onClick={() => {
                      setShowResumeModal(false);
                      clearProgress(pendingResumeQuiz.id);
                      const limit = customTimeLimitMin > 0 ? customTimeLimitMin * 60 : pendingResumeQuiz.questions.length * 60;
                      launchQuiz(pendingResumeQuiz, {}, 0, limit, undefined);
                    }}
                    className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw size={16} /> Start Fresh
                  </button>
                  <button
                    onClick={() => { setShowResumeModal(false); setPendingResumeQuiz(null); }}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ATTEMPT HISTORY MODAL */}
      <AnimatePresence>
        {selectedQuizHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-zinc-900 border border-zinc-800 rounded-2xl ${selectedReviewAttempt ? "max-w-4xl" : "max-w-2xl"} w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                <div className="flex items-center gap-3">
                  {selectedReviewAttempt && (
                    <button
                      onClick={() => setSelectedReviewAttempt(null)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedReviewAttempt ? "Attempt Review" : selectedQuizHistory.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {selectedReviewAttempt
                        ? `${new Date(selectedReviewAttempt.completedAt).toLocaleString()} · Score: ${selectedReviewAttempt.score}%`
                        : `${selectedQuizHistory.attempts?.length || 0} attempt(s) recorded`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedQuizHistory(null); setSelectedReviewAttempt(null); }}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {selectedReviewAttempt ? (
                  /* ── DETAILED ATTEMPT REVIEW ── */
                  <div className="space-y-5">
                    {/* Score Banner */}
                    <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                      selectedReviewAttempt.passed
                        ? "bg-emerald-950/30 border-emerald-800/50"
                        : "bg-red-950/30 border-red-800/50"
                    }`}>
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          selectedReviewAttempt.passed
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}>
                          {selectedReviewAttempt.passed ? <><CheckCircle2 size={11} /> Passed</> : <><XCircle size={11} /> Failed</>}
                        </span>
                        <p className="text-white font-semibold mt-2">{selectedReviewAttempt.correctCount} of {selectedReviewAttempt.totalCount} correct</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-4xl font-black ${
                          selectedReviewAttempt.passed ? "text-emerald-400" : "text-red-400"
                        }`}>{selectedReviewAttempt.score}%</div>
                        <div className="text-[11px] text-zinc-500">Pass mark: 70%</div>
                      </div>
                    </div>

                    {/* Question-by-question breakdown */}
                    <div className="space-y-3">
                      {selectedQuizHistory.questions.map((q, idx) => {
                        const answers = selectedReviewAttempt.answers as Record<string, string>;
                        const userAnswer = answers?.[q.id];
                        const isCorrect = userAnswer === q.correctAnswer;

                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-xl border text-sm ${
                              isCorrect
                                ? "bg-emerald-950/20 border-emerald-800/40"
                                : "bg-red-950/20 border-red-800/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold border ${
                                isCorrect
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-red-500/20 border-red-500/40 text-red-400"
                              }`}>
                                {isCorrect ? <Check size={14} /> : <X size={14} />}
                              </div>
                              <div className="flex-1 space-y-2">
                                <p className="font-semibold text-white leading-snug">
                                  <span className="text-zinc-500 mr-1.5">Q{idx + 1}.</span>
                                  {q.question}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {q.options.map((opt, oIdx) => {
                                    const isUserPick = userAnswer === opt;
                                    const isRight = q.correctAnswer === opt;
                                    let style = "bg-zinc-900/60 border-zinc-800 text-zinc-400";
                                    if (isRight) style = "bg-emerald-950/60 border-emerald-700/60 text-emerald-200";
                                    else if (isUserPick) style = "bg-red-950/60 border-red-700/60 text-red-200";
                                    return (
                                      <div key={oIdx} className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${style}`}>
                                        <span className="font-bold shrink-0 opacity-60">{String.fromCharCode(65 + oIdx)}</span>
                                        <span className="flex-1">{opt}</span>
                                        {isRight && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">✓</span>}
                                        {isUserPick && !isRight && <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">✗</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                                {!userAnswer && (
                                  <p className="text-[11px] text-zinc-500 italic">Not answered</p>
                                )}
                                {!isCorrect && userAnswer && (
                                  <p className="text-[11px] text-zinc-500">
                                    You chose: <span className="text-red-400 font-semibold">{userAnswer}</span> · Correct: <span className="text-emerald-400 font-semibold">{q.correctAnswer}</span>
                                  </p>
                                )}

                                {/* AI Explanation Box */}
                                <div className={`mt-3 p-3.5 rounded-xl border text-xs space-y-1.5 ${
                                  isCorrect
                                    ? "bg-emerald-950/30 border-emerald-800/30"
                                    : "bg-zinc-950/80 border-zinc-800"
                                }`}>
                                  <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                                    <Brain size={13} /> AI Tutor Explanation
                                  </span>
                                  <p className="text-zinc-300 leading-relaxed">{q.explanation || "Explanation generated by AI based on your performance."}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── ATTEMPTS LIST ── */
                  <div className="space-y-3">
                    {selectedQuizHistory.attempts && selectedQuizHistory.attempts.length > 0 ? (
                      selectedQuizHistory.attempts.map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">
                                  Attempt #{selectedQuizHistory.attempts.length - idx}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                  att.passed
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}>
                                  {att.passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              <p className="text-zinc-500 text-[11px]">{new Date(att.completedAt).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className={`text-xl font-black ${
                                  att.passed ? "text-emerald-400" : "text-red-400"
                                }`}>{att.score}%</div>
                                <div className="text-[10px] text-zinc-500">{att.correctCount}/{att.totalCount} correct</div>
                              </div>
                              <button
                                onClick={() => setSelectedReviewAttempt(att)}
                                className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-400 hover:text-indigo-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                              >
                                <Eye size={13} /> Review
                              </button>
                            </div>
                          </div>

                          {/* Mini score bar */}
                          <div className="mt-3 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                att.passed ? "bg-emerald-500" : "bg-red-500"
                              }`}
                              style={{ width: `${att.score}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        No attempts recorded yet. Start the quiz to log your first attempt.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 p-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => startQuiz(selectedQuizHistory)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={13} /> {(selectedQuizHistory.attempts?.length || 0) > 0 ? "Retake Quiz" : "Start Quiz"}
                </button>
                <button
                  onClick={() => { setSelectedQuizHistory(null); setSelectedReviewAttempt(null); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl border border-zinc-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUBMIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSubmitConfirm && activeQuiz && (() => {
          const answeredCount = Object.keys(userAnswers).length;
          const totalCount = activeQuiz.questions.length;
          const unansweredCount = totalCount - answeredCount;
          const allAnswered = unansweredCount === 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-8 shadow-2xl shadow-black/60 space-y-6"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                    allAnswered
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}>
                    {allAnswered
                      ? <CheckCircle2 size={34} />
                      : <AlertCircle size={34} />
                    }
                  </div>
                </div>

                {/* Title & subtitle */}
                <div className="text-center space-y-1.5">
                  <h3 className="text-2xl font-black text-white">
                    {allAnswered ? "Ready to Submit?" : "Submit Anyway?"}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {allAnswered
                      ? "You've answered every question. Submit your quiz to see your score and AI-powered explanations."
                      : `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Unanswered questions will be marked incorrect.`
                    }
                  </p>
                </div>

                {/* Answered / Unanswered Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl text-center">
                    <div className="text-2xl font-black text-emerald-400">{answeredCount}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">Answered</div>
                  </div>
                  <div className={`p-4 rounded-2xl text-center border ${
                    unansweredCount > 0
                      ? "bg-amber-950/40 border-amber-800/40"
                      : "bg-zinc-900 border-zinc-800"
                  }`}>
                    <div className={`text-2xl font-black ${unansweredCount > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                      {unansweredCount}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">Skipped</div>
                  </div>
                </div>

                {/* Progress mini bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Quiz progress</span>
                    <span className="text-zinc-300 font-semibold">{answeredCount} / {totalCount}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                      style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-1">
                  <button
                    onClick={handleConfirmSubmit}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                      allAnswered
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
                        : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                    {allAnswered ? "Submit & Get My Score" : "Submit with Skipped Questions"}
                  </button>

                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="w-full py-3 rounded-2xl font-semibold text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={16} /> Keep Answering
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>

  );
}
