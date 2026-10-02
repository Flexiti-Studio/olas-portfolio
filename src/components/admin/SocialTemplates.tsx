"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Star,
  Loader2,
  AlertCircle,
  Play,
  Film,
  Mic,
  Image as ImageIcon,
  Scissors,
  FileText
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

  // YouTube-specific state
  const [ytScript, setYtScript] = useState("");
  const [ytSceneBreakdown, setYtSceneBreakdown] = useState("");
  const [ytImagePrompt, setYtImagePrompt] = useState("");
  const [ytVoicePrompt, setYtVoicePrompt] = useState("");
  const [ytVideoPrompt, setYtVideoPrompt] = useState("");

  // YouTube live test state
  const [ytSamplePost, setYtSamplePost] = useState("");
  const [ytIsTestingAll, setYtIsTestingAll] = useState(false);
  const [ytScriptResult, setYtScriptResult] = useState("");
  const [ytSceneResult, setYtSceneResult] = useState("");
  const [ytImageResult, setYtImageResult] = useState("");
  const [ytVoiceResult, setYtVoiceResult] = useState("");
  const [ytVideoResult, setYtVideoResult] = useState("");
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>({});

  // Image Prompt Live Example State
  const [sampleImagePost, setSampleImagePost] = useState("");
  const [imagePromptTestResultOnly, setImagePromptTestResultOnly] = useState("");
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Modals / confirmations
  const [templateToDelete, setTemplateToDelete] = useState<SocialTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

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
    if (template.platform === "youtube") {
      loadYouTubeFields(template.body);
    }
    setTestResult("");
    setImagePromptTestResult("");
  };

  // Helpers to parse/serialize YouTube template body
  const parseYouTubeBody = (bodyStr: string) => {
    try {
      const parsed = JSON.parse(bodyStr);
      if (parsed.__youtubeTemplate) return parsed;
    } catch {}
    return null;
  };

  const serializeYouTubeBody = () => JSON.stringify({
    __youtubeTemplate: true,
    script: ytScript,
    sceneBreakdown: ytSceneBreakdown,
    imagePrompt: ytImagePrompt,
    voicePrompt: ytVoicePrompt,
    videoPrompt: ytVideoPrompt
  });

  const loadYouTubeFields = (bodyStr: string) => {
    const parsed = parseYouTubeBody(bodyStr);
    if (parsed) {
      setYtScript(parsed.script || "");
      setYtSceneBreakdown(parsed.sceneBreakdown || "");
      setYtImagePrompt(parsed.imagePrompt || "");
      setYtVoicePrompt(parsed.voicePrompt || "");
      setYtVideoPrompt(parsed.videoPrompt || "");
    } else {
      // Legacy body â€” put it in script field
      setYtScript(bodyStr || "");
      setYtSceneBreakdown("");
      setYtImagePrompt("");
      setYtVoicePrompt("");
      setYtVideoPrompt("");
    }
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

  const handleDuplicate = async (template: SocialTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDuplicatingId(template.id);
    const toastId = toast.loading("Duplicating template...");
    try {
      const payload = {
        platform: template.platform,
        name: `${template.name} (Copy)`,
        description: template.description || "",
        body: template.body,
        imagePromptTemplate: template.imagePromptTemplate || "",
        placeholders: template.placeholders
      };

      const res = await fetch("/api/social-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(prev => [data.template, ...prev]);
        toast.success("Template duplicated successfully", { id: toastId });
      } else {
        toast.error("Failed to duplicate", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error duplicating template", { id: toastId });
    } finally {
      setIsDuplicatingId(null);
    }
  };

  const handleSave = async () => {
    if (!formName || !formPlatform) return;
    setIsSaving(true);

    let bodyToSave = formBody;
    if (formPlatform === "youtube") {
      bodyToSave = serializeYouTubeBody();
    }

    // Extract placeholders (e.g. {{hook}})
    const placeholderMatches = bodyToSave.match(/\{\{([^}]+)\}\}/g) || [];
    const placeholders = placeholderMatches.map(p => p.replace(/[{}]/g, ''));

    const payload = {
      platform: formPlatform,
      name: formName,
      description: formDesc,
      body: bodyToSave,
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
    if (template.is_primary || settingPrimaryId) return;
    setSettingPrimaryId(template.id);
    const toastId = toast.loading("Setting default template...");
    try {
      const res = await fetch(`/api/social-templates/${template.id}`, { method: "PATCH" });
      if (res.ok) {
        setTemplates(prev => prev.map(t => 
          t.platform === template.platform 
            ? { ...t, is_primary: t.id === template.id } 
            : t
        ));
        toast.success("Default template set successfully", { id: toastId });
      } else {
        toast.error("Failed to set default template", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error setting default template", { id: toastId });
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleCopySection = (content: string, template: string, key: string) => {
    const textToCopy = content.trim() ? content : template;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSections(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopiedSections(prev => ({ ...prev, [key]: false })), 2000);
  };

  const handleTestYouTube = async () => {
    if (!ytSamplePost.trim()) return;
    setYtIsTestingAll(true);
    setYtScriptResult(""); setYtSceneResult(""); setYtImageResult(""); setYtVoiceResult(""); setYtVideoResult("");
    try {
      const body = serializeYouTubeBody();
      const res = await fetch("/api/social-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "youtube",
          name: formName,
          description: formDesc,
          body: ytScript,
          samplePost: ytSamplePost,
          imagePromptTemplate: ytImagePrompt,
          voicePromptTemplate: ytVoicePrompt,
          videoPromptTemplate: ytVideoPrompt
        })
      });
      const data = await res.json();
      if (data.rewritten) setYtScriptResult(data.rewritten);
      if (data.imagePrompt) setYtImageResult(data.imagePrompt);
      if (data.voicePrompt) setYtVoiceResult(data.voicePrompt);
      if (data.videoPrompt) setYtVideoResult(data.videoPrompt);
    } catch (err) {
      console.error("YouTube test failed:", err);
    } finally {
      setYtIsTestingAll(false);
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
                          {settingPrimaryId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button 
                          onClick={(e) => handleDuplicate(t, e)}
                          title="Duplicate"
                          className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-900 rounded-md border border-slate-700"
                        >
                          {isDuplicatingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
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

              {/* YouTube-specific editor OR standard editor */}
              {formPlatform === "youtube" ? (
                <div className="grid grid-cols-1 gap-5 relative z-10">
                  {/* Row 1: Name + Desc */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-1.5">Template Name</label>
                      <input 
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. YouTube Long-Form Story Script"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-1.5">Description & AI Rules</label>
                      <input
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="e.g. Educational tone, no filler words..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const promptText = `You are a senior video-systems prompt engineer. Your job is to reverse-engineer a reference video's style and output a complete set of 5 reusable prompt templates that let an AI reproduce that style on any new topic.

INPUTS
- Reference video URL: {{reference_url}}
- Reference transcript: {{transcript}}
- Visual notes (what the footage/graphics/colors/text cards look like): {{visual_notes}}
- Voice & audio notes (voice type, pace, music, sound design): {{voice_notes}}
- Niche / audience: {{niche}}
- Things to change vs the reference (optional): {{overrides}}

STEP 1 - STYLE DNA (internal analysis, also returned in output)
Extract and summarise:
1. Hook mechanic (how the first 5 seconds work)
2. Narrative arc (acts/sections and what each does)
3. Tone & vocabulary (including banned words)
4. Sentence rhythm and average scene length
5. Visual language (palette with hex codes, lighting, composition, typography, recurring visual types)
6. Voice profile and pause behaviour
7. Motion language (camera moves, subject motion, forbidden motion)
8. Consistency elements (color temperature, grain, contrast, fps)
Mark anything you inferred rather than observed with "(inferred)".

STEP 2 - BUILD THE 5 TEMPLATES
Create exactly these five, in this order, each with: name, description_rules, template.

1. script_template - full video script prompt (tone, structure, rhythm, banned words, output format)
2. scene_breakdown - splits the script into timed scenes, returns strict JSON
3. image_prompt - one image prompt per scene (style lock + creative freedom + per-visual-type rules + negative prompt)
4. voice_prompt - TTS-ready narration per scene (voice profile, pause rules, JSON output)
5. video_prompt - one video-generation prompt per scene (motion rules + consistency lock)

TEMPLATE RULES
- Name format: "<Style Name> (<CODE>-0N)", e.g. "Cinematic Documentary Script (CDSA-01)".
- description_rules: 2-3 sentences max, plain text. What the template does and its key constraints.
- Each template must contain: role line, inputs block, LOCKED rules (never change), CREATIVE FREEDOM (what the AI may vary per scene or topic), and OUTPUT FORMAT.
- Lock the style (palette, lighting, tone, motion) but never lock subjects or metaphors. Every new scene must be creative, not a copy of the reference.
- Be specific and measurable: hex colors, seconds, word counts, camera speeds. Avoid vague words like "nice", "engaging", "professional".
- Include negative rules (what to avoid) in every template.

PLACEHOLDER CONTRACT (use these exact names, do not invent new ones)
- Script: {{topic}}, {{duration_minutes}}, {{audience}}
- Scene breakdown: {{script}}
- Image: {{voiceover}}, {{visual_type}}, {{visual_intent}}, {{key_text}}
- Voice: {{voiceover}}, {{scene_number}}, {{total_scenes}}, {{act}}
- Video: {{voiceover}}, {{visual_type}}, {{image_prompt}}, {{duration_seconds}}
- Scene breakdown JSON must contain: scene_number, act, voiceover, duration_seconds, visual_type, visual_intent, transition.

STEP 3 - SELF-CHECK before answering
- Do all five templates use only the allowed placeholders?
- Is the style lock identical in image, video and voice templates (no contradictions)?
- Does scene_breakdown enforce the max scene duration and the visual types used by the image template?
- Would two different topics produce visibly different imagery while still looking like the same channel?
Fix anything that fails.

OUTPUT: valid JSON only, no markdown fences, no commentary.
{
  "style_dna": { "hook": "", "arc": "", "tone": "", "rhythm": "", "visual": "", "voice": "", "motion": "", "consistency": "" },
  "templates": {
    "script_template":  { "name": "", "description_rules": "", "template": "" },
    "scene_breakdown":  { "name": "", "description_rules": "", "template": "" },
    "image_prompt":     { "name": "", "description_rules": "", "template": "" },
    "voice_prompt":     { "name": "", "description_rules": "", "template": "" },
    "video_prompt":     { "name": "", "description_rules": "", "template": "" }
  }
}`;
                        navigator.clipboard.writeText(promptText);
                        toast.success("AI Prompt Generator copied to clipboard!");
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy System Prompt Generator
                    </button>
                  </div>

                  {/* Section 1: Script */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-red-400" />
                      <label className="text-sm font-bold text-white">1. Script Template</label>
                      <span className="text-[10px] text-slate-500">The full video script prompt / structure</span>
                      <button onClick={() => handleCopySection(ytScriptResult, ytScript, 'yt-script')} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors" title={ytScriptResult ? 'Copy test result' : 'Copy template'}>
                        {copiedSections['yt-script'] ? <Check className="w-3 h-3 text-red-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSections['yt-script'] ? 'Copied!' : ytScriptResult ? 'Copy Result' : 'Copy Template'}
                      </button>
                    </div>
                    <textarea
                      value={ytScript}
                      onChange={(e) => setYtScript(e.target.value)}
                      rows={5}
                      placeholder={`e.g. Full video script prompt (tone, structure, rhythm, banned words, output format)\n\nLOCKED RULES: ...\nCREATIVE FREEDOM: ...\nOUTPUT FORMAT: ...`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Section 2: Scene Breakdown */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Scissors className="w-4 h-4 text-orange-400" />
                      <label className="text-sm font-bold text-white">2. Scene Breakdown Prompt</label>
                      <span className="text-[10px] text-slate-500">How AI should split the script into scenes</span>
                      <button onClick={() => handleCopySection(ytSceneResult, ytSceneBreakdown, 'yt-scene')} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-orange-400 transition-colors" title={ytSceneResult ? 'Copy test result' : 'Copy template'}>
                        {copiedSections['yt-scene'] ? <Check className="w-3 h-3 text-orange-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSections['yt-scene'] ? 'Copied!' : ytSceneResult ? 'Copy Result' : 'Copy Template'}
                      </button>
                    </div>
                    <textarea
                      value={ytSceneBreakdown}
                      onChange={(e) => setYtSceneBreakdown(e.target.value)}
                      rows={4}
                      placeholder={`e.g. Splits the script into timed scenes, returns strict JSON\n\nJSON must contain: scene_number, act, voiceover, duration_seconds, visual_type, visual_intent, transition.`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Section 3: Image Prompt per Scene */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <label className="text-sm font-bold text-white">3. Image Prompt per Scene</label>
                      <span className="text-[10px] text-slate-500">How AI should generate a visual for each scene</span>
                      <button onClick={() => handleCopySection(ytImageResult, ytImagePrompt, 'yt-image')} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400 transition-colors" title={ytImageResult ? 'Copy test result' : 'Copy template'}>
                        {copiedSections['yt-image'] ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSections['yt-image'] ? 'Copied!' : ytImageResult ? 'Copy Result' : 'Copy Template'}
                      </button>
                    </div>
                    <textarea
                      value={ytImagePrompt}
                      onChange={(e) => setYtImagePrompt(e.target.value)}
                      rows={4}
                      placeholder={`e.g. One image prompt per scene (style lock + creative freedom + per-visual-type rules + negative prompt)\n\nInclude negative rules (what to avoid).`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Section 4: Voice Prompt per Scene */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <label className="text-sm font-bold text-white">4. Voice Prompt per Scene</label>
                      <span className="text-[10px] text-slate-500">TTS / AI voice generation instructions per scene</span>
                      <button onClick={() => handleCopySection(ytVoiceResult, ytVoicePrompt, 'yt-voice')} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors" title={ytVoiceResult ? 'Copy test result' : 'Copy template'}>
                        {copiedSections['yt-voice'] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSections['yt-voice'] ? 'Copied!' : ytVoiceResult ? 'Copy Result' : 'Copy Template'}
                      </button>
                    </div>
                    <textarea
                      value={ytVoicePrompt}
                      onChange={(e) => setYtVoicePrompt(e.target.value)}
                      rows={4}
                      placeholder={`e.g. TTS-ready narration per scene (voice profile, pause rules, JSON output)\n\nLock the style (tone) but be creative per scene.`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Section 5: Video Prompt per Scene */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Film className="w-4 h-4 text-purple-400" />
                      <label className="text-sm font-bold text-white">5. Video Prompt per Scene</label>
                      <span className="text-[10px] text-slate-500">AI video generation instructions per scene</span>
                      <button onClick={() => handleCopySection(ytVideoResult, ytVideoPrompt, 'yt-video')} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-purple-400 transition-colors" title={ytVideoResult ? 'Copy test result' : 'Copy template'}>
                        {copiedSections['yt-video'] ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSections['yt-video'] ? 'Copied!' : ytVideoResult ? 'Copy Result' : 'Copy Template'}
                      </button>
                    </div>
                    <textarea
                      value={ytVideoPrompt}
                      onChange={(e) => setYtVideoPrompt(e.target.value)}
                      rows={4}
                      placeholder={`e.g. One video-generation prompt per scene (motion rules + consistency lock)\n\nBe specific and measurable: camera speeds, motion language.`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
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
                      <label className="block text-sm font-semibold text-slate-400 mb-1.5">Description &amp; AI Rules</label>
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
              )}
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

            {/* YouTube All-In-One Live Test Panel */}
            {formPlatform === "youtube" && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex-1 flex flex-col mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-red-400 fill-red-400/20" />
                  <h3 className="text-lg font-bold text-white">YouTube Live Test</h3>
                  <span className="text-xs text-slate-500 ml-2">Tests all 5 YouTube prompt sections at once</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sample Video Topic / Script</label>
                    <textarea
                      value={ytSamplePost}
                      onChange={(e) => setYtSamplePost(e.target.value)}
                      placeholder="Paste a raw topic, idea, or script here to test how all 5 YouTube prompts apply..."
                      className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-red-500 resize-none mb-4 min-h-[120px]"
                    />
                    <button
                      onClick={handleTestYouTube}
                      disabled={ytIsTestingAll || !ytSamplePost.trim()}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {ytIsTestingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      {ytIsTestingAll ? "Testing all prompts..." : "Test All YouTube Prompts"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
                    {/* Script Result */}
                    <div className="bg-black border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-red-400" /><span className="text-[10px] text-slate-500 font-bold uppercase">Script Output</span></div>
                        <button onClick={() => handleCopySection(ytScriptResult, ytScript, 'yt-script-result')} className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                          {copiedSections['yt-script-result'] ? <><Check className="w-3 h-3 text-red-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap">{ytScriptResult || <span className="text-slate-600 italic">Script output will appear here...</span>}</div>
                    </div>
                    {/* Image Result */}
                    <div className="bg-black border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3 text-blue-400" /><span className="text-[10px] text-slate-500 font-bold uppercase">Image Prompt Output</span></div>
                        <button onClick={() => handleCopySection(ytImageResult, ytImagePrompt, 'yt-image-result')} className="text-[10px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors">
                          {copiedSections['yt-image-result'] ? <><Check className="w-3 h-3 text-blue-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap">{ytImageResult || <span className="text-slate-600 italic">Image prompt output will appear here...</span>}</div>
                    </div>
                    {/* Voice Result */}
                    <div className="bg-black border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5"><Mic className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-slate-500 font-bold uppercase">Voice Prompt Output</span></div>
                        <button onClick={() => handleCopySection(ytVoiceResult, ytVoicePrompt, 'yt-voice-result')} className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                          {copiedSections['yt-voice-result'] ? <><Check className="w-3 h-3 text-emerald-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap">{ytVoiceResult || <span className="text-slate-600 italic">Voice prompt output will appear here...</span>}</div>
                    </div>
                    {/* Video Result */}
                    <div className="bg-black border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5"><Film className="w-3 h-3 text-purple-400" /><span className="text-[10px] text-slate-500 font-bold uppercase">Video Prompt Output</span></div>
                        <button onClick={() => handleCopySection(ytVideoResult, ytVideoPrompt, 'yt-video-result')} className="text-[10px] text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors">
                          {copiedSections['yt-video-result'] ? <><Check className="w-3 h-3 text-purple-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 whitespace-pre-wrap">{ytVideoResult || <span className="text-slate-600 italic">Video prompt output will appear here...</span>}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
