import { useSceneworkStore } from "../store/useSceneworkStore";
import { generateScenesAction } from "../actions/generateScenes";
import { useState, useEffect } from "react";
import { Loader2, Wand2, Maximize, Layers } from "lucide-react";

export default function StoryView({ projectId }: { projectId: string }) {
  const { story, setStory, templateId, setTemplateId, setView, setScenes, scenes } = useSceneworkStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/video-templates?userId=${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.templates?.length > 0) {
          setTemplates(data.templates);
          const activeT = templateId ? data.templates.find((t: any) => t.id === templateId) : data.templates[0];
          if (!templateId && activeT) setTemplateId(activeT.id);
          
          if (activeT) {
            let needsUpdate = false;
            const updatedScenes = scenes.map(s => {
              if (!s.locked && s.templateId === activeT.id && (s.templateVersion || 1) < activeT.version && s.status !== 'stale') {
                needsUpdate = true;
                return { ...s, status: 'stale' as const };
              }
              return s;
            });
            if (needsUpdate) {
              setScenes(updatedScenes);
            }
          }
        }
      });
  }, [projectId, templateId, setTemplateId, scenes, setScenes]);

  const wordCount = story.trim() ? story.trim().split(/\s+/).length : 0;
  const estimatedLengthSec = Math.ceil(wordCount / 2.6);

  const handleBuildScenes = async () => {
    if (!story.trim() || !templateId) return;
    setIsGenerating(true);
    try {
      const scenes = await generateScenesAction({ story, templateId });
      setScenes(scenes);
      setView("scenes");
    } catch (err) {
      console.error(err);
      alert("Failed to build scenes.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Template Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Choose a Template</label>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplateId(t.id)}
              className={`flex-shrink-0 flex flex-col text-left p-4 rounded-2xl border min-w-[240px] transition-all cursor-pointer ${
                templateId === t.id 
                  ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.2)]" 
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold text-sm ${templateId === t.id ? 'text-indigo-400' : 'text-white'}`}>{t.name}</span>
              </div>
              <span className="text-xs text-slate-400 line-clamp-1 mb-3">{t.description || "No description"}</span>
              <div className="flex gap-2 text-[10px] font-semibold text-slate-500 mt-auto">
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded"><Maximize className="w-3 h-3" /> {t.data?.format || '16:9'}</span>
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded"><Layers className="w-3 h-3" /> {t.data?.structure?.length || 0} Beats</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleBuildScenes}
          disabled={isGenerating || !story.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          Build scenes
        </button>
      </div>

      {/* Editor */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-sm">
        <textarea
          value={story}
          onChange={e => setStory(e.target.value)}
          placeholder="Paste your finished story here..."
          className="w-full min-h-[500px] bg-transparent text-xl md:text-2xl font-serif leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none resize-none"
          style={{ fontFamily: "'Newsreader', serif" }}
        />
        
        <div className="absolute bottom-6 right-8 flex items-center gap-4 text-sm font-medium text-slate-400 bg-slate-800 px-4 py-2 rounded-full border border-slate-700 shadow-sm">
          <span>{wordCount} words</span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span>~{estimatedLengthSec}s spoken</span>
        </div>
      </div>
    </div>
  );
}
