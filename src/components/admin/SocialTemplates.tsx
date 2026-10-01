"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Star,
  StarOff,
  Loader2,
  AlertCircle,
  Play
} from "lucide-react";

interface SocialTemplate {
  id: string;
  platform: string;
  name: string;
  description: string | null;
  body: string;
  imagePromptTemplate?: string | null;
  placeholders: string[];
  is_primary: boolean;
}

export default function SocialTemplates() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Available platforms (fetched from DB + defaults)
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(["youtube", "tiktok", "instagram", "twitter", "linkedin", "threads"]);

  // Editor State
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [formPlatform, setFormPlatform] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formImagePrompt, setFormImagePrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Live Example State
  const [samplePost, setSamplePost] = useState("");
  const [testResult, setTestResult] = useState("");
  const [imagePromptTestResult, setImagePromptTestResult] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Image Prompt Live Example State
  const [sampleImagePost, setSampleImagePost] = useState("");
  const [imagePromptTestResultOnly, setImagePromptTestResultOnly] = useState("");
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Modals / confirmations
  const [templateToDelete, setTemplateToDelete] = useState<SocialTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchPlatforms();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/social-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const res = await fetch("/api/socials");
      if (res.ok) {
        const data = await res.json();
        if (data.socials && data.socials.length > 0) {
          // merge with defaults
          const merged = Array.from(new Set([...availablePlatforms, ...data.socials]));
          setAvailablePlatforms(merged);
        }
      }
    } catch (err) {
      console.error("Failed to load platforms", err);
    }
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  const handleSelectTemplate = (template: SocialTemplate) => {
    setActiveTemplateId(template.id);
    setFormPlatform(template.platform);
    setFormName(template.name);
    setFormDesc(template.description || "");
    setFormBody(template.body);
    setFormImagePrompt(template.imagePromptTemplate || "");
    setTestResult("");
    setImagePromptTestResult("");
  };

  const handleCreateNew = () => {
    setActiveTemplateId("new");
    setFormPlatform(availablePlatforms[0]);
    setFormName("New Template");
    setFormDesc("");
    setFormBody("Hook: {{hook}}\n\nBody: {{body}}\n\nCall to Action: {{cta}}\n\nHashtags: {{hashtags}}");
    setFormImagePrompt("");
    setTestResult("");
    setImagePromptTestResult("");
  };

  const handleDuplicate = (template: SocialTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTemplateId("new");
    setFormPlatform(template.platform);
    setFormName(`${template.name} (Copy)`);
    setFormDesc(template.description || "");
    setFormBody(template.body);
    setFormImagePrompt(template.imagePromptTemplate || "");
    setTestResult("");
    setImagePromptTestResult("");
  };

  const handleSave = async () => {
    if (!formName || !formBody || !formPlatform) return;
    setIsSaving(true);
    
    // Extract placeholders (e.g. {{hook}})
    const placeholderMatches = formBody.match(/\{\{([^}]+)\}\}/g) || [];
    const placeholders = placeholderMatches.map(p => p.replace(/[{}]/g, ''));

    const payload = {
      platform: formPlatform,
      name: formName,
      description: formDesc,
      body: formBody,
      imagePromptTemplate: formImagePrompt,
      placeholders
    };

    try {
      if (activeTemplateId && activeTemplateId !== "new") {
        const res = await fetch(`/api/social-templates/${activeTemplateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, ...data.template } : t));
        }
      } else {
        const res = await fetch("/api/social-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(prev => [data.template, ...prev]);
          setActiveTemplateId(data.template.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/social-templates/${templateToDelete.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
        if (activeTemplateId === templateToDelete.id) {
          setActiveTemplateId(null);
        }
        setTemplateToDelete(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (template: SocialTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (template.is_primary) return;
    try {
      const res = await fetch(`/api/social-templates/${template.id}`, { method: "PATCH" });
      if (res.ok) {
        setTemplates(prev => prev.map(t => 
          t.platform === template.platform 
            ? { ...t, is_primary: t.id === template.id } 
            : t
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    const textToCopy = [
      testResult && `Post Content:\n${testResult}`,
      imagePromptTestResult && `Image Prompt:\n${imagePromptTestResult}`
    ].filter(Boolean).join('\n\n');
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyImagePrompt = () => {
    if (imagePromptTestResultOnly) {
      navigator.clipboard.writeText(imagePromptTestResultOnly);
      setIsCopiedImage(true);
      setTimeout(() => setIsCopiedImage(false), 2000);
    }
  };

  const handleTestImagePrompt = async () => {
    if (!sampleImagePost.trim()) return;
    setIsTestingImage(true);
    setImagePromptTestResultOnly("");
    
    try {
      const res = await fetch("/api/social-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formPlatform,
          name: formName,
          description: formDesc,
          body: formBody,
          imagePromptTemplate: formImagePrompt,
          samplePost: sampleImagePost
        })
      });
      const data = await res.json();
      if (data.imagePrompt) {
        setImagePromptTestResultOnly(data.imagePrompt);
      } else {
        setImagePromptTestResultOnly("No image prompt generated. Ensure you have provided an Image Prompt Template and a Source Post.");
      }
    } catch (err) {
      console.error("Test failed:", err);
      setImagePromptTestResultOnly("Failed to reach test server.");
    } finally {
      setIsTestingImage(false);
    }
  };

  const handleTestTemplate = async () => {
    if (!samplePost.trim()) return;
    setIsTesting(true);
    setTestResult("");
    setImagePromptTestResult("");
    
    try {
      const res = await fetch("/api/social-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formPlatform,
          name: formName,
          description: formDesc,
          body: formBody,
          imagePromptTemplate: formImagePrompt,
          samplePost
        })
      });
      const data = await res.json();
      if (data.rewritten) {
        setTestResult(data.rewritten);
        if (data.imagePrompt) setImagePromptTestResult(data.imagePrompt);
      } else {
        setTestResult("Error generating test result.");
      }
    } catch (err) {
      console.error("Test failed:", err);
      setTestResult("Failed to reach test server.");
    } finally {
      setIsTesting(false);
    }
  };

  // Group templates for sidebar
  const templatesByPlatform = templates.reduce((acc, t) => {
    if (!acc[t.platform]) acc[t.platform] = [];
    acc[t.platform].push(t);
    return acc;
  }, {} as Record<string, SocialTemplate[]>);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[800px] text-slate-200">
      
      {/* LEFT SIDEBAR: List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">Templates</h2>
            <p className="text-xs text-slate-400 mt-1">Select one as default per platform</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : Object.keys(templatesByPlatform).length === 0 ? (
            <div className="text-center text-slate-500 p-8 text-sm">No templates found. Create one to get started!</div>
          ) : (
            Object.entries(templatesByPlatform).map(([platform, items]) => (
              <div key={platform}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">{platform}</h3>
                <div className="space-y-2">
                  {items.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className={`p-4 rounded-2xl cursor-pointer border transition-all relative group ${
                        activeTemplateId === t.id 
                          ? 'bg-slate-800 border-emerald-500/50 shadow-md' 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          {t.is_primary && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                          <h4 className="font-bold text-sm text-white">{t.name}</h4>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 pr-12">{t.description || "No description"}</p>
                      
                      {/* Hover Actions */}
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                          onClick={(e) => handleSetPrimary(t, e)}
                          title="Set Default"
                          className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-md border border-slate-700"
                        >
                          <Check size={12} />
                        </button>
                        <button 
                          onClick={(e) => handleDuplicate(t, e)}
                          title="Duplicate"
                          className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-900 rounded-md border border-slate-700"
                        >
                          <Copy size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setTemplateToDelete(t); }}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 rounded-md border border-slate-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT AREA: Editor & Live Panel */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        {!activeTemplateId ? (
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 shadow-xl">
            <Plus className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a template to edit or create a new one.</p>
          </div>
        ) : (
          <>
            {/* Editor Top */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 relative z-10 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-white">
                  {activeTemplateId === "new" ? "Create New Template" : "Edit Template"}
                </h2>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Template
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1.5">Platform</label>
                    <select
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors capitalize"
                    >
                      {availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1.5">Template Name</label>
                    <input 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. High-Retention Reel"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-1.5">Description & AI Rules</label>
                    <textarea 
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      rows={5}
                      placeholder="e.g. Tone should be exciting. Never use emojis. End with a question."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-semibold text-slate-400 mb-1.5 flex justify-between">
                      <span>Template Design</span>
                      <span className="text-[10px] text-slate-500 font-normal">Use {"{{placeholder}}"} syntax</span>
                    </label>
                    <textarea 
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar leading-relaxed"
                    />
                  </div>
                  <div className="h-40 flex flex-col">
                    <label className="block text-sm font-semibold text-slate-400 mb-1.5 flex justify-between">
                      <span>Image Prompt Template</span>
                      <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                    </label>
                    <textarea 
                      value={formImagePrompt}
                      onChange={(e) => setFormImagePrompt(e.target.value)}
                      placeholder="e.g. High resolution photography, cinematic lighting..."
                      className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Example Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                <h3 className="text-lg font-bold text-white">Live Example Panel</h3>
              </div>
              <div className="grid grid-cols-2 gap-6 flex-1">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sample Source Post</label>
                  <textarea
                    value={samplePost}
                    onChange={(e) => setSamplePost(e.target.value)}
                    placeholder="Paste a raw script or post here to test how the AI applies your template..."
                    className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 resize-none mb-4"
                  />
                  <button 
                    onClick={handleTestTemplate}
                    disabled={isTesting || !samplePost.trim()}
                    className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Template"}
                  </button>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Output Preview</label>
                    <button
                      onClick={handleCopy}
                      disabled={!testResult && !imagePromptTestResult}
                      className="text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium disabled:cursor-not-allowed"
                      title="Copy output"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? <span className="text-emerald-400">Copied</span> : "Copy"}
                    </button>
                  </div>
                  <div className="flex-1 w-full bg-black border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {testResult ? (
                      <>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Post Content</div>
                          {testResult}
                        </div>
                        {imagePromptTestResult && (
                          <div className="border-t border-slate-800 pt-3">
                            <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Image Prompt</div>
                            {imagePromptTestResult}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-600 italic">Click "Test Template" to see the simulated result here.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Prompt Testing Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                <h3 className="text-lg font-bold text-white">Image Prompt Live Example</h3>
              </div>
              <div className="grid grid-cols-2 gap-6 flex-1">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Image Prompt Template</label>
                    <textarea
                      value={formImagePrompt}
                      onChange={(e) => setFormImagePrompt(e.target.value)}
                      placeholder="Paste or write your image prompt template here..."
                      className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sample Source Post</label>
                    <textarea
                      value={sampleImagePost}
                      onChange={(e) => setSampleImagePost(e.target.value)}
                      placeholder="Paste a raw script or post here to test the image prompt template..."
                      className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleTestImagePrompt}
                    disabled={isTestingImage || !sampleImagePost.trim()}
                    className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {isTestingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Image Prompt"}
                  </button>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated Image Prompt</label>
                    <button
                      onClick={handleCopyImagePrompt}
                      disabled={!imagePromptTestResultOnly}
                      className="text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium disabled:cursor-not-allowed"
                      title="Copy output"
                    >
                      {isCopiedImage ? <Check className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4" />}
                      {isCopiedImage ? <span className="text-indigo-400">Copied</span> : "Copy"}
                    </button>
                  </div>
                  <div className="flex-1 w-full bg-black border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {imagePromptTestResultOnly ? (
                      <div>
                        {imagePromptTestResultOnly}
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">Click "Test Image Prompt" to see the simulated result here.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {templateToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setTemplateToDelete(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Delete Template
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Are you sure you want to delete "{templateToDelete.name}"? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setTemplateToDelete(null)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
