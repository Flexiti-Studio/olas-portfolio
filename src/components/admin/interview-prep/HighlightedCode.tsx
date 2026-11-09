"use client";
import React, { useMemo } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

// A lightweight, client-safe syntax highlighter that formats lines and token colors
export function HighlightedCode({ code, language = "typescript", className = "" }: CodeBlockProps) {
  // Ensure we preserve multi-line code structure cleanly even if code came in with escaped \n or semicolons
  const formattedCode = useMemo(() => {
    if (!code) return "";
    let clean = code;
    
    // If the entire code was compressed into a single line with escaped '\n' or raw semicolon lumps
    if (!clean.includes("\n") && clean.includes("\\n")) {
      clean = clean.replace(/\\n/g, "\n");
    }

    return clean;
  }, [code]);

  const lines = useMemo(() => formattedCode.split("\n"), [formattedCode]);

  // Tokenize each line for syntax color highlights
  const renderLine = (line: string, lineIdx: number) => {
    // If empty line, render a line break space
    if (!line) return <span key={lineIdx}>{"\n"}</span>;

    // Comments (// or #)
    if (/^\s*(\/\/|#|\/\*)/.test(line)) {
      return (
        <span key={lineIdx} className="text-zinc-500 italic block">
          {line}
        </span>
      );
    }

    // Split words, strings, keywords, numbers, punctuation
    const tokens = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|async|await|return|import|export|from|default|class|extends|if|else|switch|case|try|catch|finally|for|while|do|typeof|instanceof|interface|type|public|private|protected|new|throw|this|def|elif|lambda|yield|select|from|where|insert|update|delete|create|table)\b|\b\d+(?:\.\d+)?\b|[{}()\[\].,;:=+\-*\/%&|^!<>?])/g);

    return (
      <span key={lineIdx} className="block leading-relaxed">
        {tokens.map((tok, i) => {
          if (!tok) return null;

          // String literals
          if (/^(".*"|'.*'|`.*`)$/.test(tok)) {
            return (
              <span key={i} className="text-amber-300">
                {tok}
              </span>
            );
          }

          // Reserved Keywords
          if (
            /^(const|let|var|function|async|await|return|import|export|from|default|class|extends|if|else|switch|case|try|catch|finally|for|while|do|typeof|instanceof|interface|type|public|private|protected|new|throw|this|def|elif|lambda|yield|select|where|insert|update|delete|create|table)$/i.test(
              tok
            )
          ) {
            return (
              <span key={i} className="text-purple-400 font-semibold">
                {tok}
              </span>
            );
          }

          // Numbers
          if (/^\d+(?:\.\d+)?$/.test(tok)) {
            return (
              <span key={i} className="text-orange-400 font-mono">
                {tok}
              </span>
            );
          }

          // Types / Boolean / null / undefined
          if (/^(string|number|boolean|any|void|unknown|never|true|false|null|undefined|Promise|Array|Record|Object)$/.test(tok)) {
            return (
              <span key={i} className="text-cyan-400 font-semibold">
                {tok}
              </span>
            );
          }

          // Function calls e.g. functionName(
          if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(tok) && (line.includes(`${tok}(`) || line.includes(`${tok} (`))) {
            return (
              <span key={i} className="text-blue-400">
                {tok}
              </span>
            );
          }

          // Punctuation / Operators
          if (/^[{}()\[\].,;:=+\-*\/%&|^!<>?]$/.test(tok)) {
            return (
              <span key={i} className="text-zinc-400">
                {tok}
              </span>
            );
          }

          return <span key={i}>{tok}</span>;
        })}
      </span>
    );
  };

  return (
    <pre className={`py-4 px-5 bg-[#0d1117] overflow-x-auto text-sm font-mono text-zinc-200 leading-relaxed ${className}`}>
      {lines.map((l, idx) => (
        <div key={idx} className="table-row">
          <span className="table-cell pr-4 text-xs text-zinc-600 select-none text-right font-mono w-8">
            {idx + 1}
          </span>
          <span className="table-cell">{renderLine(l, idx)}</span>
        </div>
      ))}
    </pre>
  );
}

