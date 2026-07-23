"use client";

import React, { useState, useEffect } from "react";
import { Plus, Users, LayoutDashboard, Search, Briefcase, LayoutGrid, List as ListIcon, MoreVertical, DollarSign, Loader2, Upload, Copy, Check, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const GRADIENTS = [
  "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
  "bg-gradient-to-br from-blue-400 via-teal-400 to-emerald-400",
  "bg-gradient-to-br from-orange-400 via-red-400 to-rose-500",
  "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600",
  "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400",
];

export default function CreatorsManagerPage() {
  const router = useRouter();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [newName, setNewName] = useState("");
  const [newCreator, setNewCreator] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newBudget, setNewBudget] = useState("");

  // Bulk Upload State
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const JSON_TEMPLATE = `[
  {
    "name": "Summer Campaign",
    "creator": "John Doe",
    "client": "Nike",
    "budget": "$10,000"
  },
  {
    "name": "Tech Review",
    "creator": "Jane Smith",
    "client": "Logitech",
    "budget": "$5,000"
  }
]`;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/creators");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!newName || !newCreator) return;
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          creator: newCreator,
          client: newClient,
          budget: newBudget
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAddingProject(false);
        setNewName("");
        setNewCreator("");
        setNewClient("");
        setNewBudget("");
        router.push(`/admin/creators/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON_TEMPLATE);
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

  const handleSaveBulk = async () => {
    if (!bulkPreview) return;
    try {
      for (const item of bulkPreview) {
        await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name || "Untitled",
            creator: item.creator || "Unassigned",
            client: item.client || "N/A",
            budget: item.budget || "$0",
          }),
        });
      }
      await fetchProjects();
      setIsBulkUploading(false);
      setBulkJson("");
      setBulkPreview(null);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.client && p.client.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Creators Manager
            </h1>
            <p className="text-slate-400 mt-1">Manage creator campaigns, sponsorships, and project pipelines.</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsBulkUploading(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20 border border-slate-700"
            >
              <Upload className="w-5 h-5" />
              Bulk Upload
            </button>
            <button 
              onClick={() => setIsAddingProject(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-5 h-5" />
              Add Project
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 font-medium mb-1">Active Projects</h3>
            <p className="text-3xl font-bold text-white">{projects.filter(p => p.status === "In Progress" || p.status === "Planning").length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 font-medium mb-1">Total Creators</h3>
            <p className="text-3xl font-bold text-white">{new Set(projects.map(p => p.creator)).size}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 font-medium mb-1">Pending Deliverables</h3>
            <p className="text-3xl font-bold text-white">{projects.length}</p>
          </div>
        </div>

        {/* Main Content Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-slate-400" />
              Creator Projects
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..." 
                  className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500 w-64"
                />
              </div>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-1">
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === "grid" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* List View */}
          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Project Name</th>
                    <th className="px-6 py-4 font-medium">Client / Brand</th>
                    <th className="px-6 py-4 font-medium">Assigned Creator</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Budget</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading projects...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No projects found. Click "Add Project" to get started.
                      </td>
                    </tr>
                  ) : filteredProjects.map((p) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/creators/${p.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                      <td className="px-6 py-4 text-slate-300">{p.client}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-blue-200 text-xs font-bold">
                            {p.creator.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-300">{p.creator}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{p.budget}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 hover:text-white p-1">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid / Cards View */
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-slate-950/30">
              {isLoading ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading projects...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  No projects found. Click "Add Project" to get started.
                </div>
              ) : filteredProjects.map((p, index) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={p.id} 
                  onClick={() => router.push(`/admin/creators/${p.id}`)}
                  className={`aspect-square ${GRADIENTS[index % GRADIENTS.length]} hover:scale-[1.03] transition-transform duration-300 rounded-3xl p-6 flex flex-col group cursor-pointer shadow-2xl relative overflow-hidden`}
                >
                  {/* Glass/Dark overlay for contrast */}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-sm">
                        {p.status}
                      </span>
                      <button className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 p-1.5 rounded-full backdrop-blur-md">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mt-auto mb-6">
                      <h3 className="text-2xl font-extrabold text-white mb-1 leading-tight drop-shadow-md">{p.name}</h3>
                      <p className="text-sm font-medium text-white/90 drop-shadow-sm">{p.client}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xs font-extrabold border border-white/30 shadow-sm">
                          {p.creator.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-white drop-shadow-sm">{p.creator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white font-bold bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md shadow-sm">
                        <DollarSign className="w-3 h-3 opacity-70" />
                        {p.budget}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add Project Modal Placeholder */}
        {isAddingProject && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">Add New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Project Name *</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white" 
                    placeholder="e.g. Summer Campaign" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Assigned Creator *</label>
                  <input 
                    type="text" 
                    value={newCreator}
                    onChange={(e) => setNewCreator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white" 
                    placeholder="e.g. John Doe" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Client / Brand</label>
                    <input 
                      type="text" 
                      value={newClient}
                      onChange={(e) => setNewClient(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white" 
                      placeholder="e.g. Nike" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Budget</label>
                    <input 
                      type="text" 
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white" 
                      placeholder="e.g. $5,000" 
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsAddingProject(false)}
                    disabled={isSaving}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-md font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProject}
                    disabled={isSaving || !newName || !newCreator}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-md font-medium transition-colors flex justify-center items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Project
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Bulk Upload Modal */}
        {isBulkUploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkUploading(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-500" />
                Bulk Upload Campaigns
              </h2>
              <p className="text-slate-400 mb-6 text-sm">Paste an array of JSON objects to instantly create multiple campaigns.</p>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-300">JSON Payload</span>
                <button onClick={handleCopyTemplate} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors">
                  {copiedTemplate ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedTemplate ? 'Copied Template!' : 'Copy Template'}
                </button>
              </div>
              
              <textarea 
                value={bulkJson}
                onChange={(e) => { setBulkJson(e.target.value); setBulkError(""); }}
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-green-400 font-mono focus:outline-none focus:border-blue-500 transition-colors mb-4"
                placeholder="[\n  {\n    'name': 'Campaign',\n    ...\n  }\n]"
              />

              {bulkError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> {bulkError}</p>}

              {bulkPreview && (
                <div className="mb-6 flex-1 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400">
                        <th className="p-3 font-medium">Name</th>
                        <th className="p-3 font-medium">Creator</th>
                        <th className="p-3 font-medium">Client</th>
                        <th className="p-3 font-medium">Budget</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 text-slate-300">
                          <td className="p-3 font-medium text-white">{item.name || 'Untitled'}</td>
                          <td className="p-3">{item.creator}</td>
                          <td className="p-3">{item.client}</td>
                          <td className="p-3">{item.budget}</td>
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
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save {bulkPreview?.length ? `(${bulkPreview.length})` : ''} Campaigns
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
