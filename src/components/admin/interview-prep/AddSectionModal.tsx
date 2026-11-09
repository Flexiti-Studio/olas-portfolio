"use client";
import React, { useState } from "react";
import { Sparkles, Plus, Loader2, Code, AlignLeft, List, CheckSquare, AlertCircle, Table as TableIcon, Bookmark, Video, X } from "lucide-react";
import { getEmbedVideoUrl, isEmbeddableVideoUrl } from "@/lib/videoUtils";

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSections: (sections: any[]) => void;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
}

export default function AddSectionModal({
  isOpen,
  onClose,
  onAddSections,
  courseTitle,
  moduleTitle,
  lessonTitle,
}: AddSectionModalProps) {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [rawText, setRawText] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [error, setError] = useState("");

  // Manual section form state
  const [manualType, setManualType] = useState<"paragraph" | "code" | "bullets" | "steps" | "callout" | "table" | "definition" | "video">("paragraph");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("typescript");
  const [codeDescription, setCodeDescription] = useState("");
  const [listItemsText, setListItemsText] = useState("");
  const [tableHeadersText, setTableHeadersText] = useState("");
  const [tableRowsText, setTableRowsText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  if (!isOpen) return null;

  const handleAiFormat = async () => {
    if (!rawText.trim()) {
      setError("Please paste the notes, code, formulas, YouTube links, or explanation text first.");
      return;
    }

    setIsFormatting(true);
    setError("");

    try {
      const res = await fetch("/api/interview-prep/format-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          courseTitle,
          moduleTitle,
          lessonTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to format with AI");
      }

      if (data.sections && data.sections.length > 0) {
        onAddSections(data.sections);
        setRawText("");
        onClose();
      } else {
        setError("AI could not extract sections. Try adding some more context.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while formatting.");
    } finally {
      setIsFormatting(false);
    }
  };

  const handleManualAdd = () => {
    let newSection: any = null;

    if (manualType === "paragraph") {
      if (!body.trim()) { setError("Paragraph body is required"); return; }
      newSection = { type: "paragraph", heading: heading.trim() || undefined, body: body.trim() };
    } else if (manualType === "video") {
      if (!videoUrl.trim()) { setError("YouTube or video URL is required"); return; }
      newSection = {
        type: "video",
        heading: heading.trim() || "Video Walkthrough",
        video_url: videoUrl.trim(),
        body: body.trim() || undefined,
      };
    } else if (manualType === "code") {
      if (!body.trim()) { setError("Code snippet body is required"); return; }
      newSection = {
        type: "code",
        heading: heading.trim() || "Code Example",
        language: codeLanguage,
        description: codeDescription.trim() || undefined,
        body: body.trim(),
      };
    } else if (manualType === "bullets" || manualType === "steps") {
      const items = listItemsText.split("\n").map(s => s.trim()).filter(Boolean);
      if (!items.length) { setError("Provide at least one list item (one per line)"); return; }
      newSection = {
        type: manualType,
        heading: heading.trim() || (manualType === "bullets" ? "Key Points" : "Procedure Steps"),
        items,
      };
    } else if (manualType === "callout") {
      if (!body.trim()) { setError("Callout content is required"); return; }
      newSection = { type: "callout", heading: heading.trim() || "Note", body: body.trim() };
    } else if (manualType === "definition") {
      if (!body.trim()) { setError("Definition body is required (e.g. Term: explanation)"); return; }
      newSection = { type: "definition", heading: heading.trim() || "Concept Definition", body: body.trim() };
    } else if (manualType === "table") {
      const headers = tableHeadersText.split(",").map(h => h.trim()).filter(Boolean);
      const rows = tableRowsText
        .split("\n")
        .map(r => r.split(",").map(c => c.trim()))
        .filter(r => r.length > 0 && r[0] !== "");
      if (!headers.length || !rows.length) {
        setError("Please provide comma-separated headers and comma-separated rows");
        return;
      }
      newSection = {
        type: "table",
        heading: heading.trim() || "Comparison",
        headers,
        rows,
      };
    }

    if (newSection) {
      onAddSections([newSection]);
      // reset manual inputs
      setHeading("");
      setBody("");
      setVideoUrl("");
      setListItemsText("");
      setTableHeadersText("");
      setTableRowsText("");
      setError("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-indigo-400" /> Add Content Section
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              To <span className="text-indigo-300 font-medium">{lessonTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch: AI vs Manual */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800">
            <button
              onClick={() => { setMode("ai"); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "ai"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                }`}
            >
              <Sparkles size={14} className="text-amber-300" /> AI Auto-Format (Recommended)
            </button>
            <button
              onClick={() => { setMode("manual"); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "manual"
                  ? "bg-zinc-800 text-white shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                }`}
            >
              <Plus size={14} /> Manual Section Entry
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === "ai" ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs text-indigo-200/90 leading-relaxed">
                ✨ <strong>Paste anything:</strong> raw notes, YouTube links (<code className="bg-indigo-900/50 px-1 rounded text-white">https://youtube.com/watch?v=...</code>), article excerpts, code examples, lists, or mathematical formulas (LaTeX like <code className="bg-indigo-900/50 px-1 rounded text-white">$O(n \log n)$</code>). AI will parse and format it into clean module sections.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Paste Notes / YouTube Links / Code / Formulas / Material
                </label>
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Paste your topic content here...\n\nExample:\nReact Server Components execute only on the server.\n\nYouTube Video Walkthrough:\nhttps://www.youtube.com/watch?v=k3Y0fNf4Rlg\n\nCode snippet:\nexport default async function Page() {\n  const data = await db.query();\n  return <div>{data}</div>;\n}\n\nKey advantages:\n- Zero client-side bundle\n- Formula: $T_{total} = T_{server} + T_{network}$`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors resize-y"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Section Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "video", label: "YouTube / Video", icon: Video },
                    { id: "paragraph", label: "Paragraph", icon: AlignLeft },
                    { id: "code", label: "Code Snippet", icon: Code },
                    { id: "bullets", label: "Bullet Points", icon: List },
                    { id: "steps", label: "Steps List", icon: CheckSquare },
                    { id: "callout", label: "Callout / Tip", icon: AlertCircle },
                    { id: "table", label: "Table", icon: TableIcon },
                    { id: "definition", label: "Definition", icon: Bookmark },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setManualType(t.id as any)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${manualType === t.id
                            ? "bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-sm"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          }`}
                      >
                        <Icon size={14} className={manualType === t.id && t.id === "video" ? "text-red-400" : ""} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Section Heading <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder={manualType === "video" ? "e.g., Video Walkthrough & Code Demo" : "e.g., Understanding the Execution Lifecycle"}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {manualType === "video" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      YouTube URL / Video Link <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {videoUrl.trim() && (
                    <div>
                      <span className="text-[11px] text-zinc-500 font-semibold uppercase mb-1 block">Live Player Preview</span>
                      <div className="w-full aspect-video rounded-xl border border-zinc-800 bg-black overflow-hidden flex items-center justify-center shadow-inner">
                        <iframe
                          src={getEmbedVideoUrl(videoUrl)}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Video Notes / Description <span className="text-zinc-600">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Add key timestamps, summary, or takeaways for this video..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {manualType === "code" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Programming Language</label>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description (Optional)</label>
                    <input
                      type="text"
                      value={codeDescription}
                      onChange={(e) => setCodeDescription(e.target.value)}
                      placeholder="e.g. Async fetch in Next.js Server Component"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {manualType === "paragraph" || manualType === "code" || manualType === "callout" || manualType === "definition" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    {manualType === "code"
                      ? "Code Body"
                      : manualType === "definition"
                        ? "Term and Definition (e.g., Closure: A function bundled with its lexical environment)"
                        : "Content Body"}
                  </label>
                  <textarea
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      manualType === "code"
                        ? "const greeting = 'Hello world';"
                        : "Write the detailed content. You can write math using $E = mc^2$."
                    }
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 ${manualType === "code" ? "font-mono text-emerald-300" : ""
                      }`}
                  />
                </div>
              ) : null}

              {manualType === "bullets" || manualType === "steps" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Items (Enter one per line)
                  </label>
                  <textarea
                    rows={5}
                    value={listItemsText}
                    onChange={(e) => setListItemsText(e.target.value)}
                    placeholder={"First important point\nSecond important point\nThird important point"}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : null}

              {manualType === "table" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Column Headers (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tableHeadersText}
                      onChange={(e) => setTableHeadersText(e.target.value)}
                      placeholder="Feature, Client Component, Server Component"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Rows (comma-separated, one row per line)
                    </label>
                    <textarea
                      rows={4}
                      value={tableRowsText}
                      onChange={(e) => setTableRowsText(e.target.value)}
                      placeholder={"Bundle Size, Adds JS to client, 0 JS sent\nState, Supports useState, No useState"}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          {mode === "ai" ? (
            <button
              type="button"
              onClick={handleAiFormat}
              disabled={isFormatting || !rawText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFormatting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Formatting with AI...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Format & Add Sections
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleManualAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25"
            >
              <Plus size={14} /> Add Section
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
