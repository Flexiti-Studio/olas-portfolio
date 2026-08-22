"use client";

import { useState } from "react";
import { FocusedProjectCard } from "./components/FocusedProjectCard";
import { ProjectQueueList } from "./components/ProjectQueueList";
import { ProjectCompleteModal } from "./components/ProjectCompleteModal";
import { SwitchConfirmModal } from "./components/SwitchConfirmModal";
import { NewProjectForm } from "./components/NewProjectForm";
import { Loader2 } from "lucide-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  },
});

function FocusModePageContent() {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [switchConfirmData, setSwitchConfirmData] = useState<{ projectId: string, incompleteCount: number } | null>(null);

  const { data, isLoading: loading, refetch: fetchProjects } = useQuery({
    queryKey: ["focus-projects"],
    queryFn: async () => {
      const res = await fetch("/api/focus/projects");
      const json = await res.json();
      return json.data;
    }
  });

  const projects = data?.projects || [];
  const focusedProjectId = data?.focusedProjectId || null;

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
          setSwitchConfirmData({ projectId, incompleteCount: json.data.incompleteCount });
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

  const focusedProject = projects.find((p: any) => p.id === focusedProjectId);
  const queue = projects.filter((p: any) => p.id !== focusedProjectId);

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
              onProjectUpdate={fetchProjects}
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

      <SwitchConfirmModal
        isOpen={!!switchConfirmData}
        incompleteCount={switchConfirmData?.incompleteCount || 0}
        onCancel={() => setSwitchConfirmData(null)}
        onConfirm={() => {
          if (switchConfirmData) {
            handleSwitchFocus(switchConfirmData.projectId, true);
            setSwitchConfirmData(null);
          }
        }}
      />
      
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

export default function FocusModePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FocusModePageContent />
    </QueryClientProvider>
  );
}
