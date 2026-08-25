"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSaveContent: (newContentItem: any) => Promise<void>;
}

export default function CreateContentModal({
  isOpen,
  onClose,
  projectId,
  onSaveContent
}: CreateContentModalProps) {
  const router = useRouter();

  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentType, setNewContentType] = useState("Video");
  const [newContentMediaType, setNewContentMediaType] = useState("Video");
  const [newContentStatus, setNewContentStatus] = useState("Draft");
  const [newContentDetails, setNewContentDetails] = useState("");
  
  const [isGeneratingAIContent, setIsGeneratingAIContent] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [useAIForNewContent, setUseAIForNewContent] = useState(true);
  const [outlineStatus, setOutlineStatus] = useState<"pending" | "generating" | "completed">("pending");
  const [outlineStepLabel, setOutlineStepLabel] = useState("Analyzing your request...");
  const [socialsList, setSocialsList] = useState<{ id: string; name: string; status: "pending" | "generating" | "completed" }[]>([]);

  const allSocialOptions = [
    { id: "ig", name: "Instagram Reel" },
    { id: "ig_image", name: "Instagram Image Post" },
    { id: "tk", name: "TikTok Hook" },
    { id: "yt", name: "YouTube Shorts" },
    { id: "yt_video", name: "YouTube Main Video" },
    { id: "x", name: "Twitter/X Thread" },
    { id: "in", name: "LinkedIn Post" },
  ];
  
  const [contentScope, setContentScope] = useState<"Comprehensive" | "Basic">("Comprehensive");
  const [selectedSocials, setSelectedSocials] = useState<string[]>(allSocialOptions.map(s => s.id));

  const handleContentScopeChange = (type: "Comprehensive" | "Basic") => {
    setContentScope(type);
    if (type === "Basic") {
      setSelectedSocials(prev => prev.length > 0 ? [prev[0]] : ["ig"]);
    } else {
      setSelectedSocials(allSocialOptions.map(s => s.id));
    }
  };

  const handleToggleSocial = (id: string) => {
    if (contentScope === "Basic") {
      setSelectedSocials([id]);
    } else {
      setSelectedSocials(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }
  };

  const closeAddContentModal = () => {
    setNewContentTitle("");
    setNewContentType("Video");
    setNewContentMediaType("Video");
    setNewContentStatus("Draft");
    setNewContentDetails("");
    setUseAIForNewContent(true);
    setOutlineStatus("pending");
    setOutlineStepLabel("Analyzing your request...");
    onClose();
  };

  const triggerContentGeneration = async () => {
    if (!newContentTitle) return;

    if (!useAIForNewContent) {
      setIsSavingContent(true);
      const newContentId = Date.now();

      const newContentItem = {
        id: newContentId,
        title: newContentTitle,
        type: newContentType,
        status: newContentStatus,
        views: "-",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        video: "",
        videos: [],
        details: newContentDetails,
        text: "",
        shorts: "",
        checklist: [],
        research: { points: [], notes: "" },
        socials: {},
        aiSettings: {
          used: false,
          scope: contentScope,
          mediaType: newContentMediaType,
          platforms: []
        }
      };

      await onSaveContent(newContentItem);
      
      closeAddContentModal();
      setIsSavingContent(false);
      toast.success("Content created successfully!");
      router.push(`/admin/creators/${projectId}/contents/${newContentId}`);
      return;
    }

    setIsGeneratingAIContent(true);
    setOutlineStatus("generating");
    setOutlineStepLabel("Analyzing content idea...");
    
    const selectedSocialObjects = allSocialOptions
      .filter(soc => selectedSocials.includes(soc.id))
      .map(soc => ({ id: soc.id, name: soc.name, status: "pending" as const }));
      
    setSocialsList(selectedSocialObjects);

    try {
      // 1. Call Step 1 API (Outline generation)
      const outlineRes = await fetch("/api/creators/generate-content/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newContentTitle,
          format: newContentType,
          details: newContentDetails,
        }),
      });

      if (!outlineRes.ok) throw new Error("Outline generation failed");

      const outlineData = await outlineRes.json();
      if (!outlineData.success) throw new Error(outlineData.error || "Outline generation failed");

      setOutlineStepLabel("Formatting checklist and script content...");

      const generatedContent = outlineData.result;
      const newContentId = Date.now();

      const newContentItem = {
        id: newContentId,
        title: generatedContent.title || newContentTitle,
        type: newContentType,
        status: newContentStatus,
        views: "-",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        video: "",
        videos: [],
        details: generatedContent.details || newContentDetails,
        text: generatedContent.script || "",
        shorts: "",
        checklist: (generatedContent.checklist || []).map((text: string, idx: number) => ({
          id: idx + 1,
          text,
          checked: false
        })),
        research: {
          points: generatedContent.research?.points || [],
          notes: generatedContent.research?.notes || ""
        },
        socials: {},
        aiSettings: {
          used: true,
          scope: contentScope,
          mediaType: newContentMediaType,
          platforms: selectedSocials
        }
      };

      await onSaveContent(newContentItem);

      setOutlineStatus("completed");

      // 2. Loop through platforms sequentially to generate social content
      const platforms = ["ig", "ig_image", "tk", "yt", "yt_video", "x", "in"];
      for (let i = 0; i < platforms.length; i++) {
        const currentPlatformId = platforms[i];
        
        // Mark as generating
        setSocialsList(prev => prev.map(s => s.id === currentPlatformId ? { ...s, status: "generating" } : s));

        const socialGenRes = await fetch("/api/creators/generate-content/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            contentId: newContentId,
            platform: currentPlatformId
          })
        });

        if (!socialGenRes.ok) {
          console.error(`Failed to generate social content for ${currentPlatformId}`);
        }

        // Mark as completed
        setSocialsList(prev => prev.map(s => s.id === currentPlatformId ? { ...s, status: "completed" } : s));
      }

      // 3. Complete and redirect
      setIsGeneratingAIContent(false);
      closeAddContentModal();
      router.push(`/admin/creators/${projectId}/contents/${newContentId}`);

    } catch (err: any) {
      console.error(err);
      alert(`Content generation failed: ${err.message || "Unknown error"}`);
      setIsGeneratingAIContent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Add New Content
            </h2>
            <button onClick={closeAddContentModal} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Content Title *</label>
                <input 
                  type="text" 
                  value={newContentTitle}
                  onChange={(e) => setNewContentTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
                  placeholder="e.g. My 5 AM Morning Routine" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Scope</label>
                <select 
                  value={contentScope}
                  onChange={(e) => handleContentScopeChange(e.target.value as "Comprehensive" | "Basic")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Comprehensive">Comprehensive</option>
                  <option value="Basic">Basic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Content Idea / Details</label>
                <textarea 
                  value={newContentDetails}
                  onChange={(e) => setNewContentDetails(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none text-slate-200" 
                  placeholder="Concept overview, hooks, target audience..." 
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div 
                  className={`relative w-10 h-5 rounded-full transition-colors ${useAIForNewContent ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  onClick={() => setUseAIForNewContent(!useAIForNewContent)}
                >
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${useAIForNewContent ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-slate-300 select-none flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Use AI Generation
                </span>
              </label>
              
              <div className="flex gap-3">
                <button 
                  onClick={closeAddContentModal}
                  className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={triggerContentGeneration}
                  disabled={!newContentTitle || isSavingContent || (useAIForNewContent && selectedSocials.length === 0)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingContent ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {useAIForNewContent ? "Generate Outline & Content" : "Create Content"}
                </button>
              </div>
            </div>

            {useAIForNewContent && contentScope === "Comprehensive" && (
              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Select Platforms to Generate Content For:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allSocialOptions.map(soc => (
                      <button
                        key={soc.id}
                        onClick={() => handleToggleSocial(soc.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          selectedSocials.includes(soc.id)
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        {soc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {contentScope === "Basic" && (
              <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Media Focus
                  </label>
                  <select 
                    value={newContentMediaType}
                    onChange={(e) => setNewContentMediaType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Video">Video Only</option>
                    <option value="Image">Image Only</option>
                    <option value="Combine">Combine (Video + Image)</option>
                  </select>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* AI Generation Overlay Layer */}
      {isGeneratingAIContent && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-ping" />
                <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Generating Content Strategy</h2>
              <p className="text-slate-400 text-sm">Our AI is analyzing your ideas and formulating a complete package...</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 shrink-0">
                  {outlineStatus === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : outlineStatus === "generating" ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Core Content Outline</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {outlineStatus === "generating" ? outlineStepLabel : 
                     outlineStatus === "completed" ? "Outline generated." : "Waiting..."}
                  </p>
                </div>
              </div>

              {socialsList.map(social => (
                <div key={social.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 shrink-0">
                    {social.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : social.status === "generating" ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">{social.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {social.status === "completed" ? "Content generated successfully." : 
                       social.status === "generating" ? "Generating platform-specific content..." : 
                       "Queued for generation..."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
