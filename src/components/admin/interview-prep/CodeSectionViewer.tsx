"use client";
import React, { useState } from "react";
import { Check, Copy, Edit2, RotateCcw, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { HighlightedCode } from "./HighlightedCode";

interface CodeSectionViewerProps {
  section: {
    type: "code";
    heading?: string;
    language?: string;
    description?: string;
    body: string;
  };
  sectionIndex: number;
  onUpdateCode: (newCode: string, newHeading?: string, newLanguage?: string) => Promise<void> | void;
  onDeleteSection?: () => void;
  copiedSectionIdx: number | null;
  onCopyCode: (code: string, idx: number) => void;
}

export function CodeSectionViewer({
  section,
  sectionIndex,
  onUpdateCode,
  onDeleteSection,
  copiedSectionIdx,
  onCopyCode,
}: CodeSectionViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [codeDraft, setCodeDraft] = useState(section.body || "");
  const [headingDraft, setHeadingDraft] = useState(section.heading || "");
  const [languageDraft, setLanguageDraft] = useState(section.language || "typescript");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoReformatting, setIsAutoReformatting] = useState(false);

  // Quick auto-reformat function for single-line smashed code
  const handleAutoReformat = async () => {
    setIsAutoReformatting(true);
    try {
      const res = await fetch("/api/interview-prep/reformat-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeDraft,
          language: languageDraft,
        }),
      });

      const data = await res.json();
      if (res.ok && data.formattedCode) {
        setCodeDraft(data.formattedCode);
      } else {
        // Fallback local heuristic formatting for single line code
        let formatted = codeDraft
          .replace(/;(?=\s*[a-zA-Z0-9_$])/g, ";\n")
          .replace(/\{(?=\s*[a-zA-Z0-9_$])/g, "{\n  ")
          .replace(/\}(?=\s*[a-zA-Z0-9_$])/g, "\n}\n")
          .replace(/\\n/g, "\n");
        setCodeDraft(formatted);
      }
    } catch {
      let formatted = codeDraft
        .replace(/;(?=\s*[a-zA-Z0-9_$])/g, ";\n")
        .replace(/\{(?=\s*[a-zA-Z0-9_$])/g, "{\n  ")
        .replace(/\}(?=\s*[a-zA-Z0-9_$])/g, "\n}\n")
        .replace(/\\n/g, "\n");
      setCodeDraft(formatted);
    } finally {
      setIsAutoReformatting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateCode(codeDraft, headingDraft, languageDraft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-0 my-4">
      {/* Code Header */}
      {!isEditing && section.heading && (
        <h3 className="text-xl font-bold text-white flex items-center justify-between gap-2 mt-4 mb-2">
          <span className="flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" />
            {section.heading}
          </span>
        </h3>
      )}

      {!isEditing && section.description && (
        <p className="text-zinc-400 text-sm mb-2 leading-relaxed">{section.description}</p>
      )}

      {/* Editor or Viewer Box */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 h-11 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 uppercase tracking-wider">
              {isEditing ? languageDraft : section.language || "code"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleAutoReformat}
                  disabled={isAutoReformatting}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/50 transition-colors"
                  title="Format single-line or unindented code into clean multi-line"
                >
                  {isAutoReformatting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} className="text-amber-300" />
                  )}
                  <span>Auto-Format</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeDraft(section.body || "");
                    setHeadingDraft(section.heading || "");
                    setIsEditing(false);
                  }}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCodeDraft(section.body || "");
                    setHeadingDraft(section.heading || "");
                    setLanguageDraft(section.language || "typescript");
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700/80 border border-zinc-700/60 transition-all"
                  title="Edit or reformat code"
                >
                  <Edit2 size={12} />
                  <span>Edit / Reformat</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCopyCode(section.body || "", sectionIndex)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                    copiedSectionIdx === sectionIndex
                      ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700/50"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700/60"
                  }`}
                >
                  {copiedSectionIdx === sectionIndex ? (
                    <>
                      <Check size={12} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Code Content */}
        {isEditing ? (
          <div className="p-4 space-y-3 bg-[#0d1117]">
            <div className="flex gap-2">
              <input
                type="text"
                value={headingDraft}
                onChange={(e) => setHeadingDraft(e.target.value)}
                placeholder="Code Heading (e.g. Implementation Example)"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <select
                value={languageDraft}
                onChange={(e) => setLanguageDraft(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash / Shell</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <textarea
              rows={10}
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="w-full bg-[#161b22] border border-zinc-800 rounded-xl p-3 text-sm font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed whitespace-pre"
              placeholder="Paste or write your multi-line code here..."
            />
          </div>
        ) : (
          <HighlightedCode code={section.body || ""} language={section.language} />
        )}
      </div>
    </div>
  );
}

