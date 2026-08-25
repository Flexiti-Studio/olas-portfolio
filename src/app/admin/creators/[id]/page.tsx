"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, DollarSign, Edit, Users, Calendar as CalendarIcon, CheckCircle2, FileText, Type, CalendarDays, Plus, ChevronLeft, ChevronRight, LayoutGrid, Upload, Copy, Check, Eye, Search, Filter, MoreVertical, Play, Image as ImageIcon, Link, Trash2, X, Video, Sparkles, Download } from "lucide-react";
import { motion } from "framer-motion";
import SocialTemplates from "@/components/admin/SocialTemplates";
import CreateContentModal from "./components/CreateContentModal";

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
  const [savedImages, setSavedImages] = useState<any[]>([]);
  const multipleVideoInputRef = useRef<HTMLInputElement>(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoUploadMode, setVideoUploadMode] = useState<"choice" | "single">("choice");
  const [imagePage, setImagePage] = useState(1);
  const [activePreviewImageIndex, setActivePreviewImageIndex] = useState<number | null>(null);
  const [videoFormTitle, setVideoFormTitle] = useState("");
  const [videoFormUrl, setVideoFormUrl] = useState("");
  const [videoFormNote, setVideoFormNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [activePlayingVideo, setActivePlayingVideo] = useState<any | null>(null);
  const [videoSearch, setVideoSearch] = useState("");
  const [videoSubTab, setVideoSubTab] = useState<"new" | "used">("new");
  const [imageSubTab, setImageSubTab] = useState<"new" | "used">("new");
  const [videoToDelete, setVideoToDelete] = useState<any | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  const [showBulkDeleteVideoConfirm, setShowBulkDeleteVideoConfirm] = useState(false);
  const [isBulkDeletingVideos, setIsBulkDeletingVideos] = useState(false);
  const [isEditingVideoPlayer, setIsEditingVideoPlayer] = useState(false);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoNote, setEditVideoNote] = useState("");
  const [isDownloadingVideoPlayer, setIsDownloadingVideoPlayer] = useState(false);
  const [isSavingVideoPlayerEdit, setIsSavingVideoPlayerEdit] = useState(false);
  const [activeVideoDropdownId, setActiveVideoDropdownId] = useState<number | null>(null);
  const [activeImageDropdownId, setActiveImageDropdownId] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<any | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [showBulkDeleteImageConfirm, setShowBulkDeleteImageConfirm] = useState(false);
  const [isBulkDeletingImages, setIsBulkDeletingImages] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<"choice" | "single" | "carousel">("choice");
  const [imageFormTitle, setImageFormTitle] = useState("");
  const [imageFormUrl, setImageFormUrl] = useState("");
  const [imageFormNote, setImageFormNote] = useState("");
  const [isUploadingSingleImage, setIsUploadingSingleImage] = useState(false);
  const [isEditingImagePlayer, setIsEditingImagePlayer] = useState(false);
  const [editImageTitle, setEditImageTitle] = useState("");
  const [editImageNote, setEditImageNote] = useState("");
  const [isSavingImagePlayerEdit, setIsSavingImagePlayerEdit] = useState(false);
  const [uploadProgressImages, setUploadProgressImages] = useState(0);
  const [carouselFormTitle, setCarouselFormTitle] = useState("");
  const [carouselFormNote, setCarouselFormNote] = useState("");
  const [carouselUrls, setCarouselUrls] = useState<string[]>([]);
  const [isUploadingCarousel, setIsUploadingCarousel] = useState(false);
  const [activeCarouselSlideIndex, setActiveCarouselSlideIndex] = useState(0);
  const [activeCarouselFormSlideIndex, setActiveCarouselFormSlideIndex] = useState(0);
  const multipleImageInputRef = useRef<HTMLInputElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSavingCarousel, setIsSavingCarousel] = useState(false);

  // Contents Hub State (For Video Tab)
  const [contents, setContents] = useState<any[]>([]);

  // Edit Project State
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectClient, setEditProjectClient] = useState("");
  const [editProjectCreator, setEditProjectCreator] = useState("");
  const [editProjectStatus, setEditProjectStatus] = useState("");
  const [editProjectBudget, setEditProjectBudget] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);

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
  const [timeline, setTimeline] = useState<any[]>([]);

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
  const [isSavingNewMilestone, setIsSavingNewMilestone] = useState(false);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [editMilestoneDate, setEditMilestoneDate] = useState("");
  const [editMilestoneDesc, setEditMilestoneDesc] = useState("");
  const [milestoneToDelete, setMilestoneToDelete] = useState<any | null>(null);
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Titles State & Pagination
  const [titlePage, setTitlePage] = useState(1);
  const [titles, setTitles] = useState<any[]>([]);

  const [showTitleOptions, setShowTitleOptions] = useState(false);
  
  // Single Title State
  const [isAddingTitle, setIsAddingTitle] = useState(false);
  const [isSavingNewTitle, setIsSavingNewTitle] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState("");
  const [editTitleType, setEditTitleType] = useState("");
  const [editTitleHook, setEditTitleHook] = useState("");
  const [editTitleScript, setEditTitleScript] = useState("");
  const [titleToDelete, setTitleToDelete] = useState<any | null>(null);
  const [isDeletingTitle, setIsDeletingTitle] = useState(false);
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
        if (data.project.images) setSavedImages(data.project.images);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjectData = async (updatedTimeline?: any, updatedTitles?: any, updatedContents?: any, updatedVideos?: any, updatedImages?: any) => {
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
          images: updatedImages !== undefined ? updatedImages : savedImages,
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

  const handleSaveSingleMilestone = async () => {
    if (!newMilestoneTitle) return;
    setIsSavingNewMilestone(true);
    const newItem = {
      id: Date.now(),
      title: newMilestoneTitle,
      date: newMilestoneDate || "TBD",
      description: newMilestoneDesc || "",
      completed: false
    };
    const updated = [...timeline, newItem];
    setTimeline(updated);
    await saveProjectData(updated);
    setIsSavingNewMilestone(false);
    setIsAddingMilestone(false);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setNewMilestoneDesc("");
    showToast("Milestone added successfully!");
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

  const handleSaveSingleTitle = async () => {
    if (!newTitleText) return;
    setIsSavingNewTitle(true);
    const newItem = {
      id: Date.now(),
      text: newTitleText,
      type: newTitleType || "General",
      hook: newTitleHook || "",
      script: newTitleScript || ""
    };
    const updated = [newItem, ...titles];
    setTitles(updated);
    await saveProjectData(undefined, updated);
    setIsSavingNewTitle(false);
    setIsAddingTitle(false);
    setNewTitleText("");
    setNewTitleType("");
    setNewTitleHook("");
    setNewTitleScript("");
    showToast("Title added successfully!");
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
    setUploadError("");
    setUploadProgress(0);
    setIsUploading(false);
    setVideoUploadMode("choice");
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
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
              setVideoFormUrl(res.url);
              if (!videoFormTitle) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                setVideoFormTitle(nameWithoutExt);
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
    } else {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError("");
      
      const newVideos: any[] = [];
      let completed = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/uploads", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success && data.url) {
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            newVideos.push({
              id: Date.now() + i,
              title: nameWithoutExt,
              url: data.url,
              note: ""
            });
          }
        } catch (err) {
          console.error("Upload failed for", file.name, err);
        }
        completed++;
        setUploadProgress(Math.round((completed / files.length) * 100));
      }
      
      if (newVideos.length > 0) {
        const updated = [...newVideos, ...savedVideos];
        setSavedVideos(updated);
        saveProjectData(undefined, undefined, undefined, updated);
        closeAddVideoModal();
      } else {
        setUploadError("All uploads failed.");
      }
      setIsUploading(false);
    }
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
              <button 
                onClick={() => {
                  setEditProjectName(project.name || "");
                  setEditProjectClient(project.client || "");
                  setEditProjectCreator(project.creator || "");
                  setEditProjectStatus(project.status || "");
                  setEditProjectBudget(project.budget || "");
                  setShowEditProject(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 border border-slate-700 hover:border-slate-600 cursor-pointer">
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
            { id: 'images', label: 'Images' },
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
          <div className="space-y-5 relative">
            
            {/* Floating Bulk Actions Bar */}
            {selectedVideoIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 rounded-full px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-fade-in-up">
                <span className="text-white font-bold text-sm bg-blue-500/20 px-3 py-1 rounded-full text-blue-400 border border-blue-500/30">
                  {selectedVideoIds.length} Selected
                </span>
                <div className="w-px h-6 bg-slate-700"></div>
                <button 
                  onClick={() => {
                    const selectedVids = savedVideos.filter(v => selectedVideoIds.includes(v.id));
                    const newContents = selectedVids.map((v, i) => ({
                      id: Date.now() + i,
                      title: v.title,
                      type: "Video",
                      status: "Draft",
                      views: "-",
                      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }));
                    const updatedContents = [...contents, ...newContents];
                    setContents(updatedContents);
                    saveProjectData(undefined, undefined, updatedContents);
                    setSelectedVideoIds([]);
                    showToast(`${selectedVids.length} videos added to contents!`);
                  }} 
                  className="text-blue-400 hover:text-blue-300 font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add to Content
                </button>
                <button 
                  onClick={() => setShowBulkDeleteVideoConfirm(true)} 
                  className="text-red-400 hover:text-red-300 font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button 
                  onClick={() => setSelectedVideoIds([])} 
                  className="ml-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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

            {/* Video Sub-Tabs */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 max-w-xs">
              <button
                onClick={() => setVideoSubTab("new")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  videoSubTab === "new" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                New
              </button>
              <button
                onClick={() => setVideoSubTab("used")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  videoSubTab === "used" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Used
              </button>
            </div>

            {/* Video Grid */}
            {savedVideos.filter(v =>
              (videoSubTab === "new" ? !(v.downloadCount > 0) : (v.downloadCount > 0)) &&
              ((v.title || "").toLowerCase().includes(videoSearch.toLowerCase()) ||
               (v.url || "").toLowerCase().includes(videoSearch.toLowerCase()))
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
                    (videoSubTab === "new" ? !(v.downloadCount > 0) : (v.downloadCount > 0)) &&
                    ((v.title || "").toLowerCase().includes(videoSearch.toLowerCase()) ||
                     (v.url || "").toLowerCase().includes(videoSearch.toLowerCase()))
                  )
                  .map((vid: any) => {
                    const isYoutube = (vid.url || "").includes("youtube.com") || (vid.url || "").includes("youtu.be");
                    const isVimeo = (vid.url || "").includes("vimeo.com");
                    const embedUrl = isYoutube
                      ? `https://www.youtube.com/embed/${vid.url.split("v=")[1]?.split("&")[0] || vid.url.split("/").pop()}`
                      : isVimeo
                      ? `https://player.vimeo.com/video/${vid.url.split("/").pop()}`
                      : null;

                    return (
                      <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors group flex flex-col">
                        {/* Thumbnail / Preview */}
                        <div
                          className="h-44 bg-slate-950 relative flex items-center justify-center cursor-pointer overflow-hidden shrink-0 group/thumb"
                          onClick={() => setActivePlayingVideo(vid)}
                        >
                          {/* Selector */}
                          <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedVideoIds.includes(vid.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedVideoIds([...selectedVideoIds, vid.id]);
                                } else {
                                  setSelectedVideoIds(selectedVideoIds.filter(id => id !== vid.id));
                                }
                              }}
                              className="w-5 h-5 rounded border-slate-600 bg-slate-800/80 cursor-pointer accent-blue-500 hover:scale-110 transition-transform" 
                            />
                          </div>

                          {/* 3-Dot Menu */}
                          <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => setActiveVideoDropdownId(activeVideoDropdownId === vid.id ? null : vid.id)}
                              className="p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-800 backdrop-blur-sm transition-colors shadow-sm cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {activeVideoDropdownId === vid.id && (
                              <>
                                <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveVideoDropdownId(null)} />
                                <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30">
                                  <button
                                    onClick={() => {
                                      setActivePlayingVideo(vid);
                                      setActiveVideoDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-400" /> View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setVideoToDelete(vid);
                                      setActiveVideoDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 flex items-center gap-2 border-t border-slate-800/80 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-white leading-tight mb-1 line-clamp-1">{vid.title}</h3>
                          {vid.note && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{vid.note}</p>}
                          <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={async () => {
                                  const a = document.createElement("a");
                                  a.href = vid.url;
                                  a.download = vid.title || "video.mp4";
                                  a.target = "_blank";
                                  a.click();
                                  
                                  const count = (vid.downloadCount || 0) + 1;
                                  const updated = savedVideos.map(v => v.id === vid.id ? { ...v, downloadCount: count } : v);
                                  setSavedVideos(updated);
                                  saveProjectData(undefined, undefined, undefined, updated);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                title="Download Video"
                              >
                                <Download className="w-3 h-3" /> {vid.downloadCount || 0}
                              </button>
                              <button
                                onClick={() => setVideoToDelete(vid)}
                                className="text-xs text-slate-500 hover:text-red-400 flex items-center transition-colors"
                                title="Delete Video"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Video className="w-5 h-5 text-blue-400" /> 
                      {videoUploadMode === "choice" ? "Add Video" : "Single Video Upload"}
                    </h2>
                    <button onClick={closeAddVideoModal} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  
                  {videoUploadMode === "choice" && !isUploading && (
                    <div className="flex flex-col gap-4 py-4">
                      <button 
                        onClick={() => setVideoUploadMode("single")}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-colors flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <Plus className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Single Upload</h3>
                          <p className="text-sm text-slate-400">Add a single video and add descriptive notes to it.</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => multipleVideoInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-colors flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                          <LayoutGrid className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">Multiple Upload</h3>
                          <p className="text-sm text-slate-400">Select multiple files and automatically bulk-upload them.</p>
                        </div>
                      </button>
                      <input 
                        type="file" 
                        accept="video/*" 
                        multiple 
                        className="hidden" 
                        ref={multipleVideoInputRef} 
                        onChange={handleVideoUpload} 
                      />
                    </div>
                  )}

                  {isUploading && videoUploadMode === "choice" && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Uploading Videos...</h3>
                      <p className="text-slate-400 text-sm mb-6">Please keep this window open.</p>
                      <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-blue-400">{uploadProgress}% Complete</p>
                    </div>
                  )}

                  {videoUploadMode === "single" && (
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
                          {videoFormUrl ? (
                             <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 aspect-video flex items-center justify-center">
                               <video src={videoFormUrl} controls className="w-full h-full object-contain" />
                               <button onClick={() => setVideoFormUrl("")} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
                                 <X className="w-4 h-4" />
                               </button>
                             </div>
                          ) : (
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
                                  <span className="text-[10px] text-slate-500">Supports MP4, MOV, WebM</span>
                                </>
                              )}
                            </label>
                          )}
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
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={videoFormNote}
                          onChange={e => setVideoFormNote(e.target.value)}
                          placeholder="Why you saved this, what to use it for..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setVideoUploadMode("choice")} className="px-5 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">Back</button>
                        <button
                          disabled={isSavingVideo}
                          onClick={async () => {
                            if (!videoFormTitle || !videoFormUrl) return;
                            setIsSavingVideo(true);
                            const newVid = { id: Date.now(), title: videoFormTitle, url: videoFormUrl, note: videoFormNote };
                            const updated = [newVid, ...savedVideos];
                            setSavedVideos(updated);
                            await saveProjectData(undefined, undefined, undefined, updated);
                            setIsSavingVideo(false);
                            closeAddVideoModal();
                          }}
                          className={`px-5 py-2 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
                            isSavingVideo ? "bg-blue-800 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
                          }`}
                        >
                          {isSavingVideo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                          ) : (
                            "Save Video"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video Player Modal */}
            {activePlayingVideo && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => { if (!isEditingVideoPlayer && !isDownloadingVideoPlayer) setActivePlayingVideo(null); }}>
                <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    {isEditingVideoPlayer ? (
                      <input
                        type="text"
                        value={editVideoTitle}
                        onChange={e => setEditVideoTitle(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-lg w-full max-w-lg focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <h3 className="text-white font-bold text-xl">{activePlayingVideo.title}</h3>
                    )}
                    <button onClick={() => setActivePlayingVideo(null)} className="text-slate-400 hover:text-white p-2 transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  
                  {/* Video Player */}
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-5 shadow-inner">
                    {(() => {
                      const url = activePlayingVideo.url;
                      const isYoutube = (url || "").includes("youtube.com") || (url || "").includes("youtu.be");
                      const isVimeo = (url || "").includes("vimeo.com");
                      const embedUrl = isYoutube
                        ? `https://www.youtube.com/embed/${url.split("v=")[1]?.split("&")[0] || url.split("/").pop()}?autoplay=1`
                        : isVimeo
                        ? `https://player.vimeo.com/video/${url.split("/").pop()}?autoplay=1`
                        : null;
                      return embedUrl ? (
                        <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay" />
                      ) : (
                        <video src={url} controls autoPlay className="w-full h-full object-contain" />
                      );
                    })()}
                  </div>

                  {/* Metadata and Description */}
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 relative">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Description</span>
                        {!isEditingVideoPlayer && activePlayingVideo.note && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activePlayingVideo.note);
                              showToast("Description copied to clipboard!");
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition-colors bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/10"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        )}
                      </div>
                      
                      {isEditingVideoPlayer ? (
                        <textarea
                          rows={3}
                          value={editVideoNote}
                          onChange={e => setEditVideoNote(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                      ) : (
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {activePlayingVideo.note || <span className="text-slate-500 italic">No description added to this video.</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      {isEditingVideoPlayer ? (
                        <>
                          <button
                            onClick={() => setIsEditingVideoPlayer(false)}
                            className="px-5 py-2.5 text-slate-400 font-semibold hover:text-white transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={isSavingVideoPlayerEdit}
                            onClick={async () => {
                              if (!editVideoTitle) return;
                              setIsSavingVideoPlayerEdit(true);
                              const updated = savedVideos.map(v => v.id === activePlayingVideo.id ? { ...v, title: editVideoTitle, note: editVideoNote } : v);
                              setSavedVideos(updated);
                              await saveProjectData(undefined, undefined, undefined, updated);
                              setActivePlayingVideo({ ...activePlayingVideo, title: editVideoTitle, note: editVideoNote });
                              setIsSavingVideoPlayerEdit(false);
                              setIsEditingVideoPlayer(false);
                              showToast("Video details updated!");
                            }}
                            className={`px-5 py-2.5 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                              isSavingVideoPlayerEdit ? "bg-blue-800 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25"
                            }`}
                          >
                            {isSavingVideoPlayerEdit ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditVideoTitle(activePlayingVideo.title);
                              setEditVideoNote(activePlayingVideo.note || "");
                              setIsEditingVideoPlayer(true);
                            }}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition-all text-sm"
                          >
                            Edit Details
                          </button>
                          
                          <button
                            disabled={isDownloadingVideoPlayer}
                            onClick={async () => {
                              setIsDownloadingVideoPlayer(true);
                              const a = document.createElement("a");
                              a.href = activePlayingVideo.url;
                              a.download = activePlayingVideo.title || "video.mp4";
                              a.target = "_blank";
                              a.click();

                              const count = (activePlayingVideo.downloadCount || 0) + 1;
                              const updated = savedVideos.map(v => v.id === activePlayingVideo.id ? { ...v, downloadCount: count } : v);
                              setSavedVideos(updated);
                              await saveProjectData(undefined, undefined, undefined, updated);
                              setActivePlayingVideo({ ...activePlayingVideo, downloadCount: count });
                              showToast("Video download started!");
                              setIsDownloadingVideoPlayer(false);
                            }}
                            className={`px-5 py-2.5 text-white rounded-xl font-bold transition-all text-sm shadow-lg flex items-center gap-2 ${
                              isDownloadingVideoPlayer ? "bg-blue-800 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/25"
                            }`}
                          >
                            {isDownloadingVideoPlayer ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" /> Download Video ({activePlayingVideo.downloadCount || 0})
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
           </div>
        )}

        {/* Tab: IMAGES */}
        {activeProjectTab === 'images' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[550px]">
            {(() => {
              const getImageUrl = (img: any) => {
                if (typeof img === "string") return img;
                if (img.type === "carousel" && img.urls && img.urls.length > 0) return img.urls[0];
                return img.url || "";
              };
              const getImageDownloadCount = (img: any) => typeof img === "string" ? 0 : (img.downloadCount || 0);
              const getImageId = (img: any, idx: number) => typeof img === "string" ? idx : (img.id || idx);

              const filteredImages = savedImages.filter(img => {
                const count = getImageDownloadCount(img);
                return imageSubTab === "new" ? !(count > 0) : (count > 0);
              });

              const itemsPerPage = 12; // Smaller images allow more per page
              const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
              const currentPageImages = filteredImages.slice((imagePage - 1) * itemsPerPage, imagePage * itemsPerPage);

              return (
                <>
                  <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center mb-6 relative">
                    {/* Floating Bulk Actions Bar for Images */}
                    {selectedImageIds.length > 0 && (
                      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 rounded-full px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-fade-in-up">
                        <span className="text-white font-bold text-sm bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 border border-emerald-500/30">
                          {selectedImageIds.length} Selected
                        </span>
                        <div className="w-px h-6 bg-slate-700"></div>
                        <button 
                          onClick={() => {
                            const selectedImgs = savedImages.filter((img: any, idx: number) => selectedImageIds.includes(getImageId(img, idx)));
                            const newContents = selectedImgs.map((img: any, i: number) => {
                              const title = typeof img === 'string' ? `Image ${i+1}` : (img.title || `Image ${i+1}`);
                              return {
                                id: Date.now() + i,
                                title: title,
                                type: img.type === "carousel" ? "Carousel" : "Image",
                                status: "Draft",
                                views: "-",
                                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              };
                            });
                            const updatedContents = [...contents, ...newContents];
                            setContents(updatedContents);
                            saveProjectData(undefined, undefined, updatedContents);
                            setSelectedImageIds([]);
                            showToast(`${selectedImgs.length} items added to contents!`);
                          }} 
                          className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Add to Content
                        </button>
                        <button 
                          onClick={() => setShowBulkDeleteImageConfirm(true)} 
                          className="text-red-400 hover:text-red-300 font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button 
                          onClick={() => setSelectedImageIds([])} 
                          className="ml-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-emerald-500" />
                      Image Gallery
                    </h2>
                    
                    <button 
                      onClick={() => {
                        setImageUploadMode("choice");
                        setShowAddImage(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 text-sm shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Upload Images
                    </button>
                  </div>

                  {/* Image Sub-Tabs */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 max-w-xs mb-6">
                    <button
                      onClick={() => { setImageSubTab("new"); setImagePage(1); }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        imageSubTab === "new" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      New
                    </button>
                    <button
                      onClick={() => { setImageSubTab("used"); setImagePage(1); }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        imageSubTab === "used" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Used
                    </button>
                  </div>
                  
                  {filteredImages.length > 0 ? (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {currentPageImages.map((img: any, idx) => {
                          const globalIdx = savedImages.indexOf(img);
                          const isCarousel = img && img.type === "carousel";
                          return (
                            <div 
                              key={getImageId(img, globalIdx)} 
                              className="relative aspect-square rounded-xl border border-slate-800 bg-slate-950 overflow-hidden group cursor-pointer hover:border-emerald-500/50 transition-all flex flex-col"
                              onClick={() => {
                                setActiveCarouselSlideIndex(0);
                                setActivePreviewImageIndex(globalIdx);
                              }}
                            >
                              <img src={getImageUrl(img)} alt={`Gallery item ${globalIdx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              
                              {/* Carousel Stack Indicator */}
                              {isCarousel && (
                                <div className="absolute top-2 left-10 z-10 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-1.5 py-0.5 rounded text-[9px] font-black text-amber-400 flex items-center gap-1">
                                  <Copy className="w-2.5 h-2.5" /> Carousel ({img.urls?.length || 0})
                                </div>
                              )}

                              {/* Selector Checkbox */}
                              <div className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedImageIds.includes(getImageId(img, globalIdx))}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const imgId = getImageId(img, globalIdx);
                                    if (e.target.checked) {
                                      setSelectedImageIds([...selectedImageIds, imgId]);
                                    } else {
                                      setSelectedImageIds(selectedImageIds.filter(id => id !== imgId));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-600 bg-slate-800/80 cursor-pointer accent-emerald-500 hover:scale-110 transition-transform" 
                                />
                              </div>

                              {/* 3-Dot Menu */}
                              <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={() => setActiveImageDropdownId(activeImageDropdownId === getImageId(img, globalIdx) ? null : getImageId(img, globalIdx))}
                                  className="p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-800 backdrop-blur-sm transition-colors shadow-sm cursor-pointer"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeImageDropdownId === getImageId(img, globalIdx) && (
                                  <>
                                    <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveImageDropdownId(null)} />
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30">
                                      <button
                                        onClick={() => {
                                          setActiveCarouselSlideIndex(0);
                                          setActivePreviewImageIndex(globalIdx);
                                          setActiveImageDropdownId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-emerald-400" /> View Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveImageDropdownId(null);
                                          setImageToDelete(img);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 flex items-center gap-2 border-t border-slate-800/80 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Download Overlay Button */}
                              <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={async () => {
                                    // Trigger downloads
                                    if (isCarousel && img.urls) {
                                      img.urls.forEach((url: string, i: number) => {
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `carousel-${getImageId(img, globalIdx)}-${i}.jpg`;
                                        a.target = "_blank";
                                        a.click();
                                      });
                                    } else {
                                      const a = document.createElement("a");
                                      a.href = getImageUrl(img);
                                      a.download = `image-${getImageId(img, globalIdx)}.jpg`;
                                      a.target = "_blank";
                                      a.click();
                                    }
                                    
                                    const updated = savedImages.map((item, i) => {
                                      if (i === globalIdx) {
                                        return { ...item, downloadCount: getImageDownloadCount(item) + 1 };
                                      }
                                      return item;
                                    });
                                    setSavedImages(updated);
                                    await saveProjectData(undefined, undefined, undefined, undefined, updated);
                                    showToast("Image download started!");
                                  }}
                                  className="p-1 rounded bg-slate-900/85 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 backdrop-blur-sm text-[10px] font-semibold flex items-center gap-1 border border-slate-800/50 shadow-md"
                                >
                                  <Download className="w-3 h-3" /> {getImageDownloadCount(img)}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
                          <button 
                            onClick={() => setImagePage(prev => Math.max(1, prev - 1))}
                            disabled={imagePage === 1}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-slate-500 font-medium">Page {imagePage} of {totalPages}</span>
                          <button 
                            onClick={() => setImagePage(prev => Math.min(totalPages, prev + 1))}
                            disabled={imagePage === totalPages}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                      <ImageIcon className="w-14 h-14 text-slate-700 mb-4" />
                      <h3 className="text-lg font-bold text-slate-400 mb-1">No images in this category</h3>
                      <p className="text-sm text-center max-w-xs">Upload images or download existing ones to move them here.</p>
                    </div>
                  )}
                </>
              );
            })()}
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
      {/* Popups */}
      {selectedTimelineItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => { if (!isEditingMilestone) setSelectedTimelineItem(null); }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            {isEditingMilestone ? (
              <div className="space-y-4 mb-6 relative z-10">
                <h3 className="text-xl font-bold text-white mb-4">Edit Milestone</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Milestone Title *</label>
                  <input 
                    type="text" 
                    value={editMilestoneTitle}
                    onChange={(e) => setEditMilestoneTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Date or Tag</label>
                  <input 
                    type="text" 
                    value={editMilestoneDate}
                    onChange={(e) => setEditMilestoneDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                  <textarea 
                    value={editMilestoneDesc}
                    onChange={(e) => setEditMilestoneDesc(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none" 
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedTimelineItem.title}</h3>
                <p className="text-slate-400 mb-6">Scheduled for: <span className="text-slate-200 font-medium">{selectedTimelineItem.date}</span></p>
                
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 text-slate-300 mb-8 min-h-[120px] leading-relaxed">
                  {selectedTimelineItem.description ? (
                    <p>{selectedTimelineItem.description}</p>
                  ) : (
                    <p className="text-slate-500 italic">Detailed notes, links, and requirements for this milestone will appear here when the full system is connected.</p>
                  )}
                </div>
              </>
            )}
            
            <div className="flex flex-wrap justify-between items-center gap-4 relative z-10 border-t border-slate-800/80 pt-5">
              {isEditingMilestone ? (
                <>
                  <button 
                    onClick={() => setIsEditingMilestone(false)} 
                    className="px-5 py-2.5 text-slate-400 font-medium hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!editMilestoneTitle) return;
                      const updated = timeline.map(item => 
                        item.id === selectedTimelineItem.id 
                          ? { ...item, title: editMilestoneTitle, date: editMilestoneDate || "TBD", description: editMilestoneDesc }
                          : item
                      );
                      setTimeline(updated);
                      saveProjectData(updated);
                      setSelectedTimelineItem({ ...selectedTimelineItem, title: editMilestoneTitle, date: editMilestoneDate || "TBD", description: editMilestoneDesc });
                      setIsEditingMilestone(false);
                      showToast("Milestone updated successfully!");
                    }}
                    disabled={!editMilestoneTitle}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setMilestoneToDelete(selectedTimelineItem)} 
                      className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl font-bold text-sm transition-all"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => {
                        setEditMilestoneTitle(selectedTimelineItem.title);
                        setEditMilestoneDate(selectedTimelineItem.date);
                        setEditMilestoneDesc(selectedTimelineItem.description || "");
                        setIsEditingMilestone(true);
                      }} 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedTimelineItem(null)} className="px-4 py-2 text-slate-400 font-medium hover:text-white transition-colors">Close</button>
                    <button 
                      onClick={() => { toggleTimeline(selectedTimelineItem.id); setSelectedTimelineItem(null); }}
                      className={`px-5 py-2 rounded-xl font-bold transition-all shadow-lg text-sm ${
                        selectedTimelineItem.completed 
                          ? 'bg-slate-855 border border-slate-700 text-slate-300 hover:bg-slate-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/25'
                      }`}
                    >
                      {selectedTimelineItem.completed ? 'Mark Pending' : 'Complete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {selectedTitle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => { if (!isEditingTitle) setSelectedTitle(null); }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            {isEditingTitle ? (
              <div className="space-y-4 mb-6 relative z-10">
                <h3 className="text-xl font-bold text-white mb-4">Edit Title & Hook</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Title Text *</label>
                  <input 
                    type="text" 
                    value={editTitleText}
                    onChange={(e) => setEditTitleText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Category / Type</label>
                  <input 
                    type="text" 
                    value={editTitleType}
                    onChange={(e) => setEditTitleType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                    placeholder="e.g. High retention hook, Vlog"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Visual Hook Idea</label>
                  <input 
                    type="text" 
                    value={editTitleHook}
                    onChange={(e) => setEditTitleHook(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Script Intro</label>
                  <textarea 
                    value={editTitleScript}
                    onChange={(e) => setEditTitleScript(e.target.value)}
                    className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none" 
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 relative z-10">
                  <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold inline-block mb-4 shadow-sm">
                    {selectedTitle.type}
                  </span>
                  <h3 className="text-3xl font-extrabold text-white leading-tight">{selectedTitle.text}</h3>
                </div>
                
                <div className="space-y-4 mb-8 relative z-10">
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Visual Hook Idea</h4>
                    <p className="text-slate-300 leading-relaxed">{selectedTitle.hook || "A striking visual of the subject with glowing neon outlines, pointing directly at a blurred background element."}</p>
                  </div>
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Script Intro</h4>
                    <p className="text-slate-300 italic leading-relaxed">{selectedTitle.script || "\"You have been lied to about this your entire life, and today I'm going to prove it.\""}</p>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex flex-wrap justify-between items-center gap-4 relative z-10 border-t border-slate-800/80 pt-5">
              {isEditingTitle ? (
                <>
                  <button 
                    onClick={() => setIsEditingTitle(false)} 
                    className="px-5 py-2.5 text-slate-400 font-medium hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!editTitleText) return;
                      const updated = titles.map(item => 
                        item.id === selectedTitle.id 
                          ? { ...item, text: editTitleText, type: editTitleType || "General", hook: editTitleHook, script: editTitleScript }
                          : item
                      );
                      setTitles(updated);
                      saveProjectData(undefined, updated);
                      setSelectedTitle({ ...selectedTitle, text: editTitleText, type: editTitleType || "General", hook: editTitleHook, script: editTitleScript });
                      setIsEditingTitle(false);
                      showToast("Title updated successfully!");
                    }}
                    disabled={!editTitleText}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTitleToDelete(selectedTitle)} 
                      className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl font-bold text-sm transition-all"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => {
                        setEditTitleText(selectedTitle.text);
                        setEditTitleType(selectedTitle.type || "");
                        setEditTitleHook(selectedTitle.hook || "");
                        setEditTitleScript(selectedTitle.script || "");
                        setIsEditingTitle(true);
                      }} 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedTitle(null)} className="px-5 py-2.5 text-slate-400 font-medium hover:text-white transition-colors cursor-pointer">Close</button>
                    <button 
                      onClick={() => handlePromoteTitleToContent(selectedTitle)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                    >
                      Promote to Content
                    </button>
                  </div>
                </>
              )}
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
                disabled={!newMilestoneTitle || isSavingNewMilestone}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingNewMilestone ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Milestone"
                )}
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
                disabled={!newTitleText || isSavingNewTitle}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingNewTitle ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add Title"
                )}
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
      <CreateContentModal 
        isOpen={isAddingContent}
        onClose={() => setIsAddingContent(false)}
        projectId={id as string}
        onSaveContent={async (item) => {
          const updatedContents = [...contents, item];
          setContents(updatedContents);
          await saveProjectData(undefined, undefined, updatedContents);
        }}
      />

      {/* Delete Video Confirmation Modal */}
      {videoToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeletingVideo && setVideoToDelete(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Video?</h3>
            <p className="text-sm text-slate-400 mb-6 break-words">Are you sure you want to delete "{videoToDelete.title}"? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setVideoToDelete(null)}
                disabled={isDeletingVideo}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingVideo(true);
                  const updated = savedVideos.filter(v => v.id !== videoToDelete.id);
                  setSavedVideos(updated);
                  await saveProjectData(undefined, undefined, undefined, updated);
                  setIsDeletingVideo(false);
                  setVideoToDelete(null);
                  showToast("Video deleted successfully!");
                }}
                disabled={isDeletingVideo}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingVideo ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Videos Confirmation Modal */}
      {showBulkDeleteVideoConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isBulkDeletingVideos && setShowBulkDeleteVideoConfirm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete {selectedVideoIds.length} Videos?</h3>
            <p className="text-sm text-slate-400 mb-6">Are you sure you want to delete the selected videos? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteVideoConfirm(false)}
                disabled={isBulkDeletingVideos}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsBulkDeletingVideos(true);
                  const updated = savedVideos.filter(v => !selectedVideoIds.includes(v.id));
                  setSavedVideos(updated);
                  await saveProjectData(undefined, undefined, undefined, updated);
                  setIsBulkDeletingVideos(false);
                  setShowBulkDeleteVideoConfirm(false);
                  setSelectedVideoIds([]);
                  showToast(`${selectedVideoIds.length} videos deleted!`);
                }}
                disabled={isBulkDeletingVideos}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeletingVideos ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Milestone Confirmation Modal */}
      {milestoneToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeletingMilestone && setMilestoneToDelete(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Milestone?</h3>
            <p className="text-sm text-slate-400 mb-6 break-words">Are you sure you want to delete "{milestoneToDelete.title}"? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMilestoneToDelete(null)}
                disabled={isDeletingMilestone}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingMilestone(true);
                  const updated = timeline.filter(item => item.id !== milestoneToDelete.id);
                  setTimeline(updated);
                  await saveProjectData(updated);
                  setIsDeletingMilestone(false);
                  setMilestoneToDelete(null);
                  setSelectedTimelineItem(null); // Close the detail modal too
                  showToast("Milestone deleted successfully!");
                }}
                disabled={isDeletingMilestone}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingMilestone ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Title Confirmation Modal */}
      {titleToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeletingTitle && setTitleToDelete(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Title Idea?</h3>
            <p className="text-sm text-slate-400 mb-6 break-words">Are you sure you want to delete "{titleToDelete.text}"? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTitleToDelete(null)}
                disabled={isDeletingTitle}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingTitle(true);
                  const updated = titles.filter(item => item.id !== titleToDelete.id);
                  setTitles(updated);
                  await saveProjectData(undefined, updated);
                  setIsDeletingTitle(false);
                  setTitleToDelete(null);
                  setSelectedTitle(null); // Close the detail modal too
                  showToast("Title deleted successfully!");
                }}
                disabled={isDeletingTitle}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingTitle ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Image Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeletingImage && setImageToDelete(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Image?</h3>
            <p className="text-sm text-slate-400 mb-6 break-words">Are you sure you want to delete this image? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setImageToDelete(null)}
                disabled={isDeletingImage}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeletingImage(true);
                  const updated = savedImages.filter(item => {
                    const url = typeof item === "string" ? item : item.url;
                    const deleteUrl = typeof imageToDelete === "string" ? imageToDelete : imageToDelete.url;
                    return url !== deleteUrl;
                  });
                  setSavedImages(updated);
                  await saveProjectData(undefined, undefined, undefined, undefined, updated);
                  setIsDeletingImage(false);
                  setImageToDelete(null);
                  setActivePreviewImageIndex(null); // Close preview modal
                  showToast("Image deleted successfully!");
                }}
                disabled={isDeletingImage}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Images Confirmation Modal */}
      {showBulkDeleteImageConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isBulkDeletingImages && setShowBulkDeleteImageConfirm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete {selectedImageIds.length} Items?</h3>
            <p className="text-sm text-slate-400 mb-6">Are you sure you want to delete the selected images and carousels? This cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteImageConfirm(false)}
                disabled={isBulkDeletingImages}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsBulkDeletingImages(true);
                  const updated = savedImages.filter((img, idx) => {
                    const imgId = typeof img === "string" ? idx : (img.id || idx);
                    return !selectedImageIds.includes(imgId);
                  });
                  setSavedImages(updated);
                  await saveProjectData(undefined, undefined, undefined, undefined, updated);
                  setIsBulkDeletingImages(false);
                  setShowBulkDeleteImageConfirm(false);
                  setSelectedImageIds([]);
                  showToast(`${selectedImageIds.length} items deleted!`);
                }}
                disabled={isBulkDeletingImages}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeletingImages ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {activePreviewImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => { if (!isEditingImagePlayer) setActivePreviewImageIndex(null); }}
        >
          {(() => {
            const getImageUrl = (img: any, idx?: number) => {
              if (typeof img === "string") return img;
              if (img.type === "carousel" && img.urls && img.urls.length > 0) {
                return img.urls[idx !== undefined ? idx : activeCarouselSlideIndex] || img.urls[0];
              }
              return img.url || "";
            };
            const getImageDownloadCount = (img: any) => typeof img === "string" ? 0 : (img.downloadCount || 0);
            const getImageId = (img: any, idx: number) => typeof img === "string" ? idx : (img.id || idx);
            const getImageTitle = (img: any, idx: number) => typeof img === "string" ? `Image ${idx + 1}` : (img.title || `Image ${idx + 1}`);
            const getImageNote = (img: any) => typeof img === "string" ? "" : (img.note || "");
            const currentImg = savedImages[activePreviewImageIndex];
            const isCarousel = currentImg && currentImg.type === "carousel";

            return (
              <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="w-full flex justify-between items-center mb-4 text-white">
                  {isEditingImagePlayer ? (
                    <input
                      type="text"
                      value={editImageTitle}
                      onChange={e => setEditImageTitle(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-lg w-full max-w-lg focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <h3 className="text-white font-bold text-xl">{getImageTitle(currentImg, activePreviewImageIndex)}</h3>
                  )}
                  <button onClick={() => setActivePreviewImageIndex(null)} className="text-slate-400 hover:text-white p-2 transition-colors cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Main Preview Container with Carousel arrows */}
                <div className="relative w-full aspect-video md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group">
                  <img 
                    src={getImageUrl(currentImg)} 
                    alt={`Image preview ${activePreviewImageIndex}`} 
                    className="max-w-full max-h-full object-contain" 
                  />
                  
                  {/* Outer arrows: navigate gallery items (only if not editing and NOT on carousel slide navigation) */}
                  {savedImages.length > 1 && !isEditingImagePlayer && !isCarousel && (
                    <>
                      <button 
                        onClick={() => setActivePreviewImageIndex((prev) => (prev! - 1 + savedImages.length) % savedImages.length)} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition-all border border-slate-800/50 shadow-md cursor-pointer"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => setActivePreviewImageIndex((prev) => (prev! + 1) % savedImages.length)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition-all border border-slate-800/50 shadow-md cursor-pointer"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Inner Carousel arrows: navigate carousel urls */}
                  {isCarousel && currentImg.urls && currentImg.urls.length > 1 && !isEditingImagePlayer && (
                    <>
                      <button 
                        onClick={() => setActiveCarouselSlideIndex((prev) => (prev - 1 + currentImg.urls.length) % currentImg.urls.length)} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white rounded-full p-2 backdrop-blur-sm transition-all shadow-md cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setActiveCarouselSlideIndex((prev) => (prev + 1) % currentImg.urls.length)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white rounded-full p-2 backdrop-blur-sm transition-all shadow-md cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Dots inside the carousel */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {currentImg.urls.map((_: any, i: number) => (
                          <div 
                            key={i} 
                            onClick={() => setActiveCarouselSlideIndex(i)}
                            className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                              i === activeCarouselSlideIndex ? "bg-amber-400" : "bg-white/40 hover:bg-white/70"
                            }`} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Metadata and Description */}
                <div className="space-y-4 mt-5 text-left">
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Description</span>
                      {!isEditingImagePlayer && (
                        <button
                          onClick={() => {
                            if (!getImageNote(currentImg)) return;
                            navigator.clipboard.writeText(getImageNote(currentImg));
                            showToast("Description copied to clipboard!");
                          }}
                          disabled={!getImageNote(currentImg)}
                          className={`text-xs font-semibold flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg border ${
                            getImageNote(currentImg)
                              ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border-emerald-500/10 cursor-pointer"
                              : "text-slate-600 bg-slate-800/30 border-slate-800 cursor-not-allowed"
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      )}
                    </div>
                    
                    {isEditingImagePlayer ? (
                      <textarea
                        rows={3}
                        value={editImageNote}
                        onChange={e => setEditImageNote(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    ) : (
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {getImageNote(currentImg) || <span className="text-slate-500 italic">No description added to this image.</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    {isEditingImagePlayer ? (
                      <>
                        <button
                          onClick={() => setIsEditingImagePlayer(false)}
                          className="px-5 py-2.5 text-slate-400 font-semibold hover:text-white transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isSavingImagePlayerEdit || !editImageTitle}
                          onClick={async () => {
                            if (!editImageTitle) return;
                            setIsSavingImagePlayerEdit(true);
                            const updated = savedImages.map((v, i) => i === activePreviewImageIndex ? { ...v, title: editImageTitle, note: editImageNote } : v);
                            setSavedImages(updated);
                            await saveProjectData(undefined, undefined, undefined, undefined, updated);
                            setIsSavingImagePlayerEdit(false);
                            setIsEditingImagePlayer(false);
                            showToast("Image details updated!");
                          }}
                          className={`px-5 py-2.5 text-white rounded-xl font-bold transition-all text-sm shadow-lg flex items-center gap-2 ${
                            isSavingImagePlayerEdit ? "bg-emerald-800 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                          }`}
                        >
                          {isSavingImagePlayerEdit ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => setImageToDelete(currentImg)}
                          className="px-5 py-2.5 bg-red-950 hover:bg-red-900 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl font-bold text-sm transition-all"
                        >
                          Delete Image
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditImageTitle(getImageTitle(currentImg, activePreviewImageIndex!));
                            setEditImageNote(getImageNote(currentImg));
                            setIsEditingImagePlayer(true);
                          }}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition-all text-sm"
                        >
                          Edit Details
                        </button>

                        <button 
                          onClick={async () => {
                            if (isCarousel && currentImg.urls) {
                              currentImg.urls.forEach((url: string, i: number) => {
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `carousel-${getImageId(currentImg, activePreviewImageIndex!)}-${i}.jpg`;
                                a.target = "_blank";
                                a.click();
                              });
                            } else {
                              const a = document.createElement("a");
                              a.href = getImageUrl(currentImg);
                              a.download = `image-${getImageId(currentImg, activePreviewImageIndex!)}.jpg`;
                              a.target = "_blank";
                              a.click();
                            }

                            const updated = savedImages.map((item, i) => {
                              if (i === activePreviewImageIndex) {
                                return { ...item, downloadCount: getImageDownloadCount(item) + 1 };
                              }
                              return item;
                            });
                            setSavedImages(updated);
                            await saveProjectData(undefined, undefined, undefined, undefined, updated);
                            showToast("Image download started!");
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" /> Download ({getImageDownloadCount(currentImg)})
                        </button>
                        <button 
                          onClick={() => setActivePreviewImageIndex(null)} 
                          className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Add Image Modal */}
      {showAddImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isUploadingSingleImage && !isUploadingCarousel && setShowAddImage(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" /> 
                {imageUploadMode === "choice" ? "Add Image" : imageUploadMode === "single" ? "Single Image Upload" : "Create Carousel Post"}
              </h2>
              <button onClick={() => !isUploadingSingleImage && !isUploadingCarousel && setShowAddImage(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            {imageUploadMode === "choice" && !isUploadingImages && (
              <div className="flex flex-col gap-4 py-4">
                <button 
                  onClick={() => setImageUploadMode("single")}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-colors flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <Plus className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Single Upload</h3>
                    <p className="text-sm text-slate-400">Add a single image, name it, and add a description.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setImageUploadMode("carousel")}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-colors flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <Copy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Create Carousel</h3>
                    <p className="text-sm text-slate-400">Upload multiple images as a single grouped carousel post.</p>
                  </div>
                </button>

                <button 
                  onClick={() => multipleImageInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-6 text-left transition-colors flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <LayoutGrid className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Bulk Upload</h3>
                    <p className="text-sm text-slate-400">Select multiple image files and upload them as separate items.</p>
                  </div>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  ref={multipleImageInputRef} 
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setIsUploadingImages(true);
                      setUploadProgressImages(0);
                      const files = Array.from(e.target.files);
                      const newImages: any[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/uploads", { method: "POST", body: formData });
                          const data = await res.json();
                          if (data.success && data.url) {
                            newImages.push({
                              id: Date.now() + i,
                              url: data.url,
                              title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                              note: "",
                              downloadCount: 0
                            });
                          }
                        } catch (err) {
                          console.error(err);
                        }
                        setUploadProgressImages(Math.round(((i + 1) / files.length) * 100));
                      }
                      if (newImages.length > 0) {
                        const updated = [...savedImages, ...newImages];
                        setSavedImages(updated);
                        await saveProjectData(undefined, undefined, undefined, undefined, updated);
                        showToast(`${newImages.length} image(s) uploaded successfully!`);
                      }
                      setIsUploadingImages(false);
                      setShowAddImage(false);
                    }
                  }} 
                />
              </div>
            )}

            {isUploadingImages && imageUploadMode === "choice" && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Uploading Images...</h3>
                <p className="text-slate-400 text-sm mb-6">Please keep this window open.</p>
                <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgressImages}%` }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-emerald-400">{uploadProgressImages}% Complete</p>
              </div>
            )}

            {imageUploadMode === "single" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Image File</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          setIsUploadingSingleImage(true);
                          const file = e.target.files[0];
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/uploads", { method: "POST", body: formData });
                            const data = await res.json();
                            if (data.success && data.url) {
                              setImageFormUrl(data.url);
                              setImageFormTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                            }
                          } catch (err) {
                            console.error(err);
                          }
                          setIsUploadingSingleImage(false);
                        }
                      }}
                      disabled={isUploadingSingleImage}
                      className="hidden"
                      id="single-image-file-upload"
                    />
                    {imageFormUrl ? (
                      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700 aspect-video flex items-center justify-center">
                        <img src={imageFormUrl} alt="Preview" className="w-full h-full object-contain" />
                        <button onClick={() => setImageFormUrl("")} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="single-image-file-upload" className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl h-40 hover:border-emerald-500/50 hover:bg-slate-800/30 transition-colors cursor-pointer text-slate-500">
                        {isUploadingSingleImage ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                            <span className="text-xs font-medium text-slate-400">Uploading to server...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium text-slate-400">Choose Image File</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Image Name / Title</label>
                  <input
                    type="text"
                    value={imageFormTitle}
                    onChange={e => setImageFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="Enter name..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={imageFormNote}
                    onChange={e => setImageFormNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="Describe this image..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setImageUploadMode("choice");
                      setImageFormUrl("");
                      setImageFormTitle("");
                      setImageFormNote("");
                    }} 
                    className="px-5 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    disabled={!imageFormUrl || !imageFormTitle || isUploadingSingleImage || isSavingImage}
                    onClick={async () => {
                      setIsSavingImage(true);
                      const newImgObj = {
                        id: Date.now(),
                        url: imageFormUrl,
                        title: imageFormTitle,
                        note: imageFormNote,
                        downloadCount: 0
                      };
                      const updated = [...savedImages, newImgObj];
                      setSavedImages(updated);
                      await saveProjectData(undefined, undefined, undefined, undefined, updated);
                      setIsSavingImage(false);
                      showToast("Image added successfully!");
                      setShowAddImage(false);
                      setImageFormUrl("");
                      setImageFormTitle("");
                      setImageFormNote("");
                    }}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                      isSavingImage ? "bg-emerald-800 text-white cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isSavingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                      </>
                    ) : (
                      "Add Image"
                    )}
                  </button>
                </div>
              </div>
            )}

            {imageUploadMode === "carousel" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Upload Carousel Images</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setIsUploadingCarousel(true);
                          setUploadProgressImages(0);
                          const files = Array.from(e.target.files);
                          const uploadedUrls: string[] = [];
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            try {
                              const formData = new FormData();
                              formData.append("file", file);
                              const res = await fetch("/api/uploads", { method: "POST", body: formData });
                              const data = await res.json();
                              if (data.success && data.url) {
                                uploadedUrls.push(data.url);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                            setUploadProgressImages(Math.round(((i + 1) / files.length) * 100));
                          }
                          setCarouselUrls(prev => [...prev, ...uploadedUrls]);
                          setIsUploadingCarousel(false);
                        }
                      }}
                      disabled={isUploadingCarousel}
                      className="hidden"
                      id="carousel-files-upload"
                    />

                    {carouselUrls.length > 0 ? (
                      <div className="space-y-3">
                        <div className="relative aspect-video rounded-xl border border-slate-700 overflow-hidden bg-slate-950 flex items-center justify-center group">
                          <img src={carouselUrls[activeCarouselFormSlideIndex]} alt="Carousel slide" className="w-full h-full object-contain" />
                          <button 
                            onClick={() => {
                              const newUrls = carouselUrls.filter((_, i) => i !== activeCarouselFormSlideIndex);
                              setCarouselUrls(newUrls);
                              if (activeCarouselFormSlideIndex >= newUrls.length) {
                                setActiveCarouselFormSlideIndex(Math.max(0, newUrls.length - 1));
                              }
                            }} 
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-2 transition-colors shadow-md z-20 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          
                          {carouselUrls.length > 1 && (
                            <>
                              <button 
                                onClick={() => setActiveCarouselFormSlideIndex((prev) => (prev - 1 + carouselUrls.length) % carouselUrls.length)} 
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm transition-all z-10 cursor-pointer"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => setActiveCarouselFormSlideIndex((prev) => (prev + 1) % carouselUrls.length)} 
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm transition-all z-10 cursor-pointer"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                                {carouselUrls.map((_, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => setActiveCarouselFormSlideIndex(i)}
                                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-colors ${
                                      i === activeCarouselFormSlideIndex ? "bg-amber-400" : "bg-white/40 hover:bg-white/70"
                                    }`} 
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <label htmlFor="carousel-files-upload" className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg p-2 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer text-sm font-medium">
                          {isUploadingCarousel ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Uploading ({uploadProgressImages}%)...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" /> Add More Images
                            </>
                          )}
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="carousel-files-upload" className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl h-40 hover:border-amber-500/50 hover:bg-slate-800/30 transition-colors cursor-pointer text-slate-500">
                        {isUploadingCarousel ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                            <span className="text-xs font-medium text-slate-400">Uploading images ({uploadProgressImages}%) ...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium text-slate-400">Select Multiple Images for Carousel</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Carousel Name / Title</label>
                  <input
                    type="text"
                    value={carouselFormTitle}
                    onChange={e => setCarouselFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Enter post name..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={carouselFormNote}
                    onChange={e => setCarouselFormNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                    placeholder="Describe this carousel post..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setImageUploadMode("choice");
                      setCarouselUrls([]);
                      setCarouselFormTitle("");
                      setCarouselFormNote("");
                    }} 
                    className="px-5 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    disabled={carouselUrls.length === 0 || !carouselFormTitle || isUploadingCarousel || isSavingCarousel}
                    onClick={async () => {
                      setIsSavingCarousel(true);
                      const newCarouselObj = {
                        id: Date.now(),
                        type: 'carousel',
                        url: carouselUrls[0],
                        urls: carouselUrls,
                        title: carouselFormTitle,
                        note: carouselFormNote,
                        downloadCount: 0
                      };
                      const updated = [...savedImages, newCarouselObj];
                      setSavedImages(updated);
                      await saveProjectData(undefined, undefined, undefined, undefined, updated);
                      setIsSavingCarousel(false);
                      showToast("Carousel created successfully!");
                      setShowAddImage(false);
                      setCarouselUrls([]);
                      setCarouselFormTitle("");
                      setCarouselFormNote("");
                      setActiveCarouselFormSlideIndex(0);
                    }}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                      isSavingCarousel ? "bg-amber-800 text-white cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 text-white"
                    }`}
                  >
                    {isSavingCarousel ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      "Create Carousel"
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Project Details Modal */}
      {showEditProject && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !isSavingProject && setShowEditProject(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" /> Edit Project Details
              </h2>
              <button onClick={() => !isSavingProject && setShowEditProject(false)} className="text-slate-400 hover:text-white cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Campaign Name</label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={e => setEditProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Metaverse Survival Campaign"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Client / Brand</label>
                <input
                  type="text"
                  value={editProjectClient}
                  onChange={e => setEditProjectClient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Vibe Tech Inc."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Assigned Creator</label>
                <input
                  type="text"
                  value={editProjectCreator}
                  onChange={e => setEditProjectCreator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Ola"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={editProjectStatus}
                    onChange={e => setEditProjectStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Planning">Planning</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Budget</label>
                  <input
                    type="text"
                    value={editProjectBudget}
                    onChange={e => setEditProjectBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. $12,500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-slate-800">
              <button
                onClick={() => setShowEditProject(false)}
                disabled={isSavingProject}
                className="px-5 py-2.5 text-slate-400 hover:text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!editProjectName || isSavingProject}
                onClick={async () => {
                  setIsSavingProject(true);
                  try {
                    await fetch(`/api/creators/${id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: editProjectName,
                        client: editProjectClient,
                        creator: editProjectCreator,
                        status: editProjectStatus,
                        budget: editProjectBudget,
                        timeline,
                        titles,
                        contents,
                        videos: savedVideos,
                        images: savedImages,
                      })
                    });
                    setProject({ ...project, name: editProjectName, client: editProjectClient, creator: editProjectCreator, status: editProjectStatus, budget: editProjectBudget });
                    setShowEditProject(false);
                    showToast("Project details updated!");
                  } catch (err) {
                    showToast("Failed to save changes.", "error");
                  } finally {
                    setIsSavingProject(false);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  isSavingProject ? "bg-blue-800 cursor-not-allowed text-white" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                }`}
              >
                {isSavingProject ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[200]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-slate-900/90 border-green-500/20 text-green-400" 
                : "bg-slate-900/90 border-red-500/20 text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-semibold text-white">{toast.message}</span>
          </motion.div>
        </div>
      )}

    </div>
  );
}
