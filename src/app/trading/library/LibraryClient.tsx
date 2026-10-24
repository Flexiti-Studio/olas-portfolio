"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  LIBRARY_CATEGORIES,
  LIBRARY_STRATEGIES,
  LibraryStrategy,
  StrategyImage,
} from '@/lib/trading/libraryData';
import { VersionControlTab } from '@/components/trading-library/VersionControlTab';
import { ChecklistTab } from '@/components/trading-library/ChecklistTab';

export function LibraryClient() {
  const [activeTab, setActiveTab] = useState<'strategies' | 'version-control' | 'checklist'>('strategies');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  // Strategy images stored by strategyId in localStorage
  const [strategyImages, setStrategyImages] = useState<Record<string, StrategyImage[]>>({});

  // Add Image Modal State
  const [activeModalStrategy, setActiveModalStrategy] = useState<LibraryStrategy | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    strategyName: string;
  } | null>(null);

  // Load images from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('trading_library_images_v1');
      if (stored) {
        setStrategyImages(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load library images from storage', e);
    }
  }, []);

  // Save images to localStorage helper
  function saveImages(updated: Record<string, StrategyImage[]>) {
    setStrategyImages(updated);
    try {
      localStorage.setItem('trading_library_images_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save library images to storage', e);
    }
  }

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    return LIBRARY_STRATEGIES.filter((s) => {
      // Category match
      const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;

      // Difficulty match
      const matchesDiff =
        difficultyFilter === 'all' ||
        s.difficulty.toLowerCase().includes(difficultyFilter.toLowerCase());

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.bestForTesting.toLowerCase().includes(q) ||
        s.howItWorks.some((h) => h.toLowerCase().includes(q)) ||
        (s.exampleBotRules && s.exampleBotRules.some((r) => r.toLowerCase().includes(q))) ||
        s.mainWeakness.toLowerCase().includes(q);

      return matchesCat && matchesDiff && matchesSearch;
    });
  }, [selectedCategory, difficultyFilter, searchQuery]);

  // File selection handler
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setUploadError(null);
    }
  }

  // Submit new image
  async function handleAddImageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeModalStrategy) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let finalUrl = '';
      const finalCaption = imageCaptionInput.trim();

      if (uploadMode === 'file') {
        if (!selectedFile) {
          throw new Error('Please select an image file to upload');
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('strategyId', activeModalStrategy.id);
        formData.append('caption', finalCaption);

        const res = await fetch('/api/trading/library/images', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        finalUrl = data.image.url;
      } else {
        // URL Mode
        if (!imageUrlInput.trim()) {
          throw new Error('Please enter a valid image URL');
        }
        finalUrl = imageUrlInput.trim();
      }

      const newImage: StrategyImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: finalUrl,
        caption: finalCaption || `${activeModalStrategy.name} Chart Setup`,
        uploadedAt: new Date().toISOString(),
      };

      const strategyId = activeModalStrategy.id;
      const existing = strategyImages[strategyId] || [];
      const updated = {
        ...strategyImages,
        [strategyId]: [...existing, newImage],
      };

      saveImages(updated);

      // Reset modal
      setActiveModalStrategy(null);
      setSelectedFile(null);
      setFilePreview(null);
      setImageUrlInput('');
      setImageCaptionInput('');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to add image');
    } finally {
      setIsUploading(false);
    }
  }

  // Delete image
  function handleDeleteImage(strategyId: string, imageId: string) {
    if (!confirm('Are you sure you want to remove this chart image?')) return;
    const existing = strategyImages[strategyId] || [];
    const updated = {
      ...strategyImages,
      [strategyId]: existing.filter((img) => img.id !== imageId),
    };
    saveImages(updated);
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1.5 uppercase tracking-wider">
            <span>Trading</span>
            <span>/</span>
            <span className="text-zinc-400">Library</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500 text-3xl">local_library</span>
            The 12 Bot Strategy Playbook
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Systematic blueprint of the 12 algorithmic strategies worth testing in your trading bot, ranked by mechanical usefulness with chart setup galleries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/trading/ea-lab"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-blue-400">science</span>
            Open EA Lab Tester
          </Link>
        </div>
      </div>

      {/* Primary Page Navigation Tabs: Strategies Playbook, Version Control, Checklist */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('strategies')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTab === 'strategies'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">auto_stories</span>
          <span>12 Bot Strategies</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            12
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('version-control')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTab === 'version-control'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">commit</span>
          <span>Version Control</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            Releases
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border ${
            activeTab === 'checklist'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-900/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-base">task_alt</span>
          <span>Bot QA Checklist</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
            Pre-Flight
          </span>
        </button>
      </div>

      {/* Main Two-Column Layout: Left Category Nav Bar + Right Strategies Display (when strategies tab is active) */}
      {activeTab === 'strategies' && (
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8 relative animate-in fade-in duration-150">
        {/* LEFT COLUMN: Main Category Navigation Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 sticky top-6 z-30">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
            {/* Category Nav Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-lg">folder_special</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Strategy Categories
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                12 Strategies
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-zinc-500 text-xs">
                search
              </span>
              <input
                type="text"
                placeholder="Search strategies or rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Difficulty Filter Pills */}
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Difficulty Level
              </label>
              <div className="grid grid-cols-4 gap-1 text-[10px] font-medium">
                {['all', 'easy', 'intermediate', 'advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficultyFilter(lvl)}
                    className={`py-1 rounded-lg text-center capitalize transition-colors ${
                      difficultyFilter === lvl
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/60'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Nav Tabs */}
            <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Main Frameworks
              </label>

              {LIBRARY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border group ${
                      isSelected
                        ? `${cat.bgColor} ${cat.borderColor} text-white shadow-md shadow-blue-900/10`
                        : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/70 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-zinc-800 text-white border border-zinc-700'
                            : 'bg-zinc-800/70 text-zinc-400 group-hover:text-blue-400'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-base ${isSelected ? cat.color : ''}`}>
                          {cat.icon}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          {cat.letter && (
                            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              {cat.letter}
                            </span>
                          )}
                          <span className="truncate">{cat.shortName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate group-hover:text-zinc-400">
                          {cat.description}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Strategy Jump List */}
            <div className="pt-2 border-t border-zinc-800/80">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Quick Jump
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar hide-scrollbar scrollbar-none pr-1">
                {LIBRARY_STRATEGIES.map((s) => (
                  <a
                    key={s.id}
                    href={`#strategy-${s.id}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-mono text-zinc-400 font-bold w-4">#{s.number}</span>
                    <span className="truncate">{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Strategy Cards Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Active Category Hero Card */}
          {(() => {
            const activeCat = LIBRARY_CATEGORIES.find((c) => c.id === selectedCategory);
            return (
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-950/60 text-blue-400 border border-blue-900/60">
                        {activeCat?.shortName || 'Strategy Playbook'}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-400">
                        Showing {filteredStrategies.length} of 12 strategies
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <span className={`material-symbols-outlined ${activeCat?.color || 'text-blue-400'}`}>
                        {activeCat?.icon || 'library_books'}
                      </span>
                      {activeCat?.name || 'All Strategies'}
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                      {activeCat?.description ||
                        'Ranked by practical usefulness as mechanical starting points for trading bot development, not unverified claims of guaranteed profitability.'}
                    </p>
                  </div>

                  {selectedCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors self-start sm:self-auto flex items-center gap-1 shrink-0"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                      Show All Categories
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Strategies List */}
          <div className="space-y-6">
            {filteredStrategies.map((s) => {
              const images = strategyImages[s.id] || [];

              const diffColor = {
                Easy: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80',
                'Easy to intermediate': 'bg-teal-950/60 text-teal-400 border-teal-800/80',
                Intermediate: 'bg-blue-950/60 text-blue-400 border-blue-800/80',
                'Intermediate to advanced': 'bg-amber-950/60 text-amber-400 border-amber-800/80',
                Advanced: 'bg-purple-950/60 text-purple-400 border-purple-800/80',
              }[s.difficulty] || 'bg-zinc-800 text-zinc-400 border-zinc-700';

              const catBadgeColor = {
                trend: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
                momentum: 'text-cyan-400 bg-cyan-950/40 border-cyan-900/50',
                breakout: 'text-amber-400 bg-amber-950/40 border-amber-900/50',
                'mean-reversion': 'text-purple-400 bg-purple-950/40 border-purple-900/50',
              }[s.category];

              return (
                <div
                  key={s.id}
                  id={`strategy-${s.id}`}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5 transition-all hover:border-zinc-700/90 scroll-mt-6"
                >
                  {/* Top Bar: Number, Category, Title, Difficulty */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-900 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Number Badge */}
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-white">
                          #{s.number}
                        </span>

                        {/* Category Chip */}
                        <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-md border ${catBadgeColor}`}>
                          Category {s.categoryLetter} • {s.categoryLabel}
                        </span>

                        {/* Difficulty */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${diffColor}`}>
                          {s.difficulty}
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        {s.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalStrategy(s);
                          setUploadMode('file');
                          setSelectedFile(null);
                          setFilePreview(null);
                          setImageUrlInput('');
                          setImageCaptionInput('');
                          setUploadError(null);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Upload chart screenshot or paste image URL"
                      >
                        <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                        Add Setup Image
                      </button>

                      <Link
                        href={`/trading/ea-lab?strategy=${encodeURIComponent(s.name)}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors flex items-center gap-1"
                        title="Benchmark this strategy in EA Lab"
                      >
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                        Test in Lab
                      </Link>
                    </div>
                  </div>

                  {/* Best For Testing Strip */}
                  <div className="flex items-center gap-2 text-xs bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="material-symbols-outlined text-blue-400 text-base shrink-0">
                      tune
                    </span>
                    <span className="font-semibold text-zinc-300">Best For Testing:</span>
                    <span className="text-zinc-200">{s.bestForTesting}</span>
                  </div>

                  {/* Core Mechanics: How It Works */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-400">psychology</span>
                      How It Works
                    </h4>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {s.howItWorks.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[13px] text-blue-400 shrink-0 mt-0.5">
                            arrow_right
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Example Bot Rules / Inputs (if available) */}
                  {s.exampleBotRules && (
                    <div className="space-y-2 bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-800/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">smart_toy</span>
                        Example Bot Execution Rules
                      </h4>
                      <ul className="space-y-1.5 text-xs text-zinc-300 font-mono">
                        {s.exampleBotRules.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-zinc-400 font-bold text-[10px] mt-0.5">{idx + 1}.</span>
                            <span className="leading-relaxed font-sans">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Possible Inputs (for Momentum #4) */}
                  {s.possibleInputs && (
                    <div className="space-y-2 bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-800/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">view_timeline</span>
                        Possible Algorithmic Inputs
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {s.possibleInputs.map((input, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px] font-mono"
                          >
                            • {input}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mathematical Formula (for Z-Score #11) */}
                  {s.formula && (
                    <div className="space-y-2 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">functions</span>
                        Mathematical Formula
                      </h4>
                      <div className="p-3 rounded-lg bg-black/60 border border-zinc-800/80 font-mono text-center text-sm text-purple-300">
                        {s.formula.latex}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-zinc-400 font-mono">
                        {s.formula.terms.map((term, idx) => (
                          <div key={idx} className="p-2 rounded bg-zinc-900/50 border border-zinc-800/40">
                            <span className="text-white font-bold">{term.symbol}: </span>
                            <span>{term.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Why Test It (if available) */}
                  {s.whyTestIt && (
                    <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-blue-400 text-sm shrink-0 mt-0.5">
                        verified
                      </span>
                      <div>
                        <span className="font-bold text-white">Why Test It: </span>
                        {s.whyTestIt}
                      </div>
                    </div>
                  )}

                  {/* Main Weakness / Failure Mode */}
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-300 leading-relaxed flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-400 text-sm shrink-0 mt-0.5">
                      warning
                    </span>
                    <div>
                      <span className="font-bold text-white">Main Weakness: </span>
                      {s.mainWeakness}
                    </div>
                  </div>

                  {/* Research Link / Citation */}
                  {s.research && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="material-symbols-outlined text-zinc-400 text-sm">
                        menu_book
                      </span>
                      <span className="text-zinc-400">Research Citation:</span>
                      <a
                        href={s.research.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>{s.research.source}</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </a>
                    </div>
                  )}

                  {/* ATTACHED SETUP IMAGES & CHARTS GALLERY */}
                  <div className="pt-3 border-t border-zinc-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-400">imagesmode</span>
                        Chart Setups & Visual References ({images.length})
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalStrategy(s);
                          setUploadMode('file');
                          setSelectedFile(null);
                          setFilePreview(null);
                          setImageUrlInput('');
                          setImageCaptionInput('');
                          setUploadError(null);
                        }}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">add_photo_alternate</span>
                        + Add Image
                      </button>
                    </div>

                    {images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((img) => (
                          <div
                            key={img.id}
                            className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all shadow-md aspect-video cursor-pointer"
                            onClick={() =>
                              setLightboxImage({
                                url: img.url,
                                caption: img.caption,
                                strategyName: s.name,
                              })
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.caption || s.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Caption Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-[11px] text-white truncate">
                              {img.caption || 'Chart setup'}
                            </div>

                            {/* Delete Button (hover) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(s.id, img.id);
                              }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete image"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>

                            {/* Enlarge Hint */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                              <span className="material-symbols-outlined text-white text-2xl drop-shadow-md">
                                zoom_in
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setActiveModalStrategy(s);
                          setUploadMode('file');
                          setSelectedFile(null);
                          setFilePreview(null);
                          setImageUrlInput('');
                          setImageCaptionInput('');
                          setUploadError(null);
                        }}
                        className="p-5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/20 text-center cursor-pointer transition-colors group"
                      >
                        <span className="material-symbols-outlined text-zinc-600 group-hover:text-blue-400 text-2xl block mb-1">
                          add_photo_alternate
                        </span>
                        <p className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
                          No chart setups attached yet
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Click to upload TradingView screenshots, backtest charts, or paste an image URL
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
      )}

      {/* VERSION CONTROL TAB VIEW */}
      {activeTab === 'version-control' && (
        <div className="animate-in fade-in duration-150">
          <VersionControlTab />
        </div>
      )}

      {/* CHECKLIST TAB VIEW */}
      {activeTab === 'checklist' && (
        <div className="animate-in fade-in duration-150">
          <ChecklistTab />
        </div>
      )}

      {/* ADD IMAGE MODAL */}
      {activeModalStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-xl">add_photo_alternate</span>
                <h3 className="text-base font-bold text-white">
                  Add Chart Setup Image
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalStrategy(null)}
                className="text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="text-xs text-zinc-300">
              Adding image for strategy:{' '}
              <span className="font-bold text-white">
                #{activeModalStrategy.number} {activeModalStrategy.name}
              </span>
            </div>

            {/* Mode Tabs: File Upload vs URL */}
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  uploadMode === 'url'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Paste Image URL
              </button>
            </div>

            <form onSubmit={handleAddImageSubmit} className="space-y-4">
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Select Image File (PNG, JPG, WEBP)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-900/40 hover:bg-zinc-900/60 text-center cursor-pointer transition-all"
                  >
                    {filePreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={filePreview}
                          alt="Upload preview"
                          className="max-h-40 mx-auto rounded-lg object-contain"
                        />
                        <span className="text-xs text-blue-400 block font-mono">
                          {selectedFile?.name} (Click to change)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="material-symbols-outlined text-zinc-500 text-3xl block mb-1">
                          cloud_upload
                        </span>
                        <span className="text-xs text-zinc-300 font-medium block">
                          Click to browse image from your computer
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          Supports chart snapshots, setup diagrams, and backtest logs
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Image or TradingView Snapshot URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://s3.tradingview.com/snapshots/... or https://..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Optional Caption */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Caption / Setup Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. M15 Bullish Retest Entry on XAUUSD"
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveModalStrategy(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'url' && !imageUrlInput.trim())}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      Saving Image...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">check</span>
                      Attach to #{activeModalStrategy.number}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Lightbox Bar */}
            <div className="w-full flex items-center justify-between text-xs text-zinc-300 px-2">
              <span className="font-semibold text-white">
                {lightboxImage.strategyName} • {lightboxImage.caption || 'Chart Setup'}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Lightbox Image */}
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl max-h-[80vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.caption || 'Full view'}
                className="max-h-[80vh] max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Caption */}
            {lightboxImage.caption && (
              <p className="text-xs text-zinc-400 text-center font-mono">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
