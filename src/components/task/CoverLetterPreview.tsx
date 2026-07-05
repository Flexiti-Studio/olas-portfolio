"use client";

import React from "react";

export default function CoverLetterPreview({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="w-full max-w-[850px] mx-auto bg-white text-black p-10 font-sans text-[14px] leading-relaxed shadow-sm min-h-[1056px]">
      <div 
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
