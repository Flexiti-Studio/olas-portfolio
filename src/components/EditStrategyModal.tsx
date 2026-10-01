"use client";

import React, { useState } from 'react';
import { StrategyForm } from './StrategyForm';
import { TradingStrategy } from '@prisma/client';

import { useRouter } from 'next/navigation';

export function EditStrategyModal({ strategy, section }: { strategy: TradingStrategy; section?: 'identity' | 'instruments' | 'thesis' | 'criteria' | 'execution' | 'risk' | 'performance' }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center"
        title="Edit Strategy"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">Edit Strategy</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          <StrategyForm 
            initialData={strategy as any}
            focusSection={section}
            onSave={() => {
              router.refresh();
              setTimeout(() => setIsOpen(false), 800);
            }} 
          />
        </div>
      </div>
    </div>
  );
}
