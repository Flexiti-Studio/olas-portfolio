"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Building, Briefcase, ChevronDown, ChevronUp, Copy, Trash2,
  RefreshCw, BookOpen, Globe, Users, Newspaper, MessageSquare, Lightbulb,
  Target, ExternalLink, CheckCircle2, AlertCircle, X, Download, Save, Loader2
} from "lucide-react";

interface ResearchBrief {
  snapshot: any; techStack: any; culture: any; news: any[];
  interviewIntelligence: any; talkingPoints: any; competitors: any[]; sources: any[];
}

interface SavedRecord {
  id: string; company: string; role?: string; depth?: string;
  snapshot?: any; tech_stack?: any; culture?: any; news?: any;
  interview_intel?: any; talking_points?: any; competitors?: any; sources?: any;
  application?: { id: string; company: string; job_title: string } | null;
  created_at: string; updated_at: string;
  application_id?: string;
}

const DEPTHS = [
  { id: "quick", label: "Quick", desc: "Key facts only" },
  { id: "standard", label: "Standard", desc: "Full brief" },
  { id: "deep", label: "Deep", desc: "Sources + deep dive" },
];

function Section({ title, icon: Icon, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  const text = typeof children === "string" ? children : "";
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-zinc-900/60 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Icon size={16} className="text-zinc-400" /> {title}
        </div>
        <div className="flex items-center gap-2">
          {text && (
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); }}
              className="p-1 hover:bg-zinc-700 rounded"
              title="Copy section"
            >
              <Copy size={12} className="text-zinc-500" />
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </button>
      {open && <div className="p-4 bg-zinc-950 text-sm text-zinc-300 space-y-2">{children}</div>}
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="inline-block px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs mr-1 mb-1">{label}</span>;
}

