import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DemoRenderer from "@/components/lab/DemoRenderer";
import {
  ArrowLeft,
  Presentation,
  FlaskConical,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  Code2,
  Globe,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ present?: string }>;
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

export default async function PublicDemoSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { present } = await searchParams;
  const isPresenter = present === "1";

  // Public routes must never expose non-public entries (404 for private slugs)
  const entry = await prisma.labEntry.findFirst({
    where: {
      slug,
      isPublic: true,
    },
  });

  if (!entry) {
    notFound();
  }

  const Icon = TYPE_ICONS[entry.demoType] || Code2;
  const statusInfo = STATUS_CONFIG[entry.status] || STATUS_CONFIG.LEARNING;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 ${isPresenter ? "p-8 md:p-14" : "p-6 md:p-10"}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href={`/demo${isPresenter ? "?present=1" : ""}`}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Back to all demos"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {entry.demoType} • {entry.category}
              </span>
            </div>

            <h1 className={`font-extrabold text-white tracking-tight ${isPresenter ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>
              {entry.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!isPresenter && (
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusInfo.badge}`}>
                {statusInfo.label}
              </span>
            )}

            <Link
              href={`/demo/${entry.slug}${isPresenter ? "" : "?present=1"}`}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                isPresenter
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>{isPresenter ? "Presenter Mode ON" : "Presenter Mode"}</span>
            </Link>
          </div>
        </div>

        {/* Why It Matters */}
        {entry.whyItMatters && (
          <div className="p-4 md:p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                Why It Matters in Production
              </h4>
              <p className={`text-slate-300 leading-relaxed ${isPresenter ? "text-base" : "text-sm"}`}>
                {entry.whyItMatters}
              </p>
            </div>
          </div>
        )}

        {/* Live Interactive Demo Runner Area */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
          <DemoRenderer
            entry={{
              id: entry.id,
              slug: entry.slug,
              title: entry.title,
              category: entry.category,
              demoType: entry.demoType as any,
              config: entry.config,
            }}
          />
        </div>

        {/* Collapsible Notes (Markdown: What I learned) */}
        {entry.notes && (
          <details
            open={false}
            className="group rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 open:bg-slate-900/80 transition-colors"
          >
            <summary className="flex items-center justify-between cursor-pointer list-none select-none">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-200 text-sm">
                  What I Learned & Architecture Notes
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="mt-4 pt-4 border-t border-slate-800 prose prose-invert prose-indigo max-w-none text-slate-300 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {entry.notes}
              </ReactMarkdown>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

