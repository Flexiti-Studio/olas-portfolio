"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DemoErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Demo runner crash caught by boundary:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">
                {this.props.fallbackTitle || "Demo Runtime Error"}
              </h4>
              <p className="text-xs text-rose-300/80">
                The demo component encountered an uncaught runtime exception.
              </p>
            </div>
          </div>

          {this.state.error && (
            <pre className="p-3 bg-slate-950/80 border border-rose-500/20 rounded-xl text-xs font-mono text-rose-400 overflow-x-auto max-h-40">
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}

          <button
            onClick={this.reset}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Runner</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

