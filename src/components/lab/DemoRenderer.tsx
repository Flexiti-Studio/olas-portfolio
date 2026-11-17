"use client";

import React from "react";
import { ComponentRunner } from "./runners/ComponentRunner";
import { DemoErrorBoundary } from "./DemoErrorBoundary";
import { Code2, Globe, BookOpen, HelpCircle } from "lucide-react";

export interface DemoRendererProps {
  entry: {
    id?: string;
    slug?: string;
    title: string;
    category: string;
    demoType: "SANDBOX" | "COMPONENT" | "API_TESTER" | "EXPLAINER" | "SELF_CHECK";
    config: any;
    [key: string]: any;
  };
}

export default function DemoRenderer({ entry }: DemoRendererProps) {
  const { demoType, config } = entry;

  return (
    <DemoErrorBoundary fallbackTitle={`Error rendering ${entry.title}`}>
      <div className="w-full">
        {demoType === "COMPONENT" && <ComponentRunner config={config} />}

        {demoType === "SANDBOX" && (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <Code2 className="w-8 h-8 text-indigo-400 mx-auto" />
            <p className="text-sm font-semibold text-white">Sandbox Runner</p>
            <p className="text-xs text-slate-400">Loading client-side sandbox environment...</p>
          </div>
        )}

        {demoType === "API_TESTER" && (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <Globe className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">API Tester Runner</p>
            <p className="text-xs text-slate-400">Endpoint test suite ready.</p>
          </div>
        )}

        {demoType === "EXPLAINER" && (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <BookOpen className="w-8 h-8 text-purple-400 mx-auto" />
            <p className="text-sm font-semibold text-white">Explainer Runner</p>
            <p className="text-xs text-slate-400">Step-by-step interactive explainer.</p>
          </div>
        )}

        {demoType === "SELF_CHECK" && (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <HelpCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-white">Self Check Runner</p>
            <p className="text-xs text-slate-400">Interactive flashcards & self-assessment cards.</p>
          </div>
        )}
      </div>
    </DemoErrorBoundary>
  );
}

