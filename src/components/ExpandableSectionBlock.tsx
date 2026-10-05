"use client";

import React, { useState, useRef, useEffect } from 'react';

interface ExpandableSectionBlockProps {
  title: string;
  icon: string;
  content?: string | null;
  section?: 'identity' | 'instruments' | 'thesis' | 'criteria' | 'execution' | 'risk' | 'performance';
}

export function ExpandableSectionBlock({ title, icon, content }: ExpandableSectionBlockProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasContent = !!content;

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
      }
    };

    // Check immediately and on window resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [content]);

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-full flex flex-col">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
          {title}
        </h2>
        <div className="flex-1 min-w-0">
          <div 
            ref={contentRef}
            className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-3"
          >
            {hasContent ? content : <span className="text-gray-600 italic">Not specified</span>}
          </div>
        </div>
        {isOverflowing && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 self-start transition-colors"
          >
            Read more <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">{icon}</span>
                {title}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
