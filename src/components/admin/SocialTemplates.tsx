"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  Type, 
  FileText,
  Star,
  StarOff,
  Loader2
} from "lucide-react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const Youtube = ({ size = 24, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const Instagram = ({ size = 24, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Twitter = ({ size = 24, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Linkedin = ({ size = 24, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);


interface SocialTemplate {
  id: string;
  platform: string;
  name: string;
  description: string | null;
  body: string;
  placeholders: string[];
  is_primary: boolean;
}

export default function SocialTemplates() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  
  // Create / Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SocialTemplate | null>(null);
  const [formPlatform, setFormPlatform] = useState("youtube");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formPlaceholderInput, setFormPlaceholderInput] = useState("");

  // Interactive Generator State
  const [activeGeneratorTemplate, setActiveGeneratorTemplate] = useState<SocialTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [generatedResult, setGeneratedResult] = useState("");
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SocialTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templatePage, setTemplatePage] = useState(1);

  useEffect(() => {
    fetchTemplates();
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

  const handleCopyTemplateText = (template: SocialTemplate) => {
    navigator.clipboard.writeText(template.body);
    setCopiedTemplateId(template.id);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormPlatform("youtube");
    setFormName("");
    setFormDesc("");
    setFormBody("");
    setFormPlaceholderInput("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: SocialTemplate) => {
    setEditingTemplate(template);
    setFormPlatform(template.platform);
    setFormName(template.name);
    setFormDesc(template.description || "");
    setFormBody(template.body);
    setFormPlaceholderInput((template.placeholders || []).join(", "));
    setIsModalOpen(true);
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
        if (activeGeneratorTemplate?.id === templateToDelete.id) {
          setActiveGeneratorTemplate(null);
          setGeneratedResult("");
        }
        setTemplateToDelete(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (template: SocialTemplate) => {
    if (template.is_primary) return; // already primary
    setSettingPrimaryId(template.id);
    try {
      const res = await fetch(`/api/social-templates/${template.id}`, {
        method: "PATCH"
      });
      if (res.ok) {
        // Update local state: unset all primary on same platform, set this one
        setTemplates(prev =>
          prev.map(t =>
            t.platform === template.platform
              ? { ...t, is_primary: t.id === template.id }
              : t
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBody || isSaving) return;

    setIsSaving(true);
    const placeholders = formPlaceholderInput
      .split(",")
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const payload = {
      platform: formPlatform,
      name: formName,
      description: formDesc,
      body: formBody,
      placeholders
    };

    try {
      if (editingTemplate) {
        const res = await fetch(`/api/social-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...data.template } : t));
          setIsModalOpen(false);
          if (activeGeneratorTemplate?.id === editingTemplate.id) {
            setActiveGeneratorTemplate(data.template);
          }
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
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generator engine
  const handleSelectGenerator = (template: SocialTemplate) => {
    setActiveGeneratorTemplate(template);
    const initialVals: Record<string, string> = {};
    template.placeholders.forEach(p => {
      initialVals[p] = "";
    });
    setPlaceholderValues(initialVals);
    setGeneratedResult(template.body);
  };

  const handlePlaceholderChange = (key: string, val: string) => {
    const updated = { ...placeholderValues, [key]: val };
    setPlaceholderValues(updated);

    let tempResult = activeGeneratorTemplate?.body || "";
    Object.entries(updated).forEach(([k, v]) => {
      const regex = new RegExp(`\\[${k}\\]`, "gi");
      tempResult = tempResult.replace(regex, v || `[${k}]`);
    });
    setGeneratedResult(tempResult);
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedResult);
    setCopiedGenerated(true);
    setTimeout(() => setCopiedGenerated(false), 2000);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube": return <Youtube className="w-5 h-5 text-red-500" />;
      case "instagram": return <Instagram className="w-5 h-5 text-pink-500" />;
      case "twitter": return <Twitter className="w-5 h-5 text-white" />;
      case "linkedin": return <Linkedin className="w-5 h-5 text-blue-500" />;
      default: return <Sparkles className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getPlatformClass = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube": return "border-red-500/20 bg-red-500/10 text-red-400";
      case "instagram": return "border-pink-500/20 bg-pink-500/10 text-pink-400";
      case "twitter": return "border-white/20 bg-white/5 text-white";
      case "linkedin": return "border-blue-500/20 bg-blue-500/10 text-blue-400";
      default: return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    }
  };

  const filteredTemplates = selectedPlatform === "all" 
    ? templates 
    : templates.filter(t => t.platform.toLowerCase() === selectedPlatform);

  // Group templates by platform for the primary summary
  const primaryByPlatform = templates.reduce<Record<string, SocialTemplate>>((acc, t) => {
    if (t.is_primary) acc[t.platform] = t;
    return acc;
  }, {});

  return (
    <div className="flex flex-col space-y-6 text-slate-200">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Social Media Templates</h1>
          <p className="text-zinc-400 mt-2">Manage outline frameworks. Mark one per platform as <span className="text-amber-400 font-semibold">Primary</span> — the AI will use it when generating content.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus size={16} /> New Template
        </button>
      </div>



      {/* Platforms Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {["all", "youtube", "tiktok", "instagram", "twitter", "linkedin"].map((platform) => (
          <button
            key={platform}
            onClick={() => { setSelectedPlatform(platform); setTemplatePage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize ${
              selectedPlatform === platform
                ? "bg-white text-black border-white shadow-md font-black"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            {platform}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl h-44" />
            ))}
          </div>
        ) : filteredTemplates.length > 0 ? (
          (() => {
            const TEMPLATES_PER_PAGE = 6;
            const totalTemplatePages = Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE);
            const currentTemplates = filteredTemplates.slice((templatePage - 1) * TEMPLATES_PER_PAGE, templatePage * TEMPLATES_PER_PAGE);

            return (
              <div className="flex flex-col justify-between min-h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      layoutId={template.id}
                      className={`bg-zinc-900 border rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between relative overflow-hidden group ${
                        template.is_primary
                          ? "border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
                          : "border-zinc-800"
                      }`}
                    >
                      {/* Primary Crown Badge */}
                      {template.is_primary && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-bl-xl flex items-center gap-1 uppercase tracking-wider">
                          <Star size={9} className="fill-black" /> AI Primary
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPlatformClass(template.platform)}`}>
                            {template.platform}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEdit(template)}
                              className="p-1 text-zinc-400 hover:text-white transition-colors"
                              title="Edit Template"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => setTemplateToDelete(template)}
                              className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-lg text-white mb-2 leading-tight group-hover:text-amber-400 transition-colors">
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="text-zinc-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                            {template.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-zinc-800/80 mt-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* Set Primary button */}
                          <button
                            onClick={() => handleSetPrimary(template)}
                            disabled={template.is_primary || settingPrimaryId === template.id}
                            title={template.is_primary ? "This is already the AI primary template" : "Set as AI primary template for this platform"}
                            className={`text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer px-2.5 py-1 rounded-lg border ${
                              template.is_primary
                                ? "text-amber-400 border-amber-700/40 bg-amber-950/30 cursor-default"
                                : "text-zinc-400 border-zinc-700/50 hover:text-amber-400 hover:border-amber-700/40 hover:bg-amber-950/20"
                            }`}
                          >
                            {template.is_primary ? (
                              <><Star size={11} className="fill-amber-400" /> Primary</>
                            ) : settingPrimaryId === template.id ? (
                              <>Setting...</>
                            ) : (
                              <><StarOff size={11} /> Set Primary</>
                            )}
                          </button>
                          <button 
                            onClick={() => handleCopyTemplateText(template)}
                            className="text-zinc-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedTemplateId === template.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {copiedTemplateId === template.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Templates Pagination Controls */}
                {totalTemplatePages > 1 && (
                  <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-sm">
                    <button 
                      onClick={() => setTemplatePage(prev => Math.max(1, prev - 1))}
                      disabled={templatePage === 1}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-zinc-500 font-medium">Page {templatePage} of {totalTemplatePages}</span>
                    <button 
                      onClick={() => setTemplatePage(prev => Math.min(totalTemplatePages, prev + 1))}
                      disabled={templatePage === totalTemplatePages}
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex flex-col items-center justify-center">
            <Sparkles className="w-12 h-12 text-zinc-700 mb-3" />
            <h3 className="text-lg font-bold text-zinc-400">No templates found</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-sm">Create a new template for your social media content workflow.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                {editingTemplate ? "Edit Social Template" : "Add Social Template"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Platform *</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Template Name *</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="e.g. Standard Video Description" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="e.g. Best for informational/educational videos" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Template Body *</label>
                  <textarea 
                    rows={6}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono resize-none disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="Write body structure here. Use placeholders inside brackets like [hook], [cta]." 
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Placeholders (Comma separated)</label>
                  <input 
                    type="text" 
                    value={formPlaceholderInput}
                    onChange={(e) => setFormPlaceholderInput(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="e.g. hook, value, cta" 
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Placeholders must match brackets used inside the template body exactly.</p>
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                    className="px-5 py-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors text-xs cursor-pointer shadow-lg shadow-indigo-600/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {editingTemplate ? "Saving Changes..." : "Creating Template..."}
                      </>
                    ) : (
                      editingTemplate ? "Save Changes" : "Create Template"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {templateToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTemplateToDelete(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Social Template
              </h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">"{templateToDelete.name}"</span>? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setTemplateToDelete(null)}
                  disabled={isDeleting}
                  className="px-5 py-2 text-zinc-400 hover:text-white transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors text-xs cursor-pointer shadow-lg shadow-red-600/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
