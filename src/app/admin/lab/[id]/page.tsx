"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/lab/AdminGuard";
import DemoRenderer from "@/components/lab/DemoRenderer";
import { getRegistryMetaList } from "@/lib/lab/registry";
import {
  ArrowLeft,
  Save,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  Loader2,
  Check,
  AlertCircle,
  FlaskConical,
  Code2,
  Layers,
  Settings,
  HelpCircle,
  FileCode,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminLabDetailPage({ params }: Props) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [demoType, setDemoType] = useState<any>("COMPONENT");
  const [status, setStatus] = useState<any>("LEARNING");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // Config state
  const [config, setConfig] = useState<any>({});
  const [configRawJson, setConfigRawJson] = useState("");
  const [rawJsonMode, setRawJsonMode] = useState(false);

  const registryItems = getRegistryMetaList();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/lab/${id}`);
        if (!res.ok) throw new Error("Lab entry not found");
        const data = await res.json();
        setEntry(data);
        setTitle(data.title || "");
        setSlug(data.slug || "");
        setCategory(data.category || "");
        setDemoType(data.demoType || "COMPONENT");
        setStatus(data.status || "LEARNING");
        setWhyItMatters(data.whyItMatters || "");
        setNotes(data.notes || "");
        setIsPublic(data.isPublic || false);
        setFeatured(data.featured || false);
        setSortOrder(data.sortOrder || 0);
        setConfig(data.config || {});
        setConfigRawJson(JSON.stringify(data.config || {}, null, 2));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    let finalConfig = config;
    if (rawJsonMode) {
      try {
        finalConfig = JSON.parse(configRawJson);
      } catch (err) {
        setError("Invalid JSON in advanced config editor");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/lab/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          category,
          demoType,
          status,
          whyItMatters: whyItMatters || null,
          notes: notes || null,
          isPublic,
          featured,
          sortOrder,
          config: finalConfig,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "Failed to update lab entry");
      }

      setEntry(updated);
      setConfig(updated.config);
      setConfigRawJson(JSON.stringify(updated.config, null, 2));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this lab entry?")) return;
    try {
      await fetch(`/api/lab/${id}`, { method: "DELETE" });
      router.push("/admin/lab");
    } catch (err) {
      console.error(err);
    }
  };

  // Preview entry object for live preview
  const livePreviewEntry = {
    title,
    slug,
    category,
    demoType,
    config: rawJsonMode ? (() => { try { return JSON.parse(configRawJson); } catch { return config; } })() : config,
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-sm">Loading lab configuration...</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/lab"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to Learning Lab"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white truncate max-w-sm sm:max-w-md">
                  {title || "Untitled Lab"}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                  /{slug}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {demoType} • {category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isPublic && (
              <Link
                href={`/demo/${slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>Live Demo</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            )}

            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isPublic
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isPublic ? "Public" : "Draft"}</span>
            </button>

            <button
              onClick={() => setFeatured(!featured)}
              className={`p-2 rounded-xl border transition-colors ${
                featured
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
              title={featured ? "Featured on /demo" : "Mark as featured"}
            >
              <Star className={`w-4 h-4 ${featured ? "fill-amber-400" : ""}`} />
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Split: Config Left, Live Preview Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Form & Config Editor */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-65px)] border-r border-slate-800 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Basic Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Demo Type *
                  </label>
                  <select
                    value={demoType}
                    onChange={(e) => {
                      const nextType = e.target.value as any;
                      setDemoType(nextType);
                      // Switch default config shape if empty or mismatched
                      if (nextType === "COMPONENT" && !config.componentKey) {
                        const newCfg = { componentKey: "InteractiveButtonDemo" };
                        setConfig(newCfg);
                        setConfigRawJson(JSON.stringify(newCfg, null, 2));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="COMPONENT">COMPONENT</option>
                    <option value="SANDBOX">SANDBOX</option>
                    <option value="SELF_CHECK">SELF_CHECK</option>
                    <option value="EXPLAINER">EXPLAINER</option>
                    <option value="API_TESTER">API_TESTER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="LEARNING">LEARNING</option>
                    <option value="PRACTICING">PRACTICING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Why It Matters (1-2 sentences for interviews)
                </label>
                <textarea
                  rows={2}
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  placeholder="When would you use this in production? What architectural tradeoff does it solve?"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes (Markdown: What I learned & Key Takeaways)
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="# Key Learnings\n- Point 1\n- Point 2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Type-Specific Config Area */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {demoType} Configuration
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRawJsonMode(!rawJsonMode)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
                >
                  {rawJsonMode ? "Switch to Visual Form" : "Edit Raw JSON"}
                </button>
              </div>

              {rawJsonMode ? (
                <div>
                  <textarea
                    rows={8}
                    value={configRawJson}
                    onChange={(e) => setConfigRawJson(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ensure JSON matches the discriminated union schema for {demoType}.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4">
                  {demoType === "COMPONENT" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Select Component from Registry *
                      </label>
                      <select
                        value={config.componentKey || ""}
                        onChange={(e) => {
                          const newCfg = { ...config, componentKey: e.target.value };
                          setConfig(newCfg);
                          setConfigRawJson(JSON.stringify(newCfg, null, 2));
                        }}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose registered component --</option>
                        {registryItems.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.name} ({item.key})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Components live in <code className="text-indigo-400">src/components/lab/demos/</code> and are registered in <code className="text-indigo-400">src/lib/lab/registry.ts</code>.
                      </p>
                    </div>
                  )}

                  {demoType === "SANDBOX" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Language
                        </label>
                        <select
                          value={config.language || "react"}
                          onChange={(e) => {
                            const newCfg = { ...config, language: e.target.value };
                            setConfig(newCfg);
                            setConfigRawJson(JSON.stringify(newCfg, null, 2));
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                        >
                          <option value="react">React (Sandpack)</option>
                          <option value="ts">TypeScript (Sandpack)</option>
                          <option value="js">JavaScript (Sandpack)</option>
                          <option value="python">Python (Pyodide)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Starter Code
                        </label>
                        <textarea
                          rows={6}
                          value={config.starterCode || ""}
                          onChange={(e) => {
                            const newCfg = { ...config, starterCode: e.target.value };
                            setConfig(newCfg);
                            setConfigRawJson(JSON.stringify(newCfg, null, 2));
                          }}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {demoType === "API_TESTER" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Method</label>
                          <select
                            value={config.method || "GET"}
                            onChange={(e) => {
                              const newCfg = { ...config, method: e.target.value };
                              setConfig(newCfg);
                              setConfigRawJson(JSON.stringify(newCfg, null, 2));
                            }}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-300 mb-1">Endpoint URL</label>
                          <input
                            type="text"
                            value={config.url || "/api/lab"}
                            onChange={(e) => {
                              const newCfg = { ...config, url: e.target.value };
                              setConfig(newCfg);
                              setConfigRawJson(JSON.stringify(newCfg, null, 2));
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(demoType === "EXPLAINER" || demoType === "SELF_CHECK") && (
                    <div className="text-xs text-slate-400 space-y-2">
                      <p>Visual builder for {demoType} will be configured in its dedicated phase.</p>
                      <button
                        type="button"
                        onClick={() => setRawJsonMode(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-indigo-400 text-xs font-mono"
                      >
                        Edit via JSON Schema →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-rose-400">Danger Zone</h4>
                <p className="text-[11px] text-slate-500">Remove this lab entry and all its configurations.</p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lab</span>
              </button>
            </div>
          </div>

          {/* Right: Live Interactive Demo Preview */}
          <div className="p-6 bg-slate-950/40 overflow-y-auto max-h-[calc(100vh-65px)] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Live Preview
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Interactive real-time runner
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <DemoRenderer entry={livePreviewEntry} />
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

