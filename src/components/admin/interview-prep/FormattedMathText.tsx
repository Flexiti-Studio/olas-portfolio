"use client";
import React from "react";

// Formats LaTeX blocks $...$ or $$...$$ using simple Unicode/sup/sub or formatted typography cleanly
// When KaTeX is not bundled, this ensures equations like $O(n \log n)$, $\sum$, $\frac{a}{b}$, $x^2$ render beautifully.
export function FormattedMathText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  // Split on $$...$$ or $...$
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        const isBlockMath = part.startsWith("$$") && part.endsWith("$$");
        const isInlineMath = !isBlockMath && part.startsWith("$") && part.endsWith("$");

        if (isBlockMath || isInlineMath) {
          const rawFormula = isBlockMath ? part.slice(2, -2).trim() : part.slice(1, -1).trim();

          // Nicely convert common LaTeX tokens to clean mathematical display
          const displayFormula = rawFormula
            .replace(/\\cdot/g, "·")
            .replace(/\\times/g, "×")
            .replace(/\\le(q)?/g, "≤")
            .replace(/\\ge(q)?/g, "≥")
            .replace(/\\ne(q)?/g, "≠")
            .replace(/\\approx/g, "≈")
            .replace(/\\infty/g, "∞")
            .replace(/\\in/g, "∈")
            .replace(/\\sum/g, "∑")
            .replace(/\\prod/g, "∏")
            .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
            .replace(/\\sqrt/g, "√")
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
            .replace(/\\alpha/g, "α")
            .replace(/\\beta/g, "β")
            .replace(/\\gamma/g, "γ")
            .replace(/\\theta/g, "θ")
            .replace(/\\lambda/g, "λ")
            .replace(/\\mu/g, "μ")
            .replace(/\\sigma/g, "σ")
            .replace(/\\pi/g, "π")
            .replace(/\\Delta/g, "Δ")
            .replace(/\\log/g, "log")
            .replace(/\\ln/g, "ln")
            .replace(/\\text\{([^}]+)\}/g, "$1")
            .replace(/\^([0-9a-zA-Z]+)/g, "^$1")
            .replace(/_([0-9a-zA-Z]+)/g, "_$1");

          if (isBlockMath) {
            return (
              <span
                key={index}
                className="my-3 block p-3.5 bg-zinc-900/90 border border-indigo-900/40 rounded-xl font-mono text-center text-sm md:text-base text-indigo-200 tracking-wide shadow-inner overflow-x-auto"
              >
                {displayFormula}
              </span>
            );
          }

          return (
            <span
              key={index}
              className="inline-block px-1.5 py-0.5 mx-0.5 bg-indigo-950/50 border border-indigo-800/40 rounded font-mono text-xs md:text-sm text-indigo-300 font-semibold"
            >
              {displayFormula}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

