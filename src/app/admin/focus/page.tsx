"use client";

import { useState, useEffect } from "react";
import { FocusedProjectCard } from "./components/FocusedProjectCard";
import { ProjectQueueList } from "./components/ProjectQueueList";
import { ProjectCompleteModal } from "./components/ProjectCompleteModal";
import { NewProjectForm } from "./components/NewProjectForm";
import { Loader2 } from "lucide-react";

export default function FocusModePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/focus/projects");
      const json = await res.json();
      if (json.success) {
        setProjects(json.data.projects);
        setFocusedProjectId(json.data.focusedProjectId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSwitchFocus = async (projectId: string, force = false) => {
    try {
      const res = await fetch("/api/focus/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, force })
      });
      const json = await res.json();
      
      if (json.success) {
        if (json.data.requiresConfirmation) {
          if (confirm(`Current project has ${json.data.incompleteCount} incomplete tasks. Switch anyway?`)) {
            await handleSwitchFocus(projectId, true);
          }
        } else {
          await fetchProjects();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProjectComplete = () => {
    setShowCompleteModal(true);
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const focusedProject = projects.find(p => p.id === focusedProjectId);
  const queue = projects.filter(p => p.id !== focusedProjectId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Focus Mode</h1>
          <NewProjectForm onCreated={fetchProjects} hasFocusedProject={!!focusedProject} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {focusedProject ? (
              <FocusedProjectCard 
                project={focusedProject} 
                onProjectUpdate={fetchProjects}
                onProjectComplete={handleProjectComplete}
              />
            ) : (
              <div className="p-12 bg-slate-900 rounded-xl border border-slate-800 text-center">
                <h2 className="text-xl font-medium text-slate-300 mb-2">Nothing is focused right now.</h2>
                <p className="text-slate-500">Create a new project or select one from the queue to start focusing.</p>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-slate-400">Queue</h2>
            <ProjectQueueList 
              projects={queue} 
              onSwitchFocus={(id) => handleSwitchFocus(id)}
              isFocusedEmpty={!focusedProject}
            />
          </div>
        </div>
      </div>

      {showCompleteModal && (
        <ProjectCompleteModal 
          onClose={() => setShowCompleteModal(false)} 
          onPickNext={(id) => {
            setShowCompleteModal(false);
            handleSwitchFocus(id);
          }}
          queue={queue}
        />
      )}
    </div>
  );
}
