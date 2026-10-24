"use client";

import React, { useState } from 'react';
import { createEaStrategy } from '@/app/actions/eaLab';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { STRATEGY_CATEGORIES } from '@/lib/ea-lab/categories';

interface CreateStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (strategyId: string) => void;
  defaultCategory?: string;
}

export function CreateStrategyModal({ isOpen, onClose, onCreated, defaultCategory }: CreateStrategyModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategory || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory]);

  if (!isOpen) return null;

  const selectedCategoryDef = STRATEGY_CATEGORIES.find(
    (c) => c.name.toLowerCase() === category.toLowerCase() || c.id === category
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a strategy name.');
      toast.error('Please provide a strategy name.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createEaStrategy({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });

    setLoading(false);

    if (!res.success || !res.strategy) {
      setError(res.error || 'Failed to create strategy');
      toast.error(res.error || 'Failed to create strategy');
      return;
    }

    toast.success(`EA Strategy "${res.strategy.name}" created successfully!`);
    setName('');
    setDescription('');
    setCategory('');
    onClose();
    if (onCreated) {
      onCreated(res.strategy.id);
    } else {
      router.push(`/trading/ea-lab/${res.strategy.id}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-2xl">science</span>
            <h3 className="text-xl font-bold text-white">Create EA Strategy</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Strategy Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Olas Retest Breakout EA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Strategy Category / Archetype
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-xs"
            >
              <option value="">Select a Category (Optional)</option>
              {STRATEGY_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  #{cat.number} {cat.name}
                </option>
              ))}
            </select>
            {selectedCategoryDef && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">
                  {selectedCategoryDef.icon}
                </span>
                <div>
                  <span className="font-semibold text-white">Main Idea: </span>
                  {selectedCategoryDef.mainIdea}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Description / Thesis
            </label>
            <textarea
              rows={3}
              placeholder="Documents market logic, trigger criteria, and what this MT5 bot aims to exploit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Creating...
                </>
              ) : (
                'Create Strategy'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