export default function CompanyResearch() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [depth, setDepth] = useState("standard");
  const [applicationId, setApplicationId] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [stepNum, setStepNum] = useState(0);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [rawSearchData, setRawSearchData] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { fetchApplications(); fetchSaved(); }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) setApplications(await res.json());
    } catch {}
  };

  const fetchSaved = async () => {
    try {
      const res = await fetch("/api/research");
      if (res.ok) setSavedRecords(await res.json());
    } catch {}
  };

  const handleGenerate = async (prefillCompany?: string, prefillRole?: string, prefillAppId?: string) => {
    const targetCompany = prefillCompany || company;
    const targetRole = prefillRole || role;
    const targetAppId = prefillAppId || applicationId;
    if (!targetCompany.trim()) return showToast("Company name is required", "error");

    setIsGenerating(true);
    setBrief(null);
    setStepNum(0);
    setStepLabel("Initialising research pipeline...");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/research/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: targetCompany, role: targetRole, depth, applicationId: targetAppId }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            if (data.error) { showToast(data.error, "error"); break; }
            if (data.step) { setStepNum(data.step); setStepLabel(data.label); }
            if (data.result) {
              setBrief(data.result);
              setRawSearchData(data.rawSearchData);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") showToast("Research pipeline failed", "error");
    } finally {
      setIsGenerating(false);
      setStepLabel("");
    }
  };

  const handleSave = async () => {
    if (!brief) return;
    setSaving(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company, role, depth,
          snapshot: brief.snapshot,
          techStack: brief.techStack,
          culture: brief.culture,
          news: brief.news,
          interviewIntelligence: brief.interviewIntelligence,
          talkingPoints: brief.talkingPoints,
          competitors: brief.competitors,
          sources: brief.sources,
          rawSearchData,
          applicationId: applicationId || null,
        }),
      });
      if (res.ok) { showToast("Research saved!", "success"); fetchSaved(); }
      else showToast("Failed to save", "error");
    } catch { showToast("Save error", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this research brief?")) return;
    try {
      const res = await fetch(`/api/research/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Deleted", "success"); fetchSaved(); }
    } catch {}
  };

  const loadRecord = (rec: SavedRecord) => {
    setBrief({
      snapshot: rec.snapshot,
      techStack: rec.tech_stack,
      culture: rec.culture,
      news: rec.news,
      interviewIntelligence: rec.interview_intel,
      talkingPoints: rec.talking_points,
      competitors: rec.competitors,
      sources: rec.sources,
    });
    setCompany(rec.company);
    setRole(rec.role || "");
    setDepth(rec.depth || "standard");
    setApplicationId(rec.application_id || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const TOTAL_STEPS = depth === "quick" ? 4 : 6;

  return (
    <div className="flex flex-col gap-6 pb-12 text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-900/50 text-emerald-400"
                : "bg-red-950/90 border-red-900/50 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {toast.msg}
            <button onClick={() => setToast(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><BookOpen size={22} /></div>
          <div>
            <h2 className="text-xl font-bold">Company Research</h2>
            <p className="text-xs text-zinc-500">AI-powered intelligence briefs for job applications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Company input */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Company Name *</label>
            <div className="relative">
              <Building size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder="e.g. Vercel"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Role input */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Role Applying For</label>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Link to application */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Link to Application</label>
            <select
              value={applicationId}
              onChange={e => setApplicationId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-indigo-500 outline-none"
            >
              <option value="">-- None --</option>
              {applications.map(a => (
                <option key={a.id} value={a.id}>{a.company} — {a.job_title}</option>
              ))}
            </select>
          </div>

          {/* Depth */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Research Depth</label>
            <div className="flex gap-2">
              {DEPTHS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDepth(d.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    depth === d.id
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading progress */}
        {isGenerating && (
          <div className="mb-4">
            <div className="flex items-center gap-3 text-sm text-indigo-400 mb-2">
              <Loader2 size={16} className="animate-spin" />
              <span>{stepLabel}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stepNum / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Step {stepNum} of {TOTAL_STEPS}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !company.trim()}
            className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {isGenerating ? "Researching..." : "Generate Research Brief"}
          </button>
          {brief && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-zinc-800 text-white px-4 rounded-xl font-medium flex items-center gap-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          )}
        </div>
      </div>

      {/* Research Brief Output */}
      <AnimatePresence>
        {brief && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{company} — Research Brief</h3>
              <button
                onClick={() => navigator.clipboard.writeText(
                  brief.talkingPoints?.thingsToMention?.map((t: string) => `• ${t}`).join("\n") || ""
                )}
                className="flex items-center gap-2 bg-zinc-800 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <Copy size={14} /> Copy Talking Points
              </button>
            </div>

            {/* 1. Snapshot */}
            <Section title="1. Company Snapshot" icon={Building}>
              {brief.snapshot && (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {Object.entries(brief.snapshot).map(([k, v]) => v ? (
                    <div key={k}><span className="text-zinc-500 capitalize">{k}: </span><span>{String(v)}</span></div>
                  ) : null)}
                </div>
              )}
            </Section>

            {/* 2. Tech Stack */}
            <Section title="2. Products & Tech Stack" icon={Globe}>
              {brief.techStack && (
                <div className="space-y-2">
                  {brief.techStack.products?.length > 0 && <div><p className="text-zinc-500 mb-1">Products</p>{brief.techStack.products.map((p: string) => <Tag key={p} label={p} />)}</div>}
                  {brief.techStack.languages?.length > 0 && <div><p className="text-zinc-500 mb-1">Languages</p>{brief.techStack.languages.map((p: string) => <Tag key={p} label={p} />)}</div>}
                  {brief.techStack.frameworks?.length > 0 && <div><p className="text-zinc-500 mb-1">Frameworks</p>{brief.techStack.frameworks.map((p: string) => <Tag key={p} label={p} />)}</div>}
                  {brief.techStack.infrastructure?.length > 0 && <div><p className="text-zinc-500 mb-1">Infrastructure</p>{brief.techStack.infrastructure.map((p: string) => <Tag key={p} label={p} />)}</div>}
                  {brief.techStack.engineeringBlog && <a href={brief.techStack.engineeringBlog} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:underline text-xs"><ExternalLink size={12} /> Engineering Blog</a>}
                </div>
              )}
            </Section>

            {/* 3. Culture */}
            <Section title="3. Culture & Values" icon={Users}>
              {brief.culture && (
                <div className="space-y-2">
                  {brief.culture.values?.length > 0 && <div><p className="text-zinc-500 mb-1">Values</p>{brief.culture.values.map((v: string) => <Tag key={v} label={v} />)}</div>}
                  {brief.culture.remotePolicy && <p><span className="text-zinc-500">Remote Policy: </span>{brief.culture.remotePolicy}</p>}
                  {brief.culture.workStyle && <p><span className="text-zinc-500">Work Style: </span>{brief.culture.workStyle}</p>}
                  {brief.culture.sentiment && <p><span className="text-zinc-500">Glassdoor Sentiment: </span>{brief.culture.sentiment}</p>}
                  {brief.culture.dei && <p><span className="text-zinc-500">DEI: </span>{brief.culture.dei}</p>}
                </div>
              )}
            </Section>

            {/* 4. News */}
            <Section title="4. Recent News & Activity" icon={Newspaper}>
              <div className="space-y-3">
                {brief.news?.map((n: any, i: number) => (
                  <div key={i} className="border-l-2 border-zinc-700 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{n.title}</span>
                      {n.date && <span className="text-xs text-zinc-500">{n.date}</span>}
                    </div>
                    {n.summary && <p className="text-zinc-400 text-xs mt-0.5">{n.summary}</p>}
                    {n.url && <a href={n.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"><ExternalLink size={10} /> Source</a>}
                  </div>
                ))}
              </div>
            </Section>

            {/* 5. Interview Intelligence */}
            <Section title="5. Interview Intelligence" icon={MessageSquare}>
              {brief.interviewIntelligence && (
                <div className="space-y-3">
                  {brief.interviewIntelligence.process && <p><span className="text-zinc-500">Process: </span>{brief.interviewIntelligence.process}</p>}
                  {brief.interviewIntelligence.stages?.length > 0 && <div><p className="text-zinc-500 mb-1">Stages</p><ol className="list-decimal list-inside space-y-0.5">{brief.interviewIntelligence.stages.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol></div>}
                  {brief.interviewIntelligence.commonQuestions?.length > 0 && <div><p className="text-zinc-500 mb-1">Common Questions</p><ul className="space-y-0.5">{brief.interviewIntelligence.commonQuestions.map((q: string, i: number) => <li key={i} className="flex gap-2"><span className="text-zinc-600 shrink-0">•</span>{q}</li>)}</ul></div>}
                  {brief.interviewIntelligence.whatTheyValue?.length > 0 && <div><p className="text-zinc-500 mb-1">What They Value</p>{brief.interviewIntelligence.whatTheyValue.map((v: string) => <Tag key={v} label={v} />)}</div>}
                  {brief.interviewIntelligence.redFlags?.length > 0 && <div><p className="text-red-500 mb-1">⚠ Red Flags</p><ul className="space-y-0.5 text-red-400">{brief.interviewIntelligence.redFlags.map((f: string, i: number) => <li key={i}>• {f}</li>)}</ul></div>}
                </div>
              )}
            </Section>

            {/* 6. Talking Points */}
            <Section title="6. Talking Points" icon={Lightbulb}>
              {brief.talkingPoints && (
                <div className="space-y-3">
                  {brief.talkingPoints.thingsToMention?.length > 0 && <div><p className="text-zinc-500 mb-1">Things to Mention</p><ul className="space-y-1">{brief.talkingPoints.thingsToMention.map((t: string, i: number) => <li key={i} className="flex gap-2"><span className="text-indigo-500 shrink-0">→</span>{t}</li>)}</ul></div>}
                  {brief.talkingPoints.howToFrameExperience && <div><p className="text-zinc-500 mb-1">How to Frame Your Experience</p><p className="text-zinc-300 italic">"{brief.talkingPoints.howToFrameExperience}"</p></div>}
                  {brief.talkingPoints.questionsToAsk?.length > 0 && <div><p className="text-zinc-500 mb-1">Questions to Ask</p><ul className="space-y-1">{brief.talkingPoints.questionsToAsk.map((q: string, i: number) => <li key={i} className="flex gap-2"><span className="text-emerald-500 shrink-0">?</span>{q}</li>)}</ul></div>}
                </div>
              )}
            </Section>

            {/* 7. Competitors */}
            <Section title="7. Competitor Landscape" icon={Target}>
              <div className="space-y-2">
                {brief.competitors?.map((c: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="font-semibold text-white shrink-0">{c.name}</span>
                    <span className="text-zinc-400">{c.differentiation}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* 8. Sources */}
            <Section title="8. Sources" icon={ExternalLink} defaultOpen={false}>
              <div className="space-y-1">
                {brief.sources?.map((s: any, i: number) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-indigo-400 hover:underline">
                    <ExternalLink size={12} /> {s.label || s.url}
                  </a>
                ))}
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Records */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-2">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-zinc-400" /> Saved Research Briefs
        </h3>
        {savedRecords.length === 0 ? (
          <p className="text-zinc-500 italic">No research saved yet. Generate and save your first brief above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRecords.map(rec => (
              <div key={rec.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white">{rec.company}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                      rec.depth === "quick" ? "border-yellow-800 text-yellow-400" :
                      rec.depth === "deep" ? "border-purple-800 text-purple-400" :
                      "border-indigo-800 text-indigo-400"
                    }`}>{rec.depth}</span>
                  </div>
                  {rec.role && <p className="text-sm text-zinc-400">↳ {rec.role}</p>}
                  {rec.application && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Linked: {rec.application.job_title}
                    </p>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">Updated {new Date(rec.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => loadRecord(rec)}
                    className="flex-1 bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors"
                  >
                    View Brief
                  </button>
                  <button
                    onClick={() => { setCompany(rec.company); setRole(rec.role || ""); setApplicationId(rec.application_id || ""); handleGenerate(rec.company, rec.role, rec.application_id); }}
                    className="bg-zinc-800 text-white p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                    title="Refresh research"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="bg-red-950 text-red-400 p-1.5 rounded-lg hover:bg-red-900 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
