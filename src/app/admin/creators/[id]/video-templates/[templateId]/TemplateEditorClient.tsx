"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Play, Copy, Upload, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VideoTemplateSchema, VideoTemplateData } from "@/lib/validations/videoTemplate";
import { compileTemplate } from "@/lib/scenework/compiler";

export default function TemplateEditorClient({ 
  creatorId, 
  templateId, 
  initialData 
}: { 
  creatorId: string, 
  templateId: string, 
  initialData: any 
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("form"); // For mobile
  const [sampleStory, setSampleStory] = useState("This is a test story. It shows how the template splits sentences and assigns visual prompts. We need a few more words to test the scene generation logic properly so it creates multiple scenes based on the rules you have defined above.");

  const defaultValues: VideoTemplateData = initialData ? {
    id: initialData.id,
    name: initialData.name || "",
    description: initialData.description || "",
    format: initialData.data?.format || "16:9",
    targetSeconds: initialData.data?.targetSeconds,
    structure: initialData.data?.structure || [
      { id: "beat-1", name: "Hook", purpose: "", mood: "", share: 0.5, media: "video" },
      { id: "beat-2", name: "Body", purpose: "", mood: "", share: 0.5, media: "either" }
    ],
    voice: initialData.data?.voice || {
      persona: "", voiceId: "", language: "en", tone: "neutral", pace: "normal", avoid: []
    },
    image: initialData.data?.image || {
      style: "", model: "dall-e-3", references: [], negative: ""
    },
    video: initialData.data?.video || {
      cameraMoves: [], motion: "moderate", shotVariety: true, clipSeconds: { min: 2, max: 5 }, chainFrames: false, model: "sora"
    },
    rules: initialData.data?.rules || {
      wordsPerScene: 15, minScenes: 4, maxScenes: 8, keepOriginalWording: true
    },
    version: initialData.version || 1
  } : {
    name: "",
    description: "",
    format: "16:9",
    structure: [
      { id: "beat-1", name: "Hook", purpose: "", mood: "", share: 0.5, media: "video" },
      { id: "beat-2", name: "Body", purpose: "", mood: "", share: 0.5, media: "either" }
    ],
    voice: { persona: "", voiceId: "", language: "en", tone: "neutral", pace: "normal", avoid: [] },
    image: { style: "", model: "dall-e-3", references: [], negative: "" },
    video: { cameraMoves: [], motion: "moderate", shotVariety: true, clipSeconds: { min: 2, max: 5 }, chainFrames: false, model: "sora" },
    rules: { wordsPerScene: 15, minScenes: 4, maxScenes: 8, keepOriginalWording: true },
    version: 1
  };

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const { register, control, handleSubmit, watch, getValues, reset, formState: { errors, isDirty } } = useForm<VideoTemplateData>({
    resolver: zodResolver(VideoTemplateSchema),
    defaultValues
  });

  const { fields: structureFields, append: appendBeat, remove: removeBeat } = useFieldArray({
    control,
    name: "structure"
  });

  const formData = watch();

  // Show a warning if shares don't add up to 1
  const totalShare = formData.structure?.reduce((acc, b) => acc + (b.share || 0), 0) || 0;
  const isBalanced = Math.abs(totalShare - 1) < 0.01;

  // Compile the plan for live preview state
  const [compiledPlan, setCompiledPlan] = useState<{sceneCount: number, scenes: any[], aiLog: string[]}>({ sceneCount: 0, scenes: [], aiLog: [] });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleRunPreview = () => {
    setIsPreviewLoading(true);
    // Simulate AI thinking time for effect
    setTimeout(() => {
      try {
        const plan = compileTemplate(formData, sampleStory);
        setCompiledPlan(plan);
      } catch (e) {
        setCompiledPlan({ sceneCount: 0, scenes: [], aiLog: [] });
      } finally {
        setIsPreviewLoading(false);
      }
    }, 600);
  };

  const onSubmit = async (data: VideoTemplateData) => {
    setIsSaving(true);
    try {
      const isNew = templateId === "new";
      const url = isNew ? "/api/video-templates" : `/api/video-templates/${templateId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          data: data,
          userId: creatorId,
          version: data.version
        })
      });

      if (!res.ok) throw new Error("Failed to save");
      const savedData = await res.json();
      
      if (isNew) {
        toast.success("Template created successfully!");
        router.push(`/admin/creators/${creatorId}`);
      } else {
        toast.success("Template saved successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = () => {
    const data = getValues();
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Template JSON copied to clipboard!");
  };

  const handleProcessImportJson = () => {
    try {
      const json = JSON.parse(importJsonText);
      reset(json);
      setShowImportModal(false);
      setImportJsonText("");
      toast.success("Template imported successfully! Please review before saving.");
    } catch (err) {
      toast.error("Invalid JSON format. Please check your text and try again.");
    }
  };

  const handleCopyPrompt = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const generateMasterPrompt = (target: "image" | "video" | "voice", scene: any) => {
    const beat = formData.structure?.find((b: any) => b.name === scene.beatName) || formData.structure?.[0] || { name: 'Hook', mood: '' };
    const segment = scene.storySegment || sampleStory;
    let model = "";
    if (target === "image") model = formData.image?.model || "dall-e-3";
    if (target === "video") model = formData.video?.model || "sora";
    if (target === "voice") model = formData.voice?.voiceId || "TTS";

    let rawPrompt = "";
    if (target === "image") rawPrompt = `Visualize the following scene conceptually: "${segment}". Context: ${beat.name} (Mood: ${beat.mood}).`;
    if (target === "video") rawPrompt = `Cinematic video sequence depicting: "${segment}". Camera: ${formData.video?.cameraMoves?.[0] || 'auto'}. Context: ${beat.name} (Mood: ${beat.mood}).`;
    if (target === "voice") rawPrompt = segment;

    const styleStr = `Style: ${formData.image?.style || 'None'}. ${formData.image?.palette ? `Palette: ${formData.image.palette}.` : ''} Mood: ${beat.mood || 'None'}. Lighting: ${formData.image?.lighting || 'None'}.`;
    
    return `You are a prompt editor for an AI video pipeline. I will give you a raw scene prompt that was extracted from a story. I will paste your rewritten version into another AI to generate the actual image, video clip, or voiceover. Rewrite the prompt so that generator produces the best, most consistent result.

## What I give you
- TARGET: ${target}
- MODEL: ${model}
- RAW PROMPT: ${rawPrompt}
- SCENE SCRIPT: ${segment}
- CONTINUITY: 
  (Persona: ${formData.voice?.persona || 'None'}, Tone: ${scene.voice?.tone || 'neutral'})
- STYLE: ${styleStr}
- PREVIOUS SCENE: A previous scene block before this one.
- LIMITS: ${formData.format || "16:9"}, clip ${scene.clipSeconds || 8} seconds

## Rules for every rewrite
1. Keep the meaning of the raw prompt. Do not add events, people or objects that are not in the story.
2. Describe only what a camera can see or what a listener can hear. Remove thoughts, backstory and abstract ideas, or turn them into something visible (for example "he felt hopeless" becomes "he sits on the edge of the bed, shoulders low, the room dark").
3. Put the subject first, then the action, setting, time of day, lighting, camera, and style, in that order.
4. Repeat each recurring character's description word for word from CONTINUITY, so they look the same in every scene.
5. Use concrete words (colors, materials, distances) instead of vague ones ("beautiful", "epic", "amazing").
6. Do not include text, captions, logos or watermarks in the picture.
7. Make the scene match the script: what appears on screen should fit what is being said at that moment.
8. Make it flow from PREVIOUS SCENE: keep the same lighting and location unless the story changes them.

## Rules by target
**image (dall-e-3)**
- Write 1 to 3 full sentences in natural language, one clear subject, one moment.
- This model has no negative prompt field, so state what you want in positive terms (write "a clear empty street" instead of "no people") and drop the negative list.
- Include the aspect ratio and the shot type (wide, medium, close-up).

**video (sora)**
- Describe one continuous shot only. Do not describe cuts or multiple scenes.
- Include: subject, one main action, setting, lighting, camera move (use only moves allowed by the template), and how much things move.
- Keep the action small enough to happen inside the clip length. If the raw prompt has too much happening, keep the most important beat.
- Start from the previous scene's final frame when chaining is on, and say what changes.

**voice**
- Return only the words to be spoken. No stage directions, no brackets, no speaker labels.
- Use punctuation to control pacing: commas for short pauses, full stops for longer ones, and an ellipsis only for a deliberate trail-off.
- Write numbers and abbreviations out as they should be spoken.
- Keep it within the spoken length that fits the clip (about 2.6 words per second at normal pace, fewer if slow).
- Also return the tone and pace to set in the voice tool.

## Output
Return only valid JSON, with no commentary:
{
  "target": "image | video | voice",
  "prompt": "the rewritten prompt, ready to paste",
  "negative": "only if the model supports it, otherwise an empty string",
  "continuity_used": ["names of the characters or places you included"],
  "estimated_seconds": 0,
  "changes": ["one short line for each important change you made and why"],
  "warnings": ["anything that may not generate well, or that needs my decision"]
}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/admin/creators/${creatorId}`)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-xl font-bold text-white font-bricolage">
            {templateId === "new" ? "New Template" : initialData?.name}
          </h1>
          {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJson}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            title="Export Template as JSON"
          >
            <FileJson className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">JSON Template Copy</span>
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors" title="Import Template JSON"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Import JSON</span>
          </button>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50 ml-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Mobile Tab Toggle */}
        <div className="lg:hidden flex bg-slate-900 rounded-xl p-1 mb-4 border border-slate-800">
          <button onClick={() => setActiveTab("form")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "form" ? "bg-slate-800 text-white" : "text-slate-500"}`}>Form</button>
          <button onClick={() => setActiveTab("preview")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "preview" ? "bg-slate-800 text-white" : "text-slate-500"}`}>Live Preview</button>
        </div>

        {/* Left Column: Form */}
        <div className={`lg:col-span-7 xl:col-span-8 space-y-10 ${activeTab === 'form' ? 'block' : 'hidden lg:block'}`}>
          <form id="template-form" className="space-y-12 pb-32 font-instrument">
            
            {/* Basics Section */}
            <section id="basics" className="space-y-6">
              <h2 className="text-2xl font-bold text-white font-bricolage border-b border-slate-800 pb-2">Basics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Name</label>
                  <input {...register("name")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="e.g. Explainer Video" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Format</label>
                  <select {...register("format")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Description</label>
                  <input {...register("description")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="What is this template for?" />
                </div>
              </div>
            </section>

            {/* Structure Section */}
            <section id="structure" className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-2xl font-bold text-white font-bricolage">Structure</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isBalanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    Total Share: {(totalShare * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {!isBalanced && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-sm flex items-center justify-between">
                  Beat shares add up to {(totalShare * 100).toFixed(0)}%. They need to total 100%.
                </div>
              )}

              <div className="space-y-4">
                {structureFields.map((field, index) => (
                  <div key={field.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Beat Name</label>
                        <input {...register(`structure.${index}.name` as const)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Hook" />
                      </div>
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Purpose</label>
                        <input {...register(`structure.${index}.purpose` as const)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Grab attention" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Media</label>
                        <select {...register(`structure.${index}.media` as const)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                          <option value="video">Video</option>
                          <option value="image">Image</option>
                          <option value="either">Either</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Share %</label>
                        <input type="number" step="0.05" min="0" max="1" {...register(`structure.${index}.share` as const, { valueAsNumber: true })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeBeat(index)} className="absolute -right-3 -top-3 w-6 h-6 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-700">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => appendBeat({ id: `beat-${Date.now()}`, name: "New Beat", purpose: "", mood: "", share: 0.1, media: "either" })} className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl text-slate-400 hover:text-indigo-400 font-medium text-sm transition-colors">
                + Add Beat
              </button>
            </section>

            {/* Voice Section */}
            <section id="voice" className="space-y-6">
              <h2 className="text-2xl font-bold text-white font-bricolage border-b border-slate-800 pb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500" /> Voice
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Persona</label>
                  <input {...register("voice.persona")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors" placeholder="e.g. Tech Expert" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Default Tone</label>
                  <input {...register("voice.tone")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Pace</label>
                  <select {...register("voice.pace")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors">
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Image Section */}
            <section id="image" className="space-y-6">
              <h2 className="text-2xl font-bold text-white font-bricolage border-b border-slate-800 pb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500" /> Image
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Style</label>
                  <input {...register("image.style")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors" placeholder="e.g. Minimalist vector illustration" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Negative Prompt</label>
                  <input {...register("image.negative")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors" placeholder="e.g. blurry, text, cartoon" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Palette</label>
                  <input {...register("image.palette")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors" placeholder="e.g. Pastel blues and pinks" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Lighting</label>
                  <input {...register("image.lighting")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors" placeholder="e.g. Soft cinematic lighting" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Model</label>
                  <input {...register("image.model")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors" placeholder="e.g. dall-e-3" />
                </div>
              </div>
            </section>

            {/* Video Section */}
            <section id="video" className="space-y-6">
              <h2 className="text-2xl font-bold text-white font-bricolage border-b border-slate-800 pb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" /> Video
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Motion Intensity</label>
                  <select {...register("video.motion")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="subtle">Subtle</option>
                    <option value="moderate">Moderate</option>
                    <option value="dynamic">Dynamic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Model</label>
                  <input {...register("video.model")} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="e.g. sora" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="shotVariety" {...register("video.shotVariety")} className="w-5 h-5 bg-slate-900 border-slate-800 rounded text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950" />
                  <label htmlFor="shotVariety" className="text-sm font-medium text-slate-300">Vary shots automatically</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="chainFrames" {...register("video.chainFrames")} className="w-5 h-5 bg-slate-900 border-slate-800 rounded text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950" />
                  <label htmlFor="chainFrames" className="text-sm font-medium text-slate-300">Use previous frame as reference</label>
                </div>
              </div>
            </section>

            {/* Rules Section */}
            <section id="rules" className="space-y-6">
              <h2 className="text-2xl font-bold text-white font-bricolage border-b border-slate-800 pb-2">Rules</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Words per Scene</label>
                  <input type="number" {...register("rules.wordsPerScene", { valueAsNumber: true })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Min Scenes</label>
                  <input type="number" {...register("rules.minScenes", { valueAsNumber: true })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Max Scenes</label>
                  <input type="number" {...register("rules.maxScenes", { valueAsNumber: true })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
            </section>

          </form>
        </div>

        {/* Right Column: Live Preview Panel */}
        <div className={`lg:col-span-5 xl:col-span-4 sticky top-24 ${activeTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white font-bricolage">Live Preview</h3>
              </div>
              <button 
                onClick={handleRunPreview}
                disabled={isPreviewLoading}
                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isPreviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Preview
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sample Story Input</label>
                <textarea 
                  value={sampleStory}
                  onChange={(e) => setSampleStory(e.target.value)}
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Enter a test story..."
                />
              </div>

              {isPreviewLoading ? (
                <div className="border-t border-slate-800 pt-10 pb-10 flex flex-col items-center justify-center text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm font-medium animate-pulse">AI is thinking...</p>
                </div>
              ) : compiledPlan.scenes.length > 0 ? (
                <div className="border-t border-slate-800 pt-6">
                  {compiledPlan.aiLog && compiledPlan.aiLog.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        AI Thinking Log
                      </label>
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 space-y-2">
                        {compiledPlan.aiLog.map((log, i) => (
                          <div key={i} className="text-xs font-mono text-slate-400 flex items-start gap-2">
                            <span className="text-slate-600 select-none">{'>'}</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated output (Scene 1 of {compiledPlan.sceneCount})</label>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">Audio / Voice Prompt</span>
                        <button 
                          onClick={() => handleCopyPrompt(generateMasterPrompt('voice', compiledPlan.scenes[0]), 'Audio Master Prompt')}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Copy Audio Master Prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                        Persona: {compiledPlan.scenes[0].voice.persona || 'None'}
                        <br/>
                        Tone: {compiledPlan.scenes[0].voice.tone || 'neutral'}
                      </p>
                    </div>
                    
                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Image Prompt</span>
                        <button 
                          onClick={() => handleCopyPrompt(generateMasterPrompt('image', compiledPlan.scenes[0]), 'Image Master Prompt')}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Copy Image Master Prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 whitespace-pre-wrap">
                        {`[Format: ${formData.format}] Style: ${formData.image?.style}. ${formData.image?.palette ? `Palette: ${formData.image.palette}. ` : ''}\nSubject/Action: Visualize the following scene conceptually: "${compiledPlan.scenes[0].storySegment || sampleStory}". \nContext: ${compiledPlan.scenes[0].beatName} (Mood: ${formData.structure?.find(b => b.name === compiledPlan.scenes[0].beatName)?.mood || ''}).`}
                      </p>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Video Prompt</span>
                        <button 
                          onClick={() => handleCopyPrompt(generateMasterPrompt('video', compiledPlan.scenes[0]), 'Video Master Prompt')}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Copy Video Master Prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50 whitespace-pre-wrap">
                        {`[Format: ${formData.format}] Motion: ${formData.video?.motion}. Camera: ${formData.video?.cameraMoves?.[0] || 'auto'}. \nSubject/Action: Cinematic video sequence depicting: "${compiledPlan.scenes[0].storySegment || sampleStory}". \nContext: ${compiledPlan.scenes[0].beatName} (Mood: ${formData.structure?.find(b => b.name === compiledPlan.scenes[0].beatName)?.mood || ''}).`}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800/50">
                      <span>Est. Length: ~{compiledPlan.scenes[0].clipSeconds}s</span>
                      <span className="capitalize bg-slate-800 px-2 py-1 rounded text-slate-300">Format: {formData.format}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-800 pt-6 text-sm text-slate-500 text-center py-10">
                  Click the <strong>Run Preview</strong> button above to see how the AI processes your settings and generates scene prompts.
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white font-bricolage">Import Template JSON</h3>
              <p className="text-sm text-slate-400 mt-1">Paste your exported JSON code below to instantly load a template configuration.</p>
            </div>
            <div className="p-6">
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder='{\n  "name": "My Template",\n  ...\n}'
              />
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportJsonText("");
                }}
                className="px-5 py-2 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleProcessImportJson}
                disabled={!importJsonText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
