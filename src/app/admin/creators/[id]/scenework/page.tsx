"use client";

import { useSceneworkStore } from "./store/useSceneworkStore";
import HeaderSwitch from "./components/HeaderSwitch";
import StoryView from "./components/StoryView";
import ScenesView from "./components/ScenesView";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SceneworkPage() {
  const { view, setStory, story } = useSceneworkStore();
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  const [isLoadingVideo, setIsLoadingVideo] = useState(!!videoId && !story);

  useEffect(() => {
    if (videoId && !story) {
      fetch(`/api/creators/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.project && data.project.contents) {
            const video = data.project.contents.find((v: any) => v.id === videoId);
            if (video && video.story) {
              setStory(video.story);
            }
          }
        })
        .finally(() => setIsLoadingVideo(false));
    }
  }, [id, videoId, story, setStory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="w-[95%] mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.push(`/admin/creators/${id}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Project
          </button>
          
          <h1 className="text-2xl font-black tracking-tight">Scenework</h1>
          
          <div className="w-24"></div> {/* spacer */}
        </div>

        <HeaderSwitch />

        <div className="mt-8 transition-opacity duration-300">
          {isLoadingVideo ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : view === 'story' ? (
            <StoryView projectId={id as string} />
          ) : (
            <ScenesView />
          )}
        </div>
      </div>
    </div>
  );
}
