"use client";

import React from "react";
import { COMPONENT_REGISTRY } from "@/lib/lab/registry";
import { DemoErrorBoundary } from "../DemoErrorBoundary";
import { Layers, AlertCircle } from "lucide-react";

interface ComponentRunnerProps {
  config: {
    componentKey?: string;
    [key: string]: any;
  };
}

export function ComponentRunner({ config }: ComponentRunnerProps) {
  const componentKey = config?.componentKey;

  if (!componentKey || !COMPONENT_REGISTRY[componentKey]) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-white">Component Not Registered</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The component key <code className="text-indigo-400 font-mono">&quot;{componentKey || "undefined"}&quot;</code> is not in the lab component registry.
        </p>
      </div>
    );
  }

  const Registered = COMPONENT_REGISTRY[componentKey].component;

  return (
    <DemoErrorBoundary fallbackTitle={`Error in ${componentKey}`}>
      <div className="w-full">
        <Registered />
      </div>
    </DemoErrorBoundary>
  );
}

