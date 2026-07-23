"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, DollarSign, Edit, Users, Calendar as CalendarIcon, CheckCircle2, FileText, Type, CalendarDays, Plus, ChevronLeft, ChevronRight, LayoutGrid, Upload, Copy, Check, Eye, Search, Filter, MoreVertical, Play, Image as ImageIcon, Link, Trash2, X, Video, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import SocialTemplates from "@/components/admin/SocialTemplates";

export default function CreatorProjectDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<any>(null);
  const [selectedTitle, setSelectedTitle] = useState<any>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<any>(null);

  // Tab State
  const [activeProjectTab, setActiveProjectTab] = useState("home");

  // Video Library State
  const [savedVideos, setSavedVideos] = useState<any[]>([]);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoFormTitle, setVideoFormTitle] = useState("");
  const [videoFormUrl, setVideoFormUrl] = useState("");
  const [videoFormNote, setVideoFormNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [activePlayingVideo, setActivePlayingVideo] = useState<any | null>(null);
  const [videoSearch, setVideoSearch] = useState("");

  // Contents Hub State (For Video Tab)
  const [contents, setContents] = useState<any[]>([
    { id: 1, title: "I Survived 50 Hours in the Metaverse", type: "Video", status: "Published", views: "1.2M", date: "Aug 12, 2026" },
    { id: 2, title: "Testing the World's Most Expensive Setup", type: "Short", status: "In Review", views: "-", date: "Aug 15, 2026" },
    { id: 3, title: "My 5 AM Morning Routine", type: "Video", status: "Draft", views: "-", date: "Aug 18, 2026" },
    { id: 4, title: "Behind the Scenes Vlog", type: "Video", status: "Filming", views: "-", date: "Aug 22, 2026" },
    { id: 5, title: "Why You're Using Your iPhone Wrong", type: "Short", status: "Editing", views: "-", date: "Aug 25, 2026" },
  ]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Published': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'In Review': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Filming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Editing': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Timeline State
  const [timeline, setTimeline] = useState([
    { id: 1, title: "Initial Briefing & Contract", date: "Day 1", completed: true },
    { id: 2, title: "Product Shipment", date: "Day 3", completed: true },
    { id: 3, title: "Concept Brainstorming", date: "Day 5", completed: false },
    { id: 4, title: "Script Approval", date: "Day 7", completed: false },
    { id: 5, title: "Production (Filming)", date: "Day 10", completed: false },
    { id: 6, title: "Initial Edit", date: "Day 12", completed: false },
    { id: 7, title: "Internal Review", date: "Day 14", completed: false },
    { id: 8, title: "Creator Revisions", date: "Day 16", completed: false },
    { id: 9, title: "Final Polish", date: "Day 18", completed: false },
    { id: 10, title: "Content Upload", date: "Day 20", completed: false },
    { id: 11, title: "Content Go-Live", date: "Day 21", completed: false },
  ]);

  // Bulk Upload State for Milestones
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const MILESTONE_TEMPLATE = `[
  {
    "title": "Initial Briefing",
    "date": "Day 1",
    "description": "Review and sign the initial contract. Finalize the creative brief."
  },
  {
    "title": "Script Approval",
    "date": "Day 3",
    "description": "Review and approve the video script before production begins."
  }
]`;

  // Add Single Milestone State
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");

  // Titles State & Pagination
  const [titlePage, setTitlePage] = useState(1);
  const [titles, setTitles] = useState([
    { id: 1, text: "I Survived 50 Hours in the Metaverse", type: "High retention hook" },
    { id: 2, text: "Testing the World's Most Expensive Setup", type: "Tech / Gadget focus" },
    { id: 3, text: "How I Built a $100k Business in 30 Days", type: "Finance / Business" },
    { id: 4, text: "Why You're Using Your iPhone Wrong", type: "Tutorial / Tech" },
    { id: 5, text: "The Secret to Viral Videos Revealed", type: "Educational" },
    { id: 6, text: "I Tried Elon Musk's Daily Routine", type: "Lifestyle Challenge" },
    { id: 7, text: "Don't Buy This Laptop Until You Watch This", type: "Review Warning" },
    { id: 8, text: "My 5 AM Morning Routine for Productivity", type: "Lifestyle" },
    { id: 9, text: "Exposing the Biggest Tech Scam of 2026", type: "Investigative" },
    { id: 10, text: "Building a Custom PC for a Celebrity", type: "Build / VLOG" },
    { id: 11, text: "I Ate Only Pizza for 7 Days", type: "Challenge" },
    { id: 12, text: "React vs Next.js in 2026", type: "Programming" },
    { id: 13, text: "How to Make Cinematic Videos on Phone", type: "Tutorial" },
    { id: 14, text: "Behind the Scenes of my Studio", type: "Vlog", hook: "Come see where the magic happens.", script: "Welcome to my new studio..." }
  ]);

  const [showTitleOptions, setShowTitleOptions] = useState(false);
  
  // Single Title State
  const [isAddingTitle, setIsAddingTitle] = useState(false);
  const [newTitleText, setNewTitleText] = useState("");
  const [newTitleType, setNewTitleType] = useState("");
  const [newTitleHook, setNewTitleHook] = useState("");
  const [newTitleScript, setNewTitleScript] = useState("");

  // Bulk Title State
  const [isBulkUploadingTitles, setIsBulkUploadingTitles] = useState(false);
  const [bulkTitleJson, setBulkTitleJson] = useState("");
  const [bulkTitlePreview, setBulkTitlePreview] = useState<any[] | null>(null);
  const [bulkTitleError, setBulkTitleError] = useState("");
  const [copiedTitleTemplate, setCopiedTitleTemplate] = useState(false);

  const TITLE_TEMPLATE = `[
  {
    "text": "My 5 AM Morning Routine",
    "type": "Lifestyle",
    "hook": "This single habit changed my entire life.",
    "script": "I used to wake up at noon every day..."
  }
]`;

  // Content addition state
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentType, setNewContentType] = useState("Video");
  const [newContentStatus, setNewContentStatus] = useState("Draft");
  const [newContentVideo, setNewContentVideo] = useState("");
  const [newContentText, setNewContentText] = useState("");
  const [newContentShorts, setNewContentShorts] = useState("");
  const [newContentDetails, setNewContentDetails] = useState("");
  const [isGeneratingAIContent, setIsGeneratingAIContent] = useState(false);
  const [outlineStatus, setOutlineStatus] = useState<"pending" | "generating" | "completed">("pending");
  const [outlineStepLabel, setOutlineStepLabel] = useState("Analyzing your request...");
  const [socialsList, setSocialsList] = useState<{ id: string; name: string; status: "pending" | "generating" | "completed" }[]>([]);

  // Titles Pagination Logic
  const TITLES_PER_PAGE = 7;
  const totalTitlePages = Math.ceil(titles.length / TITLES_PER_PAGE);
  const currentTitles = titles.slice((titlePage - 1) * TITLES_PER_PAGE, titlePage * TITLES_PER_PAGE);

  useEffect(() => {
    fetchProject();
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("addContent") === "true") {
        setIsAddingContent(true);
      }
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/creators/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        if (data.project.timeline) setTimeline(data.project.timeline);
        if (data.project.titles) setTitles(data.project.titles);
        if (data.project.contents) setContents(data.project.contents);
        if (data.project.videos) setSavedVideos(data.project.videos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjectData = async (updatedTimeline?: any, updatedTitles?: any, updatedContents?: any, updatedVideos?: any) => {
    if (!project) return;
    try {
      await fetch(`/api/creators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          client: project.client,
          creator: project.creator,
          status: project.status,
          budget: project.budget,
          timeline: updatedTimeline !== undefined ? updatedTimeline : timeline,
          titles: updatedTitles !== undefined ? updatedTitles : titles,
          contents: updatedContents !== undefined ? updatedContents : contents,
          videos: updatedVideos !== undefined ? updatedVideos : savedVideos,
        })
      });
    } catch (err) {
      console.error("Failed to save project data:", err);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const gridDays = [];
    
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      gridDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, index: gridDays.length });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      gridDays.push({ day: i, isCurrentMonth: true, index: gridDays.length });
    }
    
    // Next month padding
    const totalSlots = gridDays.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - gridDays.length;
    for (let i = 1; i <= remainingSlots; i++) {
      gridDays.push({ day: i, isCurrentMonth: false, index: gridDays.length });
    }
    
    return gridDays;
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getContentsForDate = (dateObj: { day: number; isCurrentMonth: boolean }) => {
    if (!dateObj.isCurrentMonth) return [];
    return contents.filter((c: any) => {
      if (!c.date) return false;
      const cDate = new Date(c.date);
      return (
        cDate.getDate() === dateObj.day &&
        cDate.getMonth() === currentDate.getMonth() &&
        cDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const toggleTimeline = (milestoneId: number) => {
    const updated = timeline.map(t => t.id === milestoneId ? { ...t, completed: !t.completed } : t);
    setTimeline(updated);
    saveProjectData(updated);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(MILESTONE_TEMPLATE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handlePreviewJson = () => {
    setBulkError("");
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");
      setBulkPreview(parsed);
    } catch (e: any) {
      setBulkError(e.message);
      setBulkPreview(null);
    }
  };

  const handleSaveBulk = () => {
    if (!bulkPreview) return;
    const newItems = bulkPreview.map((item, idx) => ({
      id: Date.now() + idx,
      title: item.title || "Untitled Milestone",
      date: item.date || "TBD",
      description: item.description || "",
      completed: false
    }));
    
    const updated = [...timeline, ...newItems];
    setTimeline(updated);
    saveProjectData(updated);
    setIsBulkUploading(false);
    setBulkJson("");
    setBulkPreview(null);
  };

  const handleSaveSingleMilestone = () => {
    if (!newMilestoneTitle) return;
    const newItem = {
      id: Date.now(),
      title: newMilestoneTitle,
      date: newMilestoneDate || "TBD",
      description: newMilestoneDesc || "",
      completed: false
    };
    const updated = [...timeline, newItem];
    setTimeline(updated);
    saveProjectData(updated);
    setIsAddingMilestone(false);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setNewMilestoneDesc("");
  };

  const handleCopyTitleTemplate = () => {
    navigator.clipboard.writeText(TITLE_TEMPLATE);
    setCopiedTitleTemplate(true);
    setTimeout(() => setCopiedTitleTemplate(false), 2000);
  };

  const handlePreviewTitleJson = () => {
    setBulkTitleError("");
    try {
      const parsed = JSON.parse(bulkTitleJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");
      setBulkTitlePreview(parsed);
    } catch (e: any) {
      setBulkTitleError(e.message);
      setBulkTitlePreview(null);
    }
  };

  const handleSaveBulkTitles = () => {
    if (!bulkTitlePreview) return;
    const newItems = bulkTitlePreview.map((item, idx) => ({
      id: Date.now() + idx,
      text: item.text || "Untitled Idea",
      type: item.type || "General",
      hook: item.hook || "",
      script: item.script || ""
    }));
    const updated = [...newItems, ...titles];
    setTitles(updated);
    saveProjectData(undefined, updated);
    setIsBulkUploadingTitles(false);
    setBulkTitleJson("");
    setBulkTitlePreview(null);
  };

  const handleSaveSingleTitle = () => {
    if (!newTitleText) return;
    const newItem = {
      id: Date.now(),
      text: newTitleText,
      type: newTitleType || "General",
      hook: newTitleHook || "",
      script: newTitleScript || ""
    };
    const updated = [newItem, ...titles];
    setTitles(updated);
    saveProjectData(undefined, updated);
    setIsAddingTitle(false);
    setNewTitleText("");
    setNewTitleType("");
    setNewTitleHook("");
    setNewTitleScript("");
  };

  const closeAddContentModal = () => {
    setIsAddingContent(false);
    setNewContentTitle("");
    setNewContentType("Video");
    setNewContentStatus("Draft");
    setNewContentVideo("");
    setNewContentText("");
    setNewContentShorts("");
    setNewContentDetails("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError("");
  };

  const handleSaveSingleContent = () => {
    if (!newContentTitle) return;
    const newItem = {
      id: Date.now(),
      title: newContentTitle,
      type: newContentType,
      status: newContentStatus,
      views: "-",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      video: newContentVideo,
      text: newContentText,
      shorts: newContentShorts,
      details: newContentDetails
    };
    const updated = [...contents, newItem];
    setContents(updated);
    saveProjectData(undefined, undefined, updated);
    closeAddContentModal();
  };

  const triggerContentGeneration = async () => {
    if (!newContentTitle) return;

    setIsGeneratingAIContent(true);
    setOutlineStatus("generating");
    setOutlineStepLabel("Analyzing content idea...");
    setSocialsList([
      { id: "ig", name: "Instagram Reel", status: "pending" },
      { id: "ig_image", name: "Instagram Image Post", status: "pending" },
      { id: "tk", name: "TikTok Hook", status: "pending" },
      { id: "yt", name: "YouTube Shorts", status: "pending" },
      { id: "yt_video", name: "YouTube Main Video", status: "pending" },
      { id: "x", name: "Twitter/X Thread", status: "pending" },
      { id: "in", name: "LinkedIn Post", status: "pending" },
    ]);

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
        video: newContentVideo,
        details: generatedContent.details || newContentDetails,
        text: generatedContent.script || newContentText,
        shorts: newContentShorts,
        checklist: (generatedContent.checklist || []).map((text: string, idx: number) => ({
          id: idx + 1,
          text,
          checked: false
        })),
        research: {
          points: generatedContent.research?.points || [],
          notes: generatedContent.research?.notes || ""
        },
        socials: {}
      };

      // Save initial outline content item to database
      const updatedContents = [...contents, newContentItem];
      setContents(updatedContents);
      await saveProjectData(undefined, undefined, updatedContents);

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
            projectId: id,
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
      router.push(`/admin/creators/${id}/contents/${newContentId}`);

    } catch (err: any) {
      console.error(err);
      alert(`Content generation failed: ${err.message || "Unknown error"}`);
    }
  };

  const handlePromoteTitleToContent = (titleObj: any) => {
    if (!titleObj) return;
    const newContentItem = {
      id: Date.now(),
      title: titleObj.text,
      type: "Video",
      status: "Draft",
      views: "-",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updatedContents = [...contents, newContentItem];
    const updatedTitles = titles.filter((t: any) => t.id !== titleObj.id);

    setContents(updatedContents);
    setTitles(updatedTitles);
    saveProjectData(undefined, updatedTitles, updatedContents);
    setSelectedTitle(null);
  };


  const closeAddVideoModal = () => {
    setShowAddVideo(false);
    setVideoFormTitle("");
    setVideoFormUrl("");
    setVideoFormNote("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError("");
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.url) {
            if (isAddingContent) {
              setNewContentVideo(res.url);
              if (!newContentTitle) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                setNewContentTitle(nameWithoutExt);
              }
            } else {
              setVideoFormUrl(res.url);
              if (!videoFormTitle) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                setVideoFormTitle(nameWithoutExt);
              }
            }
          } else {
            setUploadError(res.error || "Upload failed");
          }
        } catch (err) {
          setUploadError("Failed to parse server response");
        }
      } else {
        setUploadError(`Upload failed with status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadError("Network error occurred during upload");
    };

    xhr.send(formData);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <h2 className="text-xl mb-4">Project not found</h2>
        <button onClick={() => router.push('/admin/creators')} className="text-blue-500 hover:underline">
          Return to Creators Manager
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Navigation */}
        <button 
          onClick={() => router.push('/admin/creators')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Creators Manager
        </button>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                {project.creator.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3 inline-block">
                  {project.status}
                </span>
                <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">{project.name}</h1>
                <p className="text-lg text-slate-400">{project.client} • {project.creator}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <button onClick={() => setIsAddingContent(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:scale-105 active:scale-95">
                <Plus className="w-4 h-4" />
                Create Content
              </button>
              <button 
                onClick={() => router.push(`/admin/creators/${project.id}/contents`)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <LayoutGrid className="w-4 h-4" />
                All Contents
              </button>
              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700 hover:border-slate-600">
                <Edit className="w-4 h-4" />
                Edit Details
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-slate-400 font-medium mb-1">Budget</h3>
            <p className="text-2xl font-bold text-white">{project.budget}</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-slate-400 font-medium mb-1">Assigned To</h3>
            <p className="text-2xl font-bold text-white">{project.creator}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <CalendarIcon className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-slate-400 font-medium mb-1">Created</h3>
            <p className="text-xl font-bold text-white">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Project Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6 mt-4 overflow-x-auto">
          {[
            { id: 'home', label: 'Home' },
            { id: 'titles', label: 'Titles' },
            { id: 'videos', label: 'Videos' },
            { id: 'social', label: 'Social Templates' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProjectTab(tab.id)}
              className={`px-8 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                activeProjectTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: HOME (Timeline & Calendar) */}
        {activeProjectTab === 'home' && (
          <div className="space-y-6">
            {/* Plan Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[550px] lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Campaign Plan
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsBulkUploading(true)}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1.5 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Bulk Upload
                </button>
                <button 
                  onClick={() => setIsAddingMilestone(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Milestone
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950/50 rounded-xl p-6 border border-slate-800 relative overflow-y-auto">
              <div className="space-y-6 relative z-10">
                {/* Connecting Line */}
                <div className="absolute left-[11px] top-[10px] bottom-[40px] w-0.5 bg-slate-800 -z-10" />
                
                {timeline.map((item, index) => {
                  const firstIncompleteIndex = timeline.findIndex(t => !t.completed);
                  const isCurrent = index === firstIncompleteIndex;

                  return (
                    <div key={item.id} className="flex items-start gap-6 group cursor-pointer" onClick={() => setSelectedTimelineItem(item)}>
                      <div className="mt-1">
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleTimeline(item.id); }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                            item.completed 
                              ? 'bg-blue-500 border-blue-500 text-white' 
                              : isCurrent
                                ? 'bg-slate-900 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                                : 'bg-slate-900 border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {item.completed && <CheckCircle2 className="w-4 h-4" />}
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                        </div>
                      </div>
                      <div className={`flex-1 rounded-lg p-4 transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-slate-800/80 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] transform scale-[1.02]' 
                          : 'bg-slate-900 border border-slate-800 group-hover:border-slate-700'
                      }`}>
                        <div className="flex justify-between items-start">
                          <h3 className={`font-semibold transition-colors ${
                            item.completed 
                              ? 'text-slate-500 line-through' 
                              : isCurrent 
                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-bold'
                                : 'text-slate-300'
                          }`}>
                            {item.title}
                          </h3>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-950 text-slate-500'
                          }`}>
                            {item.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Tab: TITLES (Potential Content Titles) */}
        {activeProjectTab === 'titles' && (
          <div className="space-y-6">
            {/* Titles Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[550px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Type className="w-5 h-5 text-emerald-500" />
                Titles & Hooks
              </h2>
              <div className="relative">
                <button 
                  onClick={() => setShowTitleOptions(!showTitleOptions)} 
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {showTitleOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTitleOptions(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20">
                      <button 
                        onClick={() => { setIsAddingTitle(true); setShowTitleOptions(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <Type className="w-4 h-4 text-emerald-400" /> Add Single Title
                      </button>
                      <button 
                        onClick={() => { setIsBulkUploadingTitles(true); setShowTitleOptions(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 border-t border-slate-800 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-purple-400" /> Bulk Upload JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2">
              {currentTitles.map((title) => (
                <div 
                  key={title.id} 
                  onClick={() => setSelectedTitle(title)}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer group"
                >
                  <p className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-1">{title.text}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{title.type}</p>
                </div>
              ))}

              {titlePage === totalTitlePages && (
                <div className="flex flex-col items-center justify-center py-4 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg hover:border-slate-600 hover:bg-slate-800/30 transition-colors cursor-pointer">
                  <Plus className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-xs">Add new title</span>
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {totalTitlePages > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
                <button 
                  onClick={() => setTitlePage(Math.max(1, titlePage - 1))}
                  disabled={titlePage === 1}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-slate-500 font-medium">Page {titlePage} of {totalTitlePages}</span>
                <button 
                  onClick={() => setTitlePage(Math.min(totalTitlePages, titlePage + 1))}
                  disabled={titlePage === totalTitlePages}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Tab: VIDEOS (Video Library) */}
        {activeProjectTab === 'videos' && (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={e => setVideoSearch(e.target.value)}
                  placeholder="Search saved videos..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={() => setShowAddVideo(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Video
              </button>
            </div>

            {/* Video Grid */}
            {savedVideos.filter(v =>
              v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
              v.url.toLowerCase().includes(videoSearch.toLowerCase())
            ).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500">
                <Video className="w-14 h-14 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-slate-400 mb-1">No videos saved yet</h3>
                <p className="text-sm text-center max-w-xs">Add YouTube, Vimeo, or direct video links to build your reference library for this project.</p>
                <button
                  onClick={() => setShowAddVideo(true)}
                  className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add First Video
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedVideos
                  .filter(v =>
                    v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
                    v.url.toLowerCase().includes(videoSearch.toLowerCase())
                  )
                  .map((vid: any) => {
                    const isYoutube = vid.url.includes("youtube.com") || vid.url.includes("youtu.be");
                    const isVimeo = vid.url.includes("vimeo.com");
                    const embedUrl = isYoutube
                      ? `https://www.youtube.com/embed/${vid.url.split("v=")[1]?.split("&")[0] || vid.url.split("/").pop()}`
                      : isVimeo
                      ? `https://player.vimeo.com/video/${vid.url.split("/").pop()}`
                      : null;

                    return (
                      <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors group">
                        {/* Thumbnail / Preview */}
                        <div
                          className="h-44 bg-slate-950 relative flex items-center justify-center cursor-pointer overflow-hidden"
                          onClick={() => setActivePlayingVideo(vid)}
                        >
                          {isYoutube ? (
                            <img
                              src={`https://img.youtube.com/vi/${vid.url.split("v=")[1]?.split("&")[0] || vid.url.split("/").pop()}/hqdefault.jpg`}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={vid.url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-6 h-6 text-white fill-white ml-1" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                            {isYoutube ? "YouTube" : isVimeo ? "Vimeo" : "Video"}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 className="font-bold text-white leading-tight mb-1 line-clamp-1">{vid.title}</h3>
                          {vid.note && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{vid.note}</p>}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                            <a
                              href={vid.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <Link className="w-3 h-3" /> Open Link
                            </a>
                            <button
                              onClick={() => {
                                const updated = savedVideos.filter(v => v.id !== vid.id);
                                setSavedVideos(updated);
                                saveProjectData(undefined, undefined, undefined, updated);
                              }}
                              className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Add Video Modal */}
            {showAddVideo && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAddVideoModal}>
                <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Video className="w-5 h-5 text-blue-400" /> Add Video</h2>
                    <button onClick={closeAddVideoModal} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Upload Video File</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          disabled={isUploading}
                          className="hidden"
                          id="video-file-upload"
                        />
                        <label
                          htmlFor="video-file-upload"
                          className={`w-full flex flex-col items-center justify-center gap-2 bg-slate-950 hover:bg-slate-950/80 border border-slate-700 border-dashed rounded-xl p-5 text-sm text-slate-300 hover:text-white cursor-pointer transition-all hover:border-blue-500/50 ${
                            isUploading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2 w-full">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                              <span className="font-semibold text-xs">Uploading ({uploadProgress}%)...</span>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-blue-400" />
                              <span className="font-medium text-xs">Select video file from computer</span>
                              <span className="text-[10px] text-slate-500">Supports MP4, MOV, WebM, etc.</span>
                            </>
                          )}
                        </label>
                      </div>
                      {uploadError && <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Title *</label>
                      <input
                        type="text"
                        value={videoFormTitle}
                        onChange={e => setVideoFormTitle(e.target.value)}
                        placeholder="e.g. Reference tutorial for intro style"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Video URL * <span className="text-slate-600">(YouTube, Vimeo, or direct .mp4)</span></label>
                      <input
                        type="url"
                        value={videoFormUrl}
                        onChange={e => setVideoFormUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Notes <span className="text-slate-600">(optional)</span></label>
                      <textarea
                        rows={2}
                        value={videoFormNote}
                        onChange={e => setVideoFormNote(e.target.value)}
                        placeholder="Why you saved this, what to use it for..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={closeAddVideoModal} className="px-5 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">Cancel</button>
                    <button
                      onClick={() => {
                        if (!videoFormTitle || !videoFormUrl) return;
                        const newVid = { id: Date.now(), title: videoFormTitle, url: videoFormUrl, note: videoFormNote };
                        const updated = [newVid, ...savedVideos];
                        setSavedVideos(updated);
                        saveProjectData(undefined, undefined, undefined, updated);
                        closeAddVideoModal();
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                      Save Video
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Player Modal */}
            {activePlayingVideo && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setActivePlayingVideo(null)}>
                <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-bold text-lg">{activePlayingVideo.title}</h3>
                    <button onClick={() => setActivePlayingVideo(null)} className="text-slate-400 hover:text-white p-1"><X className="w-6 h-6" /></button>
                  </div>
                  {(() => {
                    const url = activePlayingVideo.url;
                    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
                    const isVimeo = url.includes("vimeo.com");
                    const embedUrl = isYoutube
                      ? `https://www.youtube.com/embed/${url.split("v=")[1]?.split("&")[0] || url.split("/").pop()}?autoplay=1`
                      : isVimeo
                      ? `https://player.vimeo.com/video/${url.split("/").pop()}?autoplay=1`
                      : null;
                    return embedUrl ? (
                      <iframe src={embedUrl} className="w-full aspect-video rounded-2xl bg-black" allowFullScreen allow="autoplay" />
                    ) : (
                      <video src={url} controls autoPlay className="w-full aspect-video rounded-2xl bg-black" />
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: SOCIAL (Social Media Templates) */}
        {activeProjectTab === 'social' && (
          <SocialTemplates />
        )}

        {/* Grid Monthly Calendar (Persistent across all tabs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-500" />
              Content Calendar
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-300 text-sm font-bold min-w-[140px] text-center">
                {monthName}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-xl overflow-hidden border border-slate-800">
            {/* Days Header */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-slate-900 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {/* Calendar Grid */}
            {calendarDays.map((dateObj, i) => {
              const dayContents = getContentsForDate(dateObj);
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(dateObj)}
                  className={`bg-slate-950 p-2 h-28 md:h-36 border border-slate-900/50 hover:bg-slate-900 transition-colors relative group cursor-pointer ${
                    !dateObj.isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      {dateObj.day}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-[calc(100%-24px)] overflow-y-auto scrollbar-none pb-1 relative z-10">
                    {dayContents.map((contentItem: any) => (
                      <div
                        key={contentItem.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/creators/${id}/contents/${contentItem.id}`);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:scale-105 active:scale-95 ${getStatusColor(contentItem.status)}`}
                        title={`${contentItem.title} (${contentItem.status})`}
                      >
                        {contentItem.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Popups */}
      {selectedTimelineItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedTimelineItem(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            <h3 className="text-2xl font-bold text-white mb-2">{selectedTimelineItem.title}</h3>
            <p className="text-slate-400 mb-6">Scheduled for: <span className="text-slate-200 font-medium">{selectedTimelineItem.date}</span></p>
            
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 text-slate-300 mb-8 min-h-[120px] leading-relaxed">
              {selectedTimelineItem.description ? (
                <p>{selectedTimelineItem.description}</p>
              ) : (
                <p className="text-slate-500 italic">Detailed notes, links, and requirements for this milestone will appear here when the full system is connected.</p>
              )}
            </div>
            
            <div className="flex justify-end gap-4 relative z-10">
              <button onClick={() => setSelectedTimelineItem(null)} className="px-5 py-2.5 text-slate-400 font-medium hover:text-white transition-colors">Close</button>
              <button 
                onClick={() => { toggleTimeline(selectedTimelineItem.id); setSelectedTimelineItem(null); }}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${
                  selectedTimelineItem.completed 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/25'
                }`}
              >
                {selectedTimelineItem.completed ? 'Mark as Pending' : 'Complete Milestone'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedTitle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedTitle(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="mb-8 relative z-10">
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold inline-block mb-4 shadow-sm">
                {selectedTitle.type}
              </span>
              <h3 className="text-3xl font-extrabold text-white leading-tight">{selectedTitle.text}</h3>
            </div>
            
            <div className="space-y-4 mb-8 relative z-10">
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Visual Hook Idea</h4>
                <p className="text-slate-300 leading-relaxed">A striking visual of the subject with glowing neon outlines, pointing directly at a blurred background element.</p>
              </div>
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Script Intro</h4>
                <p className="text-slate-300 italic leading-relaxed">"You have been lied to about this your entire life, and today I'm going to prove it."</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 relative z-10">
              <button onClick={() => setSelectedTitle(null)} className="px-5 py-2.5 text-slate-400 font-medium hover:text-white transition-colors cursor-pointer">Close</button>
              <button 
                onClick={() => handlePromoteTitleToContent(selectedTitle)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Promote to Content
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploading && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkUploading(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-purple-500" />
              Bulk Upload Milestones
            </h2>
            <p className="text-slate-400 mb-6 text-sm">Paste an array of JSON objects to instantly add multiple milestones to this campaign plan.</p>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-300">JSON Payload</span>
              <button onClick={handleCopyTemplate} className="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1 transition-colors">
                {copiedTemplate ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedTemplate ? 'Copied Template!' : 'Copy Template'}
              </button>
            </div>
            
            <textarea 
              value={bulkJson}
              onChange={(e) => { setBulkJson(e.target.value); setBulkError(""); }}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-green-400 font-mono focus:outline-none focus:border-purple-500 transition-colors mb-4"
              placeholder="[\n  {\n    'title': 'Milestone',\n    ...\n  }\n]"
            />

            {bulkError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> {bulkError}</p>}

            {bulkPreview && (
              <div className="mb-6 flex-1 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400">
                      <th className="p-3 font-medium">Milestone Title</th>
                      <th className="p-3 font-medium">Date / Tag</th>
                      <th className="p-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 text-slate-300">
                        <td className="p-3 font-medium text-white">{item.title || 'Untitled'}</td>
                        <td className="p-3 whitespace-nowrap">{item.date}</td>
                        <td className="p-3 text-xs text-slate-400 truncate max-w-[200px]">{item.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-slate-800">
              <button 
                onClick={() => { setIsBulkUploading(false); setBulkPreview(null); setBulkJson(""); setBulkError(""); }}
                className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePreviewJson}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button 
                onClick={handleSaveBulk}
                disabled={!bulkPreview}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {bulkPreview?.length ? `(${bulkPreview.length})` : ''} Milestones
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Single Milestone Modal */}
      {isAddingMilestone && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddingMilestone(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Add Milestone
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Milestone Title *</label>
                <input 
                  type="text" 
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="e.g. Rough Cut Review" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Date or Tag</label>
                <input 
                  type="text" 
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="e.g. Day 14, Tomorrow, ASAP" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                <textarea 
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none" 
                  placeholder="Enter details, requirements, or links..." 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button 
                onClick={() => setIsAddingMilestone(false)}
                className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSingleMilestone}
                disabled={!newMilestoneTitle}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Milestone
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Single Title Modal */}
      {isAddingTitle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddingTitle(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-emerald-500" />
              Add Single Title
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title Idea *</label>
                <input 
                  type="text" 
                  value={newTitleText}
                  onChange={(e) => setNewTitleText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                  placeholder="e.g. My 5 AM Morning Routine" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Category / Tag</label>
                <input 
                  type="text" 
                  value={newTitleType}
                  onChange={(e) => setNewTitleType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                  placeholder="e.g. Lifestyle, Educational, Challenge" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Visual Hook Idea</label>
                <textarea 
                  value={newTitleHook}
                  onChange={(e) => setNewTitleHook(e.target.value)}
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none" 
                  placeholder="Describe the thumbnail or first 3 seconds..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Script Intro</label>
                <textarea 
                  value={newTitleScript}
                  onChange={(e) => setNewTitleScript(e.target.value)}
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none" 
                  placeholder="Write the first sentence of the script..." 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button 
                onClick={() => setIsAddingTitle(false)}
                className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSingleTitle}
                disabled={!newTitleText}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Title
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Upload Titles Modal */}
      {isBulkUploadingTitles && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkUploadingTitles(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-6 h-6 text-purple-500" />
              Bulk Upload Titles
            </h2>
            <p className="text-slate-400 mb-6 text-sm">Paste a JSON array to instantly populate your video ideas list.</p>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-300">JSON Payload</span>
              <button onClick={handleCopyTitleTemplate} className="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1 transition-colors">
                {copiedTitleTemplate ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedTitleTemplate ? 'Copied Template!' : 'Copy Template'}
              </button>
            </div>
            
            <textarea 
              value={bulkTitleJson}
              onChange={(e) => { setBulkTitleJson(e.target.value); setBulkTitleError(""); }}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-green-400 font-mono focus:outline-none focus:border-purple-500 transition-colors mb-4"
              placeholder="[\n  {\n    'text': 'Video Idea',\n    ...\n  }\n]"
            />

            {bulkTitleError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> {bulkTitleError}</p>}

            {bulkTitlePreview && (
              <div className="mb-6 flex-1 overflow-y-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400">
                      <th className="p-3 font-medium">Title Idea</th>
                      <th className="p-3 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkTitlePreview.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 text-slate-300">
                        <td className="p-3 font-medium text-white">{item.text || 'Untitled'}</td>
                        <td className="p-3">{item.type || 'General'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-slate-800">
              <button 
                onClick={() => { setIsBulkUploadingTitles(false); setBulkTitlePreview(null); setBulkTitleJson(""); setBulkTitleError(""); }}
                className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePreviewTitleJson}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button 
                onClick={handleSaveBulkTitles}
                disabled={!bulkTitlePreview}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {bulkTitlePreview?.length ? `(${bulkTitlePreview.length})` : ''} Titles
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Calendar Day Popup */}
      {selectedDate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                  {currentDate.toLocaleString('default', { month: 'long' })} {selectedDate.day}, {currentDate.getFullYear()}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Content Schedule</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6 min-h-[150px]">
              {selectedDate.isCurrentMonth && selectedDate.day === 12 ? (
                <div className="bg-slate-950/50 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">Draft Due</span>
                    <span className="text-xs text-slate-500">10:00 AM</span>
                  </div>
                  <h4 className="text-white font-medium">I Survived 50 Hours in the Metaverse</h4>
                  <p className="text-sm text-slate-400 mt-1">First rough cut review with the editing team.</p>
                </div>
              ) : selectedDate.isCurrentMonth && selectedDate.day === 18 ? (
                <div className="bg-slate-950/50 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded uppercase">Go Live</span>
                    <span className="text-xs text-slate-500">4:00 PM</span>
                  </div>
                  <h4 className="text-white font-medium">Testing the World's Most Expensive Setup</h4>
                  <p className="text-sm text-slate-400 mt-1">Scheduled for simultaneous release on YouTube and TikTok.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                  <p className="text-sm mb-2">No content scheduled for this date.</p>
                  <p className="text-xs opacity-60">Click the button below to assign a title.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> Schedule Content
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add New Content Modal */}
      {isAddingContent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAddContentModal}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Add New Content
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Format</label>
                    <select 
                      value={newContentType}
                      onChange={(e) => setNewContentType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="Video">Video</option>
                      <option value="Short">Short</option>
                      <option value="Text">Text</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                    <select 
                      value={newContentStatus}
                      onChange={(e) => setNewContentStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Filming">Filming</option>
                      <option value="Editing">Editing</option>
                      <option value="In Review">In Review</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Upload Video File</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="content-video-file-upload"
                    />
                    <label
                      htmlFor="content-video-file-upload"
                      className={`w-full flex flex-col items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-950/80 border border-slate-800 border-dashed rounded-xl p-4 text-sm text-slate-300 hover:text-white cursor-pointer transition-all hover:border-emerald-500/50 ${
                        isUploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1 w-full">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                          <span className="font-semibold text-[10px]">Uploading ({uploadProgress}%)...</span>
                          <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1 rounded-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-emerald-400" />
                          <span className="font-medium text-xs">Select video from computer</span>
                        </>
                      )}
                    </label>
                  </div>
                  {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Video URL <span className="text-slate-600">(if hosted online)</span></label>
                  <input 
                    type="url" 
                    value={newContentVideo}
                    onChange={(e) => setNewContentVideo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="https://..." 
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Content Idea / Details</label>
                  <textarea 
                    value={newContentDetails}
                    onChange={(e) => setNewContentDetails(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none text-slate-200" 
                    placeholder="Concept overview, hooks, target audience..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Text Content / Article / Script</label>
                  <textarea 
                    value={newContentText}
                    onChange={(e) => setNewContentText(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none text-slate-200" 
                    placeholder="Paste the full video script or text post content here..." 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Shorts Script / Caption</label>
                  <textarea 
                    value={newContentShorts}
                    onChange={(e) => setNewContentShorts(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none text-slate-200" 
                    placeholder="Short-form alternative script, hooks, or platform caption..." 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button 
                onClick={closeAddContentModal}
                className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={triggerContentGeneration}
                disabled={!newContentTitle}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Content
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Content Generation Loader Overlay */}
      {isGeneratingAIContent && (() => {
        const totalSteps = 1 + socialsList.length;
        const completedCount = (outlineStatus === "completed" ? 1 : 0) + socialsList.filter(s => s.status === "completed").length;
        const progressPercent = totalSteps > 1 ? Math.round((completedCount / totalSteps) * 100) : 0;

        return (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Decorative glows */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="text-center mb-8 relative z-10">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-emerald-400 animate-pulse" />
                <h2 className="text-2xl font-bold text-white mb-2">Generating Creator Content</h2>
                <p className="text-slate-400 text-sm leading-relaxed">Our AI is analyzing your concept and building outline, script, research notes, and platform-specific social posts sequentially.</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin relative z-10 mb-6">
                {/* Step 1: Outline and Brief */}
                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  outlineStatus === "completed" ? "border-emerald-800/40 bg-emerald-950/10 text-emerald-400" :
                  outlineStatus === "generating" ? "border-emerald-500/50 bg-emerald-950/20 text-white" :
                  "border-slate-800 bg-slate-950/30 text-slate-500"
                }`}>
                  {outlineStatus === "completed" ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> :
                    outlineStatus === "generating" ? <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" /> :
                    <div className="w-[18px] h-[18px] rounded-full border border-slate-800 shrink-0" />}
                  <div className="flex-1 text-sm font-semibold">
                    {outlineStatus === "completed" ? "Outline and script generated" :
                      outlineStatus === "generating" ? outlineStepLabel : "Understand and structure content idea"}
                  </div>
                </div>

                {/* Step 2: Social media contents */}
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
  );
}
