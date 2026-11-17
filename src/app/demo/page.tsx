"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FlaskConical,
  Star,
  Layers,
  Code2,
  Globe,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Presentation,
  Filter,
  Loader2,
} from "lucide-react";

interface PublicLabItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  demoType: "SANDBOX" | "COMPONENT" | "API_TESTER" | "EXPLAINER" | "SELF_CHECK";
  whyItMatters: string | null;
  status: "LEARNING" | "PRACTICING" | "CONFIRMED";
  featured: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  SANDBOX: Code2,
  COMPONENT: Layers,
  API_TESTER: Globe,
  EXPLAINER: BookOpen,
  SELF_CHECK: HelpCircle,
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  LEARNING: { label: "Learning", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PRACTICING: { label: "Practicing", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  CONFIRMED: { label: "Confirmed Mastery", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

function PublicDemoCatalogContent() {
  const searchParams = useSearchParams();
  const isPresentParam = searchParams.get("present") === "1";
  const setParam = searchParams.get("set");

  const [presenterMode, setPresenterMode] = useState(isPresentParam);
  const [entries, setEntries] = useState<PublicLabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const url = setParam ? `/api/demo?set=${setParam}` : "/api/demo";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load demos");
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setParam]);

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  const filtered = entries.filter((e) =>
    activeCategory === "all" ? true : e.category === activeCategory
  );

  // Group by category
  const groupedByCategory = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PublicLabItem[]>);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${presenterMode ? "p-8 md:p-14" : "p-6 md:p-10"}`}>
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Interactive Learning Lab</span>
            </div>
            <h1 className={`font-extrabold text-white tracking-tight ${presenterMode ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>
              Engineering Showcase & Demos
            </h1>
            <p className={`text-slate-400 max-w-2xl ${presenterMode ? "text-base md:text-lg" : "text-sm"}`}>
              Interactive implementations, deep-dive experiments, and architecture decisions built to demonstrate and verify technical concepts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPresenterMode(!presenterMode)}
              className={`px-4 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                presenterMode
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>{presenterMode ? "Exit Presenter Mode" : "Presenter Mode"}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeCategory === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              All Categories ({entries.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {cat} ({entries.filter((e) => e.category === cat).length})
              </button>
            ))}
          </div>
        )}

        {/* Catalog Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm">Loading engineering demos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8">
            <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No public demos published yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Interactive demos are currently in staging. Check back soon or visit the admin lab to publish entries.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedByCategory).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">{category}</h2>
                  <span className="text-xs text-slate-500 font-mono">({items.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((entry) => {
                    const Icon = TYPE_ICONS[entry.demoType] || Code2;
                    const statusInfo = STATUS_CONFIG[entry.status] || STATUS_CONFIG.LEARNING;

                    return (
                      <Link
                        key={entry.id}
                        href={`/demo/${entry.slug}${presenterMode ? "?present=1" : ""}`}
                        className={`group p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between gap-4 relative ${
                          entry.featured ? "ring-1 ring-amber-500/20" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                                {entry.demoType}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {entry.featured && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>Featured</span>
                                </span>
                              )}
                              {!presenterMode && (
                                <span
                                  className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${statusInfo.badge}`}
                                >
                                  {statusInfo.label}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className={`font-bold text-white group-hover:text-indigo-300 transition-colors ${
                              presenterMode ? "text-xl" : "text-lg"
                            }`}>
                              {entry.title}
                            </h3>
                            {entry.whyItMatters && (
                              <p className={`text-slate-400 mt-2 line-clamp-2 italic ${
                                presenterMode ? "text-sm" : "text-xs"
                              }`}>
                                &quot;{entry.whyItMatters}&quot;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          <span>Launch Interactive Demo</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicDemoCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <PublicDemoCatalogContent />
    </Suspense>
  );
}
