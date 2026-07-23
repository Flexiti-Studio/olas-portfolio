"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Video, Search, Filter, MoreVertical, Play, Image as ImageIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function ProjectContentsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 animate-pulse">
          {/* Header Navigation Skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-800 rounded w-48" />
            <div className="h-10 bg-slate-800 rounded-xl w-36" />
          </div>

          {/* Page Title Skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-slate-800 rounded w-96" />
            <div className="h-4 bg-slate-800 rounded w-[600px] max-w-full" />
          </div>

          {/* Toolbar Skeleton */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="h-10 bg-slate-950 rounded-xl w-full md:w-96" />
            <div className="h-10 bg-slate-950 rounded-xl w-36" />
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[320px] flex flex-col justify-between p-5 space-y-4">
                <div className="h-40 bg-slate-950 rounded-xl w-full" />
                <div className="space-y-2 flex-grow">
                  <div className="h-4 bg-slate-800 rounded w-16" />
                  <div className="h-6 bg-slate-800 rounded w-full" />
                  <div className="h-6 bg-slate-800 rounded w-2/3" />
                </div>
                <div className="h-4 bg-slate-800 rounded w-1/3 pt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const contents = (project?.contents as any[]) || [];
  const filteredContents = contents.filter((item: any) => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.details?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = Array.from(new Set(contents.map((c: any) => c.status).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push(`/admin/creators/${id}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Project Dashboard
          </button>
          
          <button 
            onClick={() => router.push(`/admin/creators/${id}?addContent=true`)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            New Content
          </button>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{project?.name || "Project"} Contents</h1>
          <p className="text-slate-400">Manage all deliverables, drafts, and published content for this campaign.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content by title or details..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-bold uppercase shrink-0">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {uniqueStatuses.map((status: any) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Section */}
        {contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
              <Video className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No content campaign created</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">There are no content ideas or drafts created for this project yet. Start by generating one now.</p>
            </div>
            <button 
              onClick={() => router.push(`/admin/creators/${id}?addContent=true`)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Content Campaign
            </button>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
            <p className="text-slate-500 text-sm">No items match your active search or filter query.</p>
            <button 
              onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }}
              className="text-blue-400 hover:text-blue-350 text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={content.id} 
                onClick={() => router.push(`/admin/creators/${id}/contents/${content.id}`)}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors group cursor-pointer"
              >
                {/* Thumbnail Placeholder */}
                <div className="h-40 bg-slate-950 relative overflow-hidden group-hover:bg-slate-800/50 transition-colors flex items-center justify-center">
                  {content.type === 'Video' || content.type === 'Short' ? (
                    <Play className="w-12 h-12 text-slate-800 group-hover:text-blue-500/50 transition-colors" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-slate-800 group-hover:text-emerald-500/50 transition-colors" />
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-[10px] font-bold text-white tracking-widest uppercase">
                    {content.type}
                  </div>
                </div>
                
                {/* Content Details */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(content.status)}`}>
                      {content.status}
                    </span>
                    <button className="text-slate-500 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-bold text-lg text-white leading-tight mb-4 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {content.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-4 mt-auto">
                    <span>{content.date || "Created Recently"}</span>
                    <span className="font-medium text-slate-400">{content.views || "-"} views</span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Add New Card */}
            <motion.div 
              onClick={() => router.push(`/admin/creators/${id}?addContent=true`)}
              className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px] hover:border-slate-600 hover:bg-slate-800/30 transition-colors cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-blue-500 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-slate-400 group-hover:text-white transition-colors">Add New Content</h3>
              <p className="text-xs text-slate-650 mt-2">Upload draft or video</p>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}
