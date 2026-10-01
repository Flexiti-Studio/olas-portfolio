"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PullNewsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handlePull = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dev/pull-news');
      const data = await res.json();
      if (!res.ok) {
        showToast(`Error pulling news: ${data.error || 'Unknown error'}`, 'error');
      } else {
        showToast(`Success: ${data.message} (${data.count} new entries)`, 'success');
        router.refresh();
      }
    } catch (err) {
      showToast(`Network error: ${String(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handlePull} 
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
      >
        {loading ? 'Pulling...' : 'Pull Fresh News'}
      </button>

      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transform transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-950/90 border-green-900 text-green-100' 
            : 'bg-red-950/90 border-red-900 text-red-100'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
