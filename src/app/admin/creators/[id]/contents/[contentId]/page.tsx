"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, CheckCircle, Clock, MessageSquare, Download, Share2, MoreVertical, ThumbsUp, ThumbsDown, Frame, Upload, Search, Plus, FileText, FileJson, X, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, Video, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContentDetailsPage() {
  const params = useParams();
  const id = params.id;
  const contentId = params.contentId;
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Global Tabs
  const [globalTab, setGlobalTab] = useState("home");
  // Inner Tabs for Video Layout
  const [innerTab, setInnerTab] = useState("overview");
  // Socials View Mode
  const [socialsView, setSocialsView] = useState("grid");
  // Points Modal State
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsUploadType, setPointsUploadType] = useState<'options' | 'single' | 'bulk'>('options');
  const [bulkPointsTab, setBulkPointsTab] = useState<'template' | 'upload' | 'preview'>('upload');
  // Content Checklist State
  const [contentNotes, setContentNotes] = useState([
    { id: 1, text: "Finalize sponsor segment read", checked: true },
    { id: 2, text: "Ensure >60% retention past 3-min mark", checked: false },
    { id: 3, text: "Color grade the VR background contrast", checked: false },
    { id: 4, text: "Upload thumbnail A/B test variations", checked: false },
  ]);
  const [newNote, setNewNote] = useState("");

  // Research & Notes State (CRUD)
  const [researchPoints, setResearchPoints] = useState<any[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [postBrief, setPostBrief] = useState({ topic: "", audience: "", coreMessage: "" });
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(false);

  // Research Item Modal State (CRUD)
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [editingPointId, setEditingPointId] = useState<number | null>(null);
  const [pointTitle, setPointTitle] = useState("");
  const [pointCategory, setPointCategory] = useState("Competitor Study");
  const [pointUrl, setPointUrl] = useState("");
  const [pointNote, setPointNote] = useState("");
  // Data-Driven Video Versions State
  const [videoVersions, setVideoVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<any>(null);
  const [isAddingVideoVersion, setIsAddingVideoVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionUrl, setNewVersionUrl] = useState("");
  const [isUploadingVideoFile, setIsUploadingVideoFile] = useState(false);

  // Data-Driven Script State
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [scriptContent, setScriptContent] = useState("");

  // Performance Analytics State
  const [performance, setPerformance] = useState<any>(null);
  const [rawPerformanceInput, setRawPerformanceInput] = useState("");
  const [isAnalyzingPerformance, setIsAnalyzingPerformance] = useState(false);

  // Sync Status State
  const [isGeneratingSocials, setIsGeneratingSocials] = useState(false);
  const [socialsList, setSocialsList] = useState([
    { id: "ig", name: "Instagram Reel", status: "pending" },
    { id: "ig_image", name: "Instagram Image Post", status: "pending" },
    { id: "tk", name: "TikTok Hook", status: "pending" },
    { id: "yt", name: "YouTube Shorts", status: "pending" },
    { id: "yt_video", name: "YouTube Main Video", status: "pending" },
    { id: "x", name: "Twitter/X Thread", status: "pending" },
    { id: "in", name: "LinkedIn Post", status: "pending" },
  ]);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/creators/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const contentItem = project?.contents?.find((c: any) => String(c.id) === String(contentId)) || {
    title: "I Survived 50 Hours in the Metaverse",
    status: "In Review",
    type: "Video",
    details: "This is the main pillar content for the VR Headset campaign. Focused on high-retention editing style, fast-paced intro, and a detailed sponsor segment at the 4:00 minute mark.",
    text: "Hook (0:00 - 0:15)\n\"I spent 50 hours straight in the metaverse, and it completely broke my brain. By the end of it, I couldn't tell what was real anymore.\"\n\nIntro (0:15 - 1:00)\n\"Virtual reality has gotten scary good lately, so I decided to push it to the absolute limit. Here are the rules: no taking off the headset except for sleeping, all meals must be eaten while in VR, and all social interaction happens digitally.\"\n\nAct 1: The Setup (1:00 - 4:30)\n[B-roll of rigging the headset battery packs] \"To make this work, I had to hot-swap batteries every 3 hours...\"",
    checklist: [
      { id: 1, text: "Finalize sponsor segment read", checked: true },
      { id: 2, text: "Ensure >60% retention past 3-min mark", checked: false },
      { id: 3, text: "Color grade the VR background contrast", checked: false },
      { id: 4, text: "Upload thumbnail A/B test variations", checked: false },
    ],
    research: {
      points: [
        { id: 1, title: "MrBeast - 50 Hours in Antarctica", category: "Competitor Study", note: "Study the pacing from 2:00 to 4:30. Fast cuts, high energy music, and constant stakes reminder. We need to mimic this tension when the headset battery runs low." },
        { id: 2, title: "MKBHD - Apple Vision Pro Review", category: "Visual Inspiration", note: "Great b-roll examples for the headset close-ups. Clean, studio lighting with a dark background. Make sure to get macro shots of the lenses." }
      ],
      notes: "Our demographic highly indexes on tech-enthusiast metrics and problem-solving content.\n\n- Retention usually drops at the 3-minute mark unless there is a visual pattern break (introduce the physical toll of VR).\n- Ensure we visually highlight the battery pack logic. Users are highly skeptical of VR battery life and will point out inconsistencies in the comments.\n- Sponsor segment must feel organic. Do not use corporate speak; tie the sponsor directly into the VR survival theme."
    }
  };

  useEffect(() => {
    if (project) {
      const activeContent = project.contents?.find((c: any) => String(c.id) === String(contentId));
      if (activeContent) {
        if (activeContent.checklist) {
          setContentNotes(activeContent.checklist);
        } else {
          setContentNotes([]);
        }

        // Script initialization
        setScriptContent(activeContent.text || contentItem.text || "");

        // Video versions initialization
        let versions = Array.isArray(activeContent.videos) ? activeContent.videos : [];
        if (versions.length === 0 && (activeContent.video || contentItem.video)) {
          const defaultUrl = activeContent.video || contentItem.video || "";
          if (defaultUrl) {
            versions = [{ id: 1, name: "Version 1.0 (Main Cut)", url: defaultUrl, date: "Original Upload" }];
          }
        }
        setVideoVersions(versions);
        if (versions.length > 0) {
          setSelectedVersionId(versions[0].id);
        }

        const resObj = activeContent.research || {};
        const points = (Array.isArray(resObj.points) && resObj.points.length > 0)
          ? resObj.points.map((p: any, idx: number) => ({
              id: p.id || Date.now() + idx,
              title: p.title || "Research Point",
              category: p.category || "Competitor Study",
              url: p.url || "",
              note: p.note || ""
            }))
          : contentItem.research.points;

        setResearchPoints(points);
        setGeneralNotes(resObj.notes || contentItem.research.notes || "");
        setPostBrief({
          topic: resObj.brief?.topic || activeContent.title || contentItem.title || "",
          audience: resObj.brief?.audience || "Tech Enthusiasts & Creators",
          coreMessage: resObj.brief?.coreMessage || activeContent.details || contentItem.details || ""
        });
        setPerformance(activeContent.performance || contentItem.performance || null);
      } else {
        // Fallback for default demo item
        setScriptContent(contentItem.text || "");
        const fallbackVersions = contentItem.video ? [{ id: 1, name: "Version 1.0 (Main Cut)", url: contentItem.video, date: "Original Upload" }] : [];
        setVideoVersions(fallbackVersions);
        if (fallbackVersions.length > 0) setSelectedVersionId(fallbackVersions[0].id);
        setResearchPoints(contentItem.research?.points || []);
        setGeneralNotes(contentItem.research?.notes || "");
        setPostBrief({
          topic: contentItem.title || "",
          audience: "Tech Enthusiasts & Creators",
          coreMessage: contentItem.details || ""
        });
        setPerformance(contentItem.performance || null);
      }
    }
  }, [project, contentId]);

  // Performance Analysis Helper
  const handleAnalyzePerformance = async () => {
    if (!rawPerformanceInput.trim()) return;
    setIsAnalyzingPerformance(true);
    try {
      const res = await fetch("/api/creators/analyze-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawData: rawPerformanceInput })
      });
      if (res.ok) {
        const data = await res.json();
        const updatedPerformance = data.result;
        setPerformance(updatedPerformance);
        setRawPerformanceInput("");

        if (project) {
          const updatedContents = project.contents.map((c: any) => 
            String(c.id) === String(contentId) ? { ...c, performance: updatedPerformance } : c
          );
          setProject({ ...project, contents: updatedContents });

          await fetch(`/api/creators/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...project, contents: updatedContents })
          });
        }
      } else {
        alert("Failed to analyze performance data");
      }
    } catch (err) {
      console.error("Performance analysis error:", err);
    } finally {
      setIsAnalyzingPerformance(false);
    }
  };

  // Sync Helper
  const handleSyncToSocials = async () => {
    setIsGeneratingSocials(true);
    setSocialsList([
      { id: "ig", name: "Instagram Reel", status: "pending" },
      { id: "ig_image", name: "Instagram Image Post", status: "pending" },
      { id: "tk", name: "TikTok Hook", status: "pending" },
      { id: "yt", name: "YouTube Shorts", status: "pending" },
      { id: "yt_video", name: "YouTube Main Video", status: "pending" },
      { id: "x", name: "Twitter/X Thread", status: "pending" },
      { id: "in", name: "LinkedIn Post", status: "pending" },
    ]);

    const platforms = ["ig", "ig_image", "tk", "yt", "yt_video", "x", "in"];
    for (let i = 0; i < platforms.length; i++) {
      const currentPlatformId = platforms[i];
      
      setSocialsList(prev => prev.map(s => s.id === currentPlatformId ? { ...s, status: "generating" } : s));

      const socialGenRes = await fetch("/api/creators/generate-content/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          contentId: contentId,
          platform: currentPlatformId
        })
      });

      if (!socialGenRes.ok) {
        console.error(`Failed to generate social content for ${currentPlatformId}`);
      }

      setSocialsList(prev => prev.map(s => s.id === currentPlatformId ? { ...s, status: "completed" } : s));
    }

    setTimeout(() => {
      setIsGeneratingSocials(false);
      fetchProject();
    }, 1500);
  };

  // Save Script Helper
  const handleSaveScriptContent = async () => {
    setIsEditingScript(false);
    if (project) {
      const updatedContents = project.contents.map((c: any) =>
        String(c.id) === String(contentId) ? { ...c, text: scriptContent } : c
      );
      setProject({ ...project, contents: updatedContents });

      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to save script:", err);
      }
    }
  };

  // Add Video Version Helper
  const handleSaveVideoVersion = async () => {
    if (!newVersionUrl.trim()) return;
    const name = newVersionName.trim() || `Version ${(videoVersions.length + 1).toFixed(1)}`;
    const newVersion = {
      id: Date.now(),
      name: name,
      url: newVersionUrl.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedVersions = [newVersion, ...videoVersions];
    setVideoVersions(updatedVersions);
    setSelectedVersionId(newVersion.id);

    setNewVersionName("");
    setNewVersionUrl("");
    setIsAddingVideoVersion(false);

    if (project) {
      const updatedContents = project.contents.map((c: any) =>
        String(c.id) === String(contentId) 
          ? { ...c, video: newVersionUrl.trim(), videos: updatedVersions } 
          : c
      );
      setProject({ ...project, contents: updatedContents });

      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to save video version:", err);
      }
    }
  };

  // R2 File Upload for Video Version
  const handleR2FileUpload = async (file: File) => {
    setIsUploadingVideoFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setNewVersionUrl(data.url);
      } else {
        alert("Failed to upload video file.");
      }
    } catch (err) {
      console.error("Video upload error:", err);
    } finally {
      setIsUploadingVideoFile(false);
    }
  };

  // Delete Video Version
  const handleDeleteVideoVersion = async (verId: any) => {
    const updated = videoVersions.filter(v => v.id !== verId);
    setVideoVersions(updated);
    if (selectedVersionId === verId) {
      setSelectedVersionId(updated.length > 0 ? updated[0].id : null);
    }

    if (project) {
      const activeVideoUrl = updated.length > 0 ? updated[0].url : "";
      const updatedContents = project.contents.map((c: any) =>
        String(c.id) === String(contentId) 
          ? { ...c, video: activeVideoUrl, videos: updated } 
          : c
      );
      setProject({ ...project, contents: updatedContents });

      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to delete video version:", err);
      }
    }
  };

  // Save helper for research updates
  const updateResearchInBackend = async (updatedPoints: any[], updatedNotes: string, updatedBrief: any) => {
    setResearchPoints(updatedPoints);
    setGeneralNotes(updatedNotes);
    setPostBrief(updatedBrief);

    if (project) {
      const newResearchObj = {
        points: updatedPoints,
        notes: updatedNotes,
        brief: updatedBrief
      };

      const updatedContents = project.contents.map((c: any) => 
        String(c.id) === String(contentId) ? { ...c, research: newResearchObj } : c
      );
      
      setProject({ ...project, contents: updatedContents });

      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to save research data:", err);
      }
    }
  };

  const handleOpenAddPointModal = () => {
    setEditingPointId(null);
    setPointTitle("");
    setPointCategory("Competitor Study");
    setPointUrl("");
    setPointNote("");
    setIsResearchModalOpen(true);
  };

  const handleOpenEditPointModal = (pt: any) => {
    setEditingPointId(pt.id);
    setPointTitle(pt.title);
    setPointCategory(pt.category || "Competitor Study");
    setPointUrl(pt.url || "");
    setPointNote(pt.note || "");
    setIsResearchModalOpen(true);
  };

  const handleSavePoint = () => {
    if (!pointTitle.trim()) return;

    let updated: any[];
    if (editingPointId !== null) {
      updated = researchPoints.map(p => p.id === editingPointId ? {
        ...p,
        title: pointTitle.trim(),
        category: pointCategory,
        url: pointUrl.trim(),
        note: pointNote.trim()
      } : p);
    } else {
      const newPt = {
        id: Date.now(),
        title: pointTitle.trim(),
        category: pointCategory,
        url: pointUrl.trim(),
        note: pointNote.trim()
      };
      updated = [newPt, ...researchPoints];
    }

    updateResearchInBackend(updated, generalNotes, postBrief);
    setIsResearchModalOpen(false);
  };

  const handleDeletePoint = (ptId: number) => {
    const updated = researchPoints.filter(p => p.id !== ptId);
    updateResearchInBackend(updated, generalNotes, postBrief);
  };

  const handleSaveGeneralNotes = () => {
    updateResearchInBackend(researchPoints, generalNotes, postBrief);
    setIsEditingNotes(false);
  };

  const handleSaveBrief = () => {
    updateResearchInBackend(researchPoints, generalNotes, postBrief);
    setIsEditingBrief(false);
  };

  const handleToggleChecklist = async (noteId: number) => {
    const updatedChecklist = contentNotes.map(n => n.id === noteId ? {...n, checked: !n.checked} : n);
    setContentNotes(updatedChecklist);
    
    if (project) {
      const updatedContents = project.contents.map((c: any) => 
        String(c.id) === String(contentId) ? { ...c, checklist: updatedChecklist } : c
      );
      
      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to save checklist state:", err);
      }
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newNote.trim()) return;
    const newItems = [...contentNotes, { id: Date.now(), text: newNote.trim(), checked: false }];
    setContentNotes(newItems);
    setNewNote("");
    
    if (project) {
      const updatedContents = project.contents.map((c: any) => 
        String(c.id) === String(contentId) ? { ...c, checklist: newItems } : c
      );
      
      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...project,
            contents: updatedContents
          })
        });
      } catch (err) {
        console.error("Failed to save checklist item:", err);
      }
    }
  };

  const [basicTab, setBasicTab] = useState<"caption" | "video" | "image">("caption");

  const handleUpgradeToComprehensive = async () => {
    if (project) {
      const updatedContents = project.contents.map((c: any) => 
        String(c.id) === String(contentId) 
          ? { ...c, aiSettings: { ...c.aiSettings, scope: "Comprehensive" } } 
          : c
      );
      setProject({ ...project, contents: updatedContents });
      try {
        await fetch(`/api/creators/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...project, contents: updatedContents })
        });
      } catch (err) {
        console.error("Failed to upgrade to comprehensive:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (contentItem?.aiSettings?.scope === "Basic") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="max-w-5xl mx-auto space-y-6 py-8 px-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push(`/admin/creators/${id}/contents`)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Contents Hub
            </button>
            <button 
              onClick={handleUpgradeToComprehensive}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" /> Upgrade to Comprehensive
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{contentItem.title}</h1>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-medium border border-slate-700">
                      {contentItem.type}
                    </span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
                      {contentItem.status}
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                      Media Type: {contentItem.aiSettings?.mediaType || "Video"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 border-b border-slate-800 pb-px mb-6">
                {(() => {
                  const mediaFocus = contentItem.aiSettings?.mediaType || "Video";
                  const tabs = ["caption"];
                  if (mediaFocus === "Video" || mediaFocus === "Combine") tabs.push("video");
                  if (mediaFocus === "Image" || mediaFocus === "Combine") tabs.push("image");
                  
                  return tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setBasicTab(tab as any)}
                      className={`pb-3 px-2 text-sm font-semibold transition-all relative ${
                        basicTab === tab ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab === "caption" ? "Caption / Script" : tab === "video" ? "Video Preview" : "Image Preview"}
                      {basicTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-t-full shadow-[0_-2px_8px_rgba(52,211,153,0.5)]" />
                      )}
                    </button>
                  ));
                })()}
              </div>

              {basicTab === "caption" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Generated Content</h3>
                  </div>
                  <textarea 
                    value={scriptContent}
                    onChange={(e) => {
                      setScriptContent(e.target.value);
                      if (project) {
                        const updatedContents = project.contents.map((c: any) => 
                          String(c.id) === String(contentId) ? { ...c, text: e.target.value } : c
                        );
                        setProject({ ...project, contents: updatedContents });
                        fetch(`/api/creators/${id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...project, contents: updatedContents })
                        });
                      }
                    }}
                    rows={12}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Type or paste caption / script..."
                  />
                </div>
              )}

              {basicTab === "video" && (
                <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                   {isUploadingVideoFile ? (
                     <div className="flex flex-col items-center justify-center gap-3 text-emerald-400">
                       <Loader2 className="w-8 h-8 animate-spin" />
                       <span className="font-medium">Uploading video...</span>
                     </div>
                   ) : videoVersions.length > 0 && videoVersions[0].url ? (
                     <div className="w-full h-full relative group">
                       <video src={videoVersions[0].url} controls className="w-full h-full object-contain" />
                       <button 
                         onClick={() => handleDeleteVideoVersion(videoVersions[0].id)}
                         className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="text-center text-slate-500 flex flex-col items-center">
                       <Video className="w-12 h-12 mb-3 opacity-50" />
                       <p>No video uploaded.</p>
                       <label className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white cursor-pointer transition-colors border border-slate-700">
                         Upload Video
                         <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                           if(e.target.files && e.target.files[0]) handleR2FileUpload(e.target.files[0]);
                         }} />
                       </label>
                     </div>
                   )}
                </div>
              )}

              {basicTab === "image" && (
                <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                   <div className="text-center text-slate-500 flex flex-col items-center">
                     <Frame className="w-12 h-12 mb-3 opacity-50" />
                     <p>Image preview coming soon.</p>
                     <p className="text-xs mt-2 text-slate-600">This tab can display image assets once integrated.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push(`/admin/creators/${id}/contents`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Contents Hub
          </button>
          
          <div className="flex gap-3">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 cursor-pointer border border-slate-700">
              <Share2 className="w-4 h-4" /> Share Link
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer">
              <CheckCircle className="w-4 h-4" /> Approve Content
            </button>
          </div>
        </div>

        {/* Overall Content Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                {contentItem.status}
              </span>
              <span className="text-slate-500 font-medium">Content Delivery</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
              {contentItem.title}
            </h1>
            <p className="text-lg text-slate-400 max-w-3xl leading-relaxed">
              {contentItem.details || "No details or brief provided."}
            </p>
          </div>
        </div>

        {/* Global Tabs & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 mb-6 gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {['home', 'research & notes', 'video', 'socials'].map((tab) => (
              <button
                key={tab}
                onClick={() => setGlobalTab(tab)}
                className={`px-8 py-4 font-medium text-sm transition-colors border-b-2 cursor-pointer whitespace-nowrap capitalize ${
                  globalTab === tab 
                    ? 'border-blue-500 text-white bg-slate-800/50 rounded-t-xl' 
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded-t-xl'
                }`}
              >
                {tab === 'research & notes' ? 'Research & Notes' : tab}
              </button>
            ))}
          </div>
          <div className="pb-2 md:pb-0 pr-2">
            <button 
              onClick={handleSyncToSocials}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Sync to Socials
            </button>
          </div>
        </div>

        {/* --- GLOBAL TAB CONTENT --- */}

        {globalTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
               <h2 className="text-xl font-bold text-white">Content Overview</h2>
               <p className="text-sm text-slate-400 mt-1">High-level summary and performance tracking for this content piece.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Notes & Strategy */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-blue-400" />
                     Strategy Checklist
                  </h3>
                </div>
                <div className="flex-grow bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[300px]">
                  <div className="space-y-4 flex-grow mb-4 overflow-y-auto pr-2">
                    {contentNotes.map(note => (
                      <div key={note.id} className="flex items-start gap-3 group">
                        <button 
                          onClick={() => handleToggleChecklist(note.id)}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${note.checked ? 'bg-blue-500 border-blue-500' : 'border-slate-600 hover:border-blue-400 bg-slate-900'}`}
                        >
                          {note.checked && <CheckCircle className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`text-sm transition-colors ${note.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {note.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto pt-4 border-t border-slate-800">
                    <input 
                      type="text" 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newNote.trim()) {
                          handleAddChecklistItem();
                        }
                      }}
                      placeholder="Add a new item..."
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button 
                      onClick={handleAddChecklistItem}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Analytics */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <Activity className="w-5 h-5 text-purple-400" />
                     Performance Analytics
                  </h3>
                  {performance && (
                    <button 
                      onClick={() => setPerformance(null)}
                      className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Re-analyze data
                    </button>
                  )}
                </div>
                
                {!performance ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400 mb-3">Paste raw performance data from YouTube Studio, Instagram Insights, or TikTok Analytics to auto-extract insights.</p>
                    <textarea 
                      value={rawPerformanceInput}
                      onChange={(e) => setRawPerformanceInput(e.target.value)}
                      placeholder="e.g. Views 1.2M, Watch time 4:12, CTR 6.8%..."
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 mb-3 resize-none"
                    />
                    <button 
                      onClick={handleAnalyzePerformance}
                      disabled={!rawPerformanceInput.trim() || isAnalyzingPerformance}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors cursor-pointer shadow-lg shadow-purple-500/20 flex justify-center items-center gap-2"
                    >
                      {isAnalyzingPerformance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      {isAnalyzingPerformance ? "Analyzing..." : "Analyze with AI"}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Views</p>
                          <p className="text-2xl font-black text-white">{performance.views || "N/A"}</p>
                          {performance.viewsVsAvg && performance.viewsVsAvg !== "N/A" && (
                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {performance.viewsVsAvg}</p>
                          )}
                       </div>
                       <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Avg. View Duration</p>
                          <p className="text-2xl font-black text-white">{performance.avgViewDuration || "N/A"}</p>
                          {performance.durationVsAvg && performance.durationVsAvg !== "N/A" && (
                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {performance.durationVsAvg}</p>
                          )}
                       </div>
                       <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Click-Through Rate</p>
                          <p className="text-2xl font-black text-white">{performance.ctr || "N/A"}</p>
                          {performance.ctrVsAvg && performance.ctrVsAvg !== "N/A" && (
                            <p className="text-xs text-orange-400 mt-1 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> {performance.ctrVsAvg}</p>
                          )}
                       </div>
                       <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Est. Revenue</p>
                          <p className="text-2xl font-black text-white">{performance.revenue || "N/A"}</p>
                          <p className="text-xs text-slate-500 mt-1">From AI Analysis</p>
                       </div>
                    </div>

                    {/* Analysis / Graph Placeholder */}
                    <h4 className="font-bold text-white text-sm mb-3">Retention Curve</h4>
                    <div className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl relative flex items-end p-4 gap-2 overflow-hidden group">
                       {/* AI Chart */}
                       {(performance.chartData || [100, 90, 85, 70, 65, 63, 62, 60, 58, 55, 52, 48, 45, 42, 40]).map((h: number, i: number) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-purple-600 to-blue-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
                       ))}
                       {performance.retentionDip && performance.retentionDip !== "N/A" && (
                         <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 shadow-xl">
                           {performance.retentionDip}
                         </div>
                       )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- RESEARCH & NOTES TAB CONTENT --- */}
        {globalTab === 'research & notes' && (
          <div className="space-y-6">
            
            {/* Main Container: Post Details & Research Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-400" />
                    Post Details & Research Notes
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Review, drop, and edit all background brief details, target audience insights, and research notes for this post.</p>
                </div>
                
                <button 
                  onClick={handleSaveGeneralNotes}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <CheckCircle className="w-4 h-4" /> Save Changes
                </button>
              </div>

              {/* Post Details & Brief Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Post Topic / Title</label>
                  <input 
                    type="text" 
                    value={postBrief.topic}
                    onChange={(e) => setPostBrief({ ...postBrief, topic: e.target.value })}
                    placeholder="Enter post title or core topic..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Target Audience</label>
                  <input 
                    type="text" 
                    value={postBrief.audience}
                    onChange={(e) => setPostBrief({ ...postBrief, audience: e.target.value })}
                    placeholder="e.g. Tech Enthusiasts, VR Creators..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Post Brief & Core Description */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Post Brief / Core Message</label>
                <textarea 
                  rows={3}
                  value={postBrief.coreMessage}
                  onChange={(e) => setPostBrief({ ...postBrief, coreMessage: e.target.value })}
                  placeholder="Enter main pillar description, value proposition, or brief overview..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white leading-relaxed focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* General Research & Competitor Notes */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Research & Strategy Notes
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">Supports Text & Paste</span>
                </div>
                <textarea 
                  rows={10}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Drop all retention notes, competitor benchmarks, B-roll ideas, or audience insights here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Research Points / Key Takeaways List */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-base">Key Research References ({researchPoints.length})</h3>
                </div>

                {researchPoints.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No reference points added yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {researchPoints.map((pt) => (
                      <div key={pt.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 relative group hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-white text-sm">{pt.title}</h4>
                          <button 
                            onClick={() => handleDeletePoint(pt.id)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                            title="Delete point"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{pt.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- DYNAMIC DATA-DRIVEN VIDEO TAB CONTENT --- */}
        {globalTab === 'video' && (
          <div className="space-y-6">
            
            {/* Version Switcher Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-400" />
                  Video Player & Version Control
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Switch between uploaded cuts, stream playback, or add new video versions.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Version Selector Pills */}
                {videoVersions.length > 0 && (
                  <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 max-w-full overflow-x-auto">
                    {videoVersions.map((ver) => (
                      <button
                        key={ver.id}
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedVersionId === ver.id 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {ver.name}
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setIsAddingVideoVersion(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 ml-auto md:ml-0"
                >
                  <Plus className="w-4 h-4" /> Add Video Version
                </button>
              </div>
            </div>

            {/* Video Player Box */}
            {(() => {
              const currentVer = videoVersions.find(v => v.id === selectedVersionId);
              const currentUrl = currentVer?.url;

              if (currentUrl) {
                return (
                  <div className="w-full aspect-video bg-black rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl group">
                    <video 
                      src={currentUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {currentVer.name} ({currentVer.date})
                    </div>
                  </div>
                );
              }

              return (
                <div className="w-full aspect-video bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">No video uploaded for this version</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Upload an MP4/WebM video file or paste a video streaming URL to view playback.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingVideoVersion(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    + Upload Video File
                  </button>
                </div>
              );
            })()}

            {/* Two Column Layout: Script & Copy (Editable) vs Version Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Column: Script & Copy (Data Driven & Editable) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                      Script & Content Copy
                    </h3>
                    <button 
                      onClick={() => {
                        if (isEditingScript) {
                          handleSaveScriptContent();
                        } else {
                          setIsEditingScript(true);
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
                    >
                      {isEditingScript ? "Save Script" : "Edit Script"}
                    </button>
                  </div>

                  {isEditingScript ? (
                    <div className="space-y-3">
                      <textarea 
                        rows={14}
                        value={scriptContent}
                        onChange={(e) => setScriptContent(e.target.value)}
                        placeholder="Write or edit the video script (Hook, Intro, Act 1, Outro)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={handleSaveScriptContent}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                      >
                        Save Script Changes
                      </button>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed bg-slate-950 p-6 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono min-h-[220px]">
                      {scriptContent || "No script written yet. Click 'Edit Script' to write the hook, intro, and scene directions."}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Column: Version History & Video Info */}
              <div className="space-y-6">
                
                {/* Version History List */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="font-bold text-white text-base">Video Version History</h3>
                  
                  {videoVersions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No video versions recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {videoVersions.map((ver) => (
                        <div 
                          key={ver.id}
                          onClick={() => setSelectedVersionId(ver.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                            selectedVersionId === ver.id 
                              ? 'bg-blue-950/40 border-blue-500/50' 
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{ver.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{ver.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedVersionId === ver.id && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold">Active</span>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideoVersion(ver.id);
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                              title="Delete version"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* --- SOCIALS TAB CONTENT --- */}
        {globalTab === 'socials' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
               <div>
                 <h2 className="text-xl font-bold text-white">Social Media Assets</h2>
                 <p className="text-sm text-slate-400 mt-1">Manage and publish repurposed content across all platforms.</p>
               </div>
               <div className="flex items-center gap-4">
                 <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
                   <button 
                     onClick={() => setSocialsView('list')}
                     className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${socialsView === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                   >
                     List
                   </button>
                   <button 
                     onClick={() => setSocialsView('grid')}
                     className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${socialsView === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                   >
                     Grid
                   </button>
                 </div>
                 <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium border border-slate-700 cursor-pointer">+ New Request</button>
               </div>
            </div>

            <div className={socialsView === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              
              {/* Instagram Reel */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/ig`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-pink-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">IG</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-pink-400 transition-colors">Instagram Reel Cut</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.ig ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.ig ? "Ready" : "Not Generated"}</span> • 60s</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Vertical cut optimized for Instagram Reels. Focus on the hook within the first 3 seconds.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.ig ? "Review Draft" : "Generate Draft"}
                 </button>
              </div>

              {/* Instagram Image Post */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/ig_image`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-pink-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">IG</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-pink-400 transition-colors">Instagram Image Post</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.ig_image ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.ig_image ? "Ready" : "Not Generated"}</span> • 1:1 Image</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Static image post or multi-slide carousel. Focus on visually rich text templates.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.ig_image ? "Review Post" : "Generate Draft"}
                 </button>
              </div>

              {/* TikTok */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/tk`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-slate-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-xl border border-slate-700 shadow-lg shrink-0">
                       <span className="font-bold text-xs">TK</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-slate-300 transition-colors">TikTok Hook Variation</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.tk ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.tk ? "Ready" : "Not Generated"}</span> • 15s</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Fast-paced 15s hook variant targeting Gen-Z audience. Ready for manual upload.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.tk ? "Review Draft" : "Generate Draft"}
                 </button>
              </div>

              {/* YouTube Shorts */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/yt`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-red-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">YT</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">YouTube Shorts</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.yt ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.yt ? "Ready" : "Not Generated"}</span> • 59s</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Shorts derived from the main pillar video. Currently gaining traction in the feed.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.yt ? "Review Draft" : "Generate Draft"}
                 </button>
              </div>

              {/* YouTube Main Video */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/yt_video`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-red-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-700 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">YT</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">YouTube Main Video</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.yt_video ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.yt_video ? "Ready" : "Not Generated"}</span> • 16:9 Video</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Long-form horizontal video descriptions. Includes timestamps and resource links.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.yt_video ? "Review Description" : "Generate Draft"}
                 </button>
              </div>

              {/* Twitter/X */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/x`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-slate-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-xl border border-slate-700 shadow-lg shrink-0">
                       <span className="font-bold text-xs">X</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-slate-300 transition-colors">Twitter Thread</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.x ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.x ? "Ready" : "Not Generated"}</span> • Thread</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">A multi-part thread breaking down the key insights and setup of the content idea.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.x ? "Review Thread" : "Generate Draft"}
                 </button>
              </div>

              {/* LinkedIn */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/in`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-blue-600/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-700 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">IN</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">LinkedIn Post</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.in ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.in ? "Ready" : "Not Generated"}</span> • Post</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">Professional breakdown of the production workflow and the editing software used.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.in ? "Review Post" : "Generate Draft"}
                 </button>
              </div>

              {/* Facebook */}
              <div 
                onClick={() => router.push(`/admin/creators/${id}/contents/${contentId}/socials/fb`)}
                className={`bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex ${socialsView === 'grid' ? 'flex-col gap-4 min-h-[240px] items-start' : 'items-center justify-between'} group hover:border-blue-500/50 transition-colors cursor-pointer`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                       <span className="font-bold text-xs">FB</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">Facebook Watch</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={contentItem.socials?.fb ? "text-emerald-400" : "text-orange-400"}>{contentItem.socials?.fb ? "Ready" : "Not Generated"}</span> • Post</p>
                    </div>
                 </div>
                 {socialsView === 'grid' && (
                   <p className="text-xs text-slate-400 leading-relaxed mt-2">A narrated cut description designed for Facebook Watch audience retention.</p>
                 )}
                 <button className={`bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 cursor-pointer ${socialsView === 'grid' ? 'w-full py-3 mt-auto' : 'px-4 py-2'}`}>
                   {contentItem.socials?.fb ? "Review Draft" : "Generate Draft"}
                 </button>
              </div>

            </div>
          </div>
        )}



        {/* Points Upload Modal */}
        <AnimatePresence>
          {showPointsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
              >
                <button 
                  onClick={() => setShowPointsModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {pointsUploadType === 'options' && (
                  <>
                    <h3 className="text-xl font-bold text-white mb-6">Add New Point</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPointsUploadType('single')}
                        className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-white text-sm">Single Entry</span>
                      </button>
                      <button 
                        onClick={() => setPointsUploadType('bulk')}
                        className="bg-slate-950 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileJson className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-white text-sm">Bulk JSON</span>
                      </button>
                    </div>
                  </>
                )}

                {pointsUploadType === 'single' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setPointsUploadType('options')} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-xl font-bold text-white">Add Single Point</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reference Title</label>
                        <input type="text" placeholder="e.g. MrBeast - 50 Hours" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes / Description</label>
                        <textarea placeholder="Add your notes here..." rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
                      </div>
                      <button 
                        onClick={() => setShowPointsModal(false)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
                      >
                        Save Point
                      </button>
                    </div>
                  </motion.div>
                )}

                {pointsUploadType === 'bulk' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setPointsUploadType('options')} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-xl font-bold text-white">Bulk Upload Points</h3>
                    </div>

                    <div className="flex gap-2 border-b border-slate-800 mb-4">
                      {['template', 'upload', 'preview'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setBulkPointsTab(tab as any)}
                          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer capitalize ${
                            bulkPointsTab === tab
                              ? 'border-purple-500 text-white'
                              : 'border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {bulkPointsTab === 'template' && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-400">Copy this template structure to format your bulk JSON.</p>
                        <pre className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-blue-400 font-mono overflow-auto">
{`[
  {
    "title": "Reference Name",
    "notes": "Description of the insight or point..."
  },
  {
    "title": "Second Reference",
    "notes": "Another important insight..."
  }
]`}
                        </pre>
                        <button 
                          onClick={() => setBulkPointsTab('upload')}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
                        >
                          I'm ready to upload
                        </button>
                      </div>
                    )}

                    {bulkPointsTab === 'upload' && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-400">Paste your JSON array of points below.</p>
                        <textarea placeholder='[&#10;  { "title": "...", "notes": "..." }&#10;]' rows={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500 resize-none" />
                        <button 
                          onClick={() => setBulkPointsTab('preview')}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
                        >
                          Parse & Preview
                        </button>
                      </div>
                    )}

                    {bulkPointsTab === 'preview' && (
                      <div className="space-y-4">
                         <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-48 overflow-y-auto space-y-4">
                            <div className="border-l-2 border-purple-500 pl-3">
                               <p className="text-sm font-bold text-white">Reference Name</p>
                               <p className="text-xs text-slate-500 mt-1">Description of the insight or point...</p>
                            </div>
                            <div className="border-l-2 border-purple-500 pl-3">
                               <p className="text-sm font-bold text-white">Second Reference</p>
                               <p className="text-xs text-slate-500 mt-1">Another important insight...</p>
                            </div>
                         </div>
                         <button 
                          onClick={() => { setShowPointsModal(false); setBulkPointsTab('upload'); setPointsUploadType('options'); }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
                        >
                          Confirm & Save Points
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Research Point CRUD Modal */}
        {isResearchModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-lg font-extrabold text-white">
                  {editingPointId !== null ? "Edit Research Point" : "Add Research Point"}
                </h3>
                <button 
                  onClick={() => setIsResearchModalOpen(false)}
                  className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Title *</label>
                  <input 
                    type="text" 
                    value={pointTitle}
                    onChange={(e) => setPointTitle(e.target.value)}
                    placeholder="e.g. MrBeast Antarctic Challenge Study"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Category</label>
                  <select 
                    value={pointCategory}
                    onChange={(e) => setPointCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer text-sm"
                  >
                    <option value="Competitor Study">Competitor Study</option>
                    <option value="Hook & Angle">Hook & Angle</option>
                    <option value="Visual Inspiration">Visual Inspiration</option>
                    <option value="Key Takeaway">Key Takeaway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Reference URL (Optional)</label>
                  <input 
                    type="url" 
                    value={pointUrl}
                    onChange={(e) => setPointUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Notes / Key Observations</label>
                  <textarea 
                    rows={4}
                    value={pointNote}
                    onChange={(e) => setPointNote(e.target.value)}
                    placeholder="Key observations, pacing notes, B-roll recommendations..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsResearchModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePoint}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {editingPointId !== null ? "Save Changes" : "Add Point"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Video Version Modal */}
        {isAddingVideoVersion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingVideoVersion(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-lg font-bold text-white mb-6">Add Video Version</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Version Name</label>
                  <input 
                    type="text" 
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="e.g. Version 2.0 (No Music)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Video URL (or Upload)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newVersionUrl}
                      onChange={(e) => setNewVersionUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <label className={`flex items-center justify-center px-4 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors ${isUploadingVideoFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploadingVideoFile ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Upload className="w-4 h-4 text-slate-300" />}
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleR2FileUpload(e.target.files[0]);
                          }
                        }}
                        disabled={isUploadingVideoFile}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddingVideoVersion(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveVideoVersion}
                  disabled={!newVersionUrl.trim() || isUploadingVideoFile}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Save Version
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI Social Content Sync Overlay */}
        {isGeneratingSocials && (() => {
          const totalSteps = socialsList.length;
          const completedCount = socialsList.filter(s => s.status === "completed").length;
          const progressPercent = Math.round((completedCount / totalSteps) * 100);

          return (
            <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6">
              <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-emerald-400 animate-pulse" />
                  <h2 className="text-2xl font-bold text-white mb-2">Syncing to Socials</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">Generating platform-specific social posts based on the latest content brief...</p>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin relative z-10 mb-6">
                  {socialsList.map((platform) => {
                    const isGeneratingPlat = platform.status === "generating";
                    const isDone = platform.status === "completed";

                    return (
                      <div key={platform.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                        isDone ? "border-emerald-800/40 bg-emerald-950/10 text-emerald-400" :
                        isGeneratingPlat ? "border-blue-500 bg-blue-950/20 text-white font-medium animate-pulse" :
                        "border-slate-800 bg-slate-950/30 text-slate-500"
                      }`}>
                        {isDone ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> :
                          isGeneratingPlat ? <Loader2 size={18} className="animate-spin text-blue-400 shrink-0" /> :
                          <div className="w-[18px] h-[18px] rounded-full border border-slate-800 shrink-0" />}
                        <span className="text-sm">
                          {isGeneratingPlat ? "Generating post for " : ""} {platform.name} Copy
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Overall Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-850">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
