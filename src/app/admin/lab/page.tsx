"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/lab/AdminGuard";
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit2,
  Trash2,
  Star,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Layers,
  Globe,
  HelpCircle,
  BookOpen,
} from "lucide-react";

interface LabEntryItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  demoType: "SANDBOX" | "COMPONENT" | "API_TESTER" | "EXPLAINER" | "SELF_CHECK";
  status: "LEARNING" | "PRACTICING" | "CONFIRMED";
  isPublic: boolean;
  featured: boolean;
  sortOrder: number;
  whyItMatters: string | null;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  SANDBOX: Code2,
  COMPONENT: Layers,
  API_TESTER: Globe,
  EXPLAINER: BookOpen,
  SELF_CHECK: HelpCircle,
};

const STATUS_COLORS: Record<string, string> = {
  LEARNING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PRACTICING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function AdminLabPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LabEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New entry form state
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newCategory, setNewCategory] = useState("React");
  const [newDemoType, setNewDemoType] = useState<"SANDBOX" | "COMPONENT" | "API_TESTER" | "EXPLAINER" | "SELF_CHECK">("COMPONENT");
  const [newWhyItMatters, setNewWhyItMatters] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lab");
      if (!res.ok) throw new Error("Failed to fetch lab entries");
      const data = await res.json();
      setEntries(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setNewSlug(generatedSlug);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    let defaultConfig: any = {};
    if (newDemoType === "SANDBOX") {
      defaultConfig = { language: "react", starterCode: "export default function App() {\n  return <div>Hello World</div>;\n}" };
    } else if (newDemoType === "COMPONENT") {
      defaultConfig = { componentKey: "InteractiveButtonDemo" };
    } else if (newDemoType === "API_TESTER") {
      defaultConfig = { method: "GET", url: "/api/lab" };
    } else if (newDemoType === "EXPLAINER") {
      defaultConfig = { steps: [{ title: "Step 1", description: "First concept breakdown" }] };
    } else if (newDemoType === "SELF_CHECK") {
      defaultConfig = { questions: [{ q: "What is this topic?", answer: "Core answer", explanation: "Deep dive reason" }] };
    }

    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          category: newCategory,
          demoType: newDemoType,
          whyItMatters: newWhyItMatters || undefined,
          config: defaultConfig,
          status: "LEARNING",
          isPublic: false,
          featured: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create entry");
      }

      setIsCreateOpen(false);
      router.push(`/admin/lab/${data.id}`);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const togglePublic = async (entry: LabEntryItem) => {
    try {
      const nextPublic = !entry.isPublic;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, isPublic: nextPublic } : e))
      );
      await fetch(`/api/lab/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextPublic }),
      });
    } catch (err) {
      console.error(err);
      fetchEntries();
    }
  };

  const toggleFeatured = async (entry: LabEntryItem) => {
    try {
      const nextFeatured = !entry.featured;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, featured: nextFeatured } : e))
      );
      await fetch(`/api/lab/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: nextFeatured }),
      });
    } catch (err) {
      console.error(err);
      fetchEntries();
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete lab demo "${title}"?`)) return;
    try {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await fetch(`/api/lab/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      fetchEntries();
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const newEntries = [...entries];
    const [moved] = newEntries.splice(index, 1);
    newEntries.splice(targetIndex, 0, moved);

    const reordered = newEntries.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
    setEntries(reordered);

    try {
      await fetch("/api/lab/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((e) => ({ id: e.id, sortOrder: e.sortOrder })),
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  const filtered = entries.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || item.category === filterCategory;
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchType = filterType === "all" || item.demoType === filterType;
    return matchSearch && matchCat && matchStatus && matchType;
  });

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Learning Lab</h1>
                  <p className="text-sm text-slate-400">
                    Manage interactive software practice demos and interview showcases
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/demo"
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span>View Public /demo</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Link>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Lab Entry</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search by title, slug, or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="LEARNING">Learning</option>
              <option value="PRACTICING">Practicing</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Demo Types</option>
              <option value="COMPONENT">Component</option>
              <option value="SANDBOX">Sandbox</option>
              <option value="API_TESTER">API Tester</option>
              <option value="EXPLAINER">Explainer</option>
              <option value="SELF_CHECK">Self Check</option>
            </select>
          </div>

          {/* List Table / Cards */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm">Loading lab entries...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
              <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300 mb-1">No lab entries found</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
                {search || filterCategory !== "all" || filterStatus !== "all" || filterType !== "all"
                  ? "Try resetting your search or filter options."
                  : "Create your first learning lab demo to practice and showcase concepts."}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Create Lab Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, index) => {
                const Icon = TYPE_ICONS[item.demoType] || Code2;
                return (
                  <div
                    key={item.id}
                    className="group bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 md:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start md:items-center gap-4">
                      {/* Reorder arrows */}
                      <div className="flex flex-col gap-1 text-slate-500 pt-1 md:pt-0">
                        <button
                          disabled={index === 0}
                          onClick={() => moveOrder(index, "up")}
                          className="hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === filtered.length - 1}
                          onClick={() => moveOrder(index, "down")}
                          className="hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Link
                            href={`/admin/lab/${item.id}`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors text-base"
                          >
                            {item.title}
                          </Link>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            /{item.slug}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              STATUS_COLORS[item.status] || "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {item.status.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="text-indigo-400 font-medium">{item.category}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500 uppercase">{item.demoType}</span>
                          {item.whyItMatters && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 line-clamp-1 italic max-w-md">
                                &quot;{item.whyItMatters}&quot;
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Toggles */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => toggleFeatured(item)}
                        className={`p-2 rounded-xl border transition-colors ${
                          item.featured
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-slate-950/50 border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                        title={item.featured ? "Featured on /demo" : "Mark as featured"}
                      >
                        <Star className={`w-4 h-4 ${item.featured ? "fill-amber-400" : ""}`} />
                      </button>

                      <button
                        onClick={() => togglePublic(item)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          item.isPublic
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                        title={item.isPublic ? "Live on /demo" : "Hidden / Draft"}
                      >
                        {item.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{item.isPublic ? "Public" : "Draft"}</span>
                      </button>

                      <Link
                        href={`/admin/lab/${item.id}`}
                        className="p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">New Learning Lab Entry</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {createError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Demo Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. React Virtualized List"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      placeholder="react-virtualized-list"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="React, CSS, Systems, Python"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Demo Type *
                  </label>
                  <select
                    value={newDemoType}
                    onChange={(e) => setNewDemoType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="COMPONENT">COMPONENT (Curated Dynamic Component)</option>
                    <option value="SANDBOX">SANDBOX (Sandpack / Pyodide Live Code)</option>
                    <option value="SELF_CHECK">SELF_CHECK (Interactive Q&A Cards)</option>
                    <option value="EXPLAINER">EXPLAINER (Step-by-step Interactive Walkthrough)</option>
                    <option value="API_TESTER">API_TESTER (API Request/Response Inspector)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Why It Matters (1-2 sentences)
                  </label>
                  <textarea
                    rows={2}
                    value={newWhyItMatters}
                    onChange={(e) => setNewWhyItMatters(e.target.value)}
                    placeholder="When I'd use this in a real project / production system..."
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create & Configure</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}

