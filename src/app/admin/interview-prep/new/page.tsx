"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, ChevronRight, CheckCircle2, Loader2, BookOpen } from "lucide-react";

const FOCUS_AREAS = ["Technical Skills","Behavioural Questions","System Design","Company Culture","Role-specific Knowledge","General Interview Tips"];
const DEPTHS = [
  { id: "quick", label: "Quick", sub: "3 modules" },
  { id: "standard", label: "Standard", sub: "5 modules" },
  { id: "comprehensive", label: "Comprehensive", sub: "8+ modules" },
];
const STEPS = ["Analysing your material...","Structuring course modules...","Writing lesson content...","Generating quiz questions...","Creating flashcards...","Finalising your course..."];

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text;
}

export default function CourseCreator() {
  const router = useRouter();
  const [tab, setTab] = useState<"text" | "pdf">("text");
  const [pastedText, setPastedText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseType, setCourseType] = useState<"interview" | "learning">("interview");
  const [learningLevel, setLearningLevel] = useState<"basic" | "beginners" | "advanced">("basic");
  const [applicationId, setApplicationId] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [depth, setDepth] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [syllabusStatus, setSyllabusStatus] = useState<"pending" | "generating" | "completed">("pending");
  const [syllabusStep, setSyllabusStep] = useState(1); // 1: analysing, 2: structuring
  const [modulesList, setModulesList] = useState<{ id: string; title: string; status: "pending" | "generating" | "completed" }[]>([]);
  const [currentGeneratingModuleIndex, setCurrentGeneratingModuleIndex] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{message: string, type: "error" | "success" | "info"} | null>(null);

  const showToast = (message: string, type: "error" | "success" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch("/api/applications").then(r => r.json()).then(setApplications).catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) return;
    setPdfFile(file);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfPages(pdf.numPages);
    } catch {}
  }, []);

  const toggleFocus = (area: string) =>
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);

  const handleGenerate = async () => {
    let text = "";
    if (tab === "text") text = pastedText.trim();
    else if (pdfFile) {
      try { text = await extractPdfText(pdfFile); } catch { showToast("Failed to read PDF.", "error"); return; }
    }
    if (!text) { showToast("Please provide study material.", "error"); return; }

    const linkedApp = applications.find(a => a.id === applicationId);
    setIsGenerating(true);
    setSyllabusStatus("generating");
    setSyllabusStep(1);
    setModulesList([]);
    setCurrentGeneratingModuleIndex(null);

    try {
      const res = await fetch("/api/interview-prep/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text, title: courseTitle, focusAreas, depth, applicationId: applicationId || null,
          applicationRole: linkedApp?.job_title, applicationCompany: linkedApp?.company,
          courseType, learningLevel
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generatedCourse: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.step) {
              setSyllabusStep(data.step);
            }
            if (data.result) generatedCourse = data.result;
          } catch {}
        }
      }

      if (!generatedCourse?.modules?.length) { 
        showToast("Syllabus generation failed. Try again.", "error"); 
        setIsGenerating(false); 
        return; 
      }

      setSyllabusStatus("completed");

      const saveRes = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedCourse.title || courseTitle || "Interview Prep Course",
          description: generatedCourse.description,
          sourceType: tab,
          sourceText: tab === "text" ? text : `[PDF: ${pdfFile?.name}]`,
          focusAreas,
          depth,
          estimatedDuration: generatedCourse.estimatedDuration,
          applicationId: applicationId || null,
          modules: generatedCourse.modules,
        }),
      });

      if (saveRes.ok) {
        const saved = await saveRes.json();
        const initialModules = saved.modules.map((m: any) => ({
          id: m.id,
          title: m.title,
          status: "pending" as const
        }));
        setModulesList(initialModules);

        // Sequentially generate content for each module
        for (let i = 0; i < initialModules.length; i++) {
          setCurrentGeneratingModuleIndex(i);
          setModulesList(prev => prev.map((m, idx) => idx === i ? { ...m, status: "generating" } : m));

          const modGenRes = await fetch("/api/interview-prep/generate-module", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: saved.id,
              moduleId: initialModules[i].id,
              courseType,
              learningLevel
            })
          });

          if (!modGenRes.ok) {
            showToast(`Warning: Failed to generate content for "${initialModules[i].title}".`, "error");
          }
          setModulesList(prev => prev.map((m, idx) => idx === i ? { ...m, status: "completed" } : m));
        }

        showToast("Course created successfully!", "success");
        router.push(`/admin/interview-prep/${saved.id}`);
      } else {
        const err = await saveRes.json();
        showToast(`Failed to save course syllabus: ${err.error || "Unknown error"}`, "error"); 
        setIsGenerating(false);
      }
    } catch (err) {
      console.error(err); showToast("An error occurred during generation.", "error"); setIsGenerating(false);
    }
  };

  if (isGenerating) {
    const totalSteps = 1 + modulesList.length;
    const completedCount = (syllabusStatus === "completed" ? 1 : 0) + modulesList.filter(m => m.status === "completed").length;
    const progressPercent = totalSteps > 1 ? Math.round((completedCount / totalSteps) * 100) : 0;

    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <BookOpen size={40} className="mx-auto mb-4 text-indigo-400 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Building Your Course</h2>
            <p className="text-zinc-500 text-sm">Syllabus structured! Generating detailed lessons, flashcards, and tests sequentially.</p>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
            {/* Syllabus step */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
              syllabusStatus === "completed" ? "border-emerald-800/40 bg-emerald-950/10 text-emerald-400" :
              syllabusStatus === "generating" ? "border-indigo-800 bg-indigo-950/20 text-white" :
              "border-zinc-800 bg-zinc-900/30 text-zinc-500"
            }`}>
              {syllabusStatus === "completed" ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> :
                syllabusStatus === "generating" ? <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" /> :
                <div className="w-[18px] h-[18px] rounded-full border border-zinc-800 shrink-0" />}
              <div className="flex-1 text-sm font-semibold">
                {syllabusStatus === "completed" ? "Syllabus outline structured" :
                  syllabusStep === 1 ? "Analysing study material..." : "Structuring course syllabus..."}
              </div>
            </div>

            {/* Modules steps */}
            {modulesList.map((m, idx) => {
              const isGeneratingMod = m.status === "generating";
              const isDone = m.status === "completed";

              return (
                <div key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                  isDone ? "border-emerald-800/40 bg-emerald-950/10 text-emerald-400" :
                  isGeneratingMod ? "border-indigo-800 bg-indigo-950/20 text-white font-medium" :
                  "border-zinc-800 bg-zinc-900/30 text-zinc-600"
                }`}>
                  {isDone ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> :
                    isGeneratingMod ? <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" /> :
                    <div className="w-[18px] h-[18px] rounded-full border border-zinc-800 shrink-0" />}
                  <span className="text-sm">
                    {isGeneratingMod ? "Generating " : ""}Module {idx + 1}: {m.title}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-indigo-500/20 rounded-2xl mb-4"><BookOpen size={28} className="text-indigo-400" /></div>
          <h1 className="text-3xl font-semibold mb-2">Create Interview Prep Course</h1>
          <p className="text-zinc-500">Paste study material or upload a PDF — the AI will build a full course with lessons, quizzes, and flashcards.</p>
        </div>

        {/* Input tabs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex mb-6">
          {(["text","pdf"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "text" ? "Paste Text" : "Upload PDF"}
            </button>
          ))}
        </div>

        {tab === "text" ? (
          <div className="relative mb-6">
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste a job description, study notes, technical docs, company research, or any material you want to learn..."
              className="w-full min-h-[300px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 outline-none resize-y"
            />
            <span className="absolute bottom-3 right-3 text-xs text-zinc-600">{pastedText.length.toLocaleString()} chars</span>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`mb-6 border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              isDragging ? "border-indigo-500 bg-indigo-950/20" : "border-zinc-700 hover:border-zinc-600"
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {pdfFile ? (
              <div>
                <FileText size={32} className="mx-auto mb-3 text-indigo-400" />
                <p className="font-medium text-white">{pdfFile.name}</p>
                <p className="text-sm text-zinc-500 mt-1">{pdfPages} pages</p>
                <button onClick={e => { e.stopPropagation(); setPdfFile(null); setPdfPages(0); }}
                  className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto">
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-400">Drag & drop a PDF here, or click to browse</p>
                <p className="text-xs text-zinc-600 mt-1">PDF files only</p>
              </>
            )}
          </div>
        )}

        {/* Options */}
        <div className="space-y-5">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Course Title <span className="text-zinc-600">(optional — AI generates if blank)</span></label>
            <input value={courseTitle} onChange={e => setCourseTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer Interview Prep"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none" />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Course Type</label>
            <div className="flex gap-2">
              <button onClick={() => setCourseType("interview")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  courseType === "interview" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>Interview Prep</button>
              <button onClick={() => setCourseType("learning")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  courseType === "learning" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>Learning</button>
            </div>
          </div>

          {courseType === "learning" && (
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Learning Level</label>
              <div className="flex gap-2">
                {(["basic", "beginners", "advanced"] as const).map(level => (
                  <button key={level} onClick={() => setLearningLevel(level)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                      learningLevel === level ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}>{level}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Link to Application <span className="text-zinc-600">(optional)</span></label>
            <select value={applicationId} onChange={e => setApplicationId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none">
              <option value="">-- None --</option>
              {applications.map(a => <option key={a.id} value={a.id}>{a.company} — {a.job_title}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Focus Areas</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(area => (
                <button key={area} onClick={() => toggleFocus(area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    focusAreas.includes(area) ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}>{area}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Depth</label>
            <div className="grid grid-cols-3 gap-3">
              {DEPTHS.map(d => (
                <button key={d.id} onClick={() => setDepth(d.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                    depth === d.id ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}>
                  <div className="font-semibold">{d.label}</div>
                  <div className={`text-xs mt-0.5 ${depth === d.id ? "text-indigo-200" : "text-zinc-600"}`}>{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base mt-4">
            <BookOpen size={20} /> Generate Course <ChevronRight size={18} />
          </button>
        </div>
      </div>

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
            {toast.type === "error" ? <X size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
