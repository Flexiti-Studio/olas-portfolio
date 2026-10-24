import { useState } from 'react';
import { useSceneworkStore } from '../../store/useSceneworkStore';
import { X, Lock, Unlock, Image as ImageIcon, Video, Copy, SlidersHorizontal, AudioLines, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';

export function SceneDialog({ sceneId, onClose, onNavigate }: { sceneId: string, onClose: () => void, onNavigate: (id: string) => void }) {
  const { scenes, updateScene } = useSceneworkStore();
  const scene = scenes.find(s => s.id === sceneId);
  const currentIndex = scenes.findIndex(s => s.id === sceneId);
  
  const [activeTab, setActiveTab] = useState<'visual' | 'voice' | 'sync'>('visual');

  if (!scene) return null;

  const estimatedVoiceSec = Math.ceil(scene.script.split(/\s+/).length / 2.6);
  const diff = scene.clipSec - estimatedVoiceSec;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* LEFT PANEL: Preview & Source */}
        <div className="w-full md:w-[45%] bg-slate-950 border-r border-slate-800 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Scene {scene.order + 1}</div>
              <h2 className="text-2xl font-black text-slate-200">{scene.role}</h2>
            </div>
            <button 
              onClick={() => updateScene(scene.id, { locked: !scene.locked })}
              className={`p-2 rounded-xl transition-colors border ${scene.locked ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
            >
              {scene.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
          </div>

          <div className="aspect-video bg-gradient-to-br from-indigo-900/20 to-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden border border-slate-800/50">
             <span className="text-6xl font-black text-indigo-500/10">{scene.order + 1}</span>
             <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md">
               {scene.clipSec}s
             </span>
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Source Beat</div>
            <p className="text-lg font-serif text-slate-300 leading-relaxed">"{scene.beat}"</p>
          </div>
        </div>

        {/* RIGHT PANEL: Editor Tabs */}
        <div className="w-full md:w-[55%] flex flex-col bg-slate-900 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          <div className="flex px-8 pt-8 border-b border-slate-800">
            {(['visual', 'voice', 'sync'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {/* VISUAL TAB */}
            {activeTab === 'visual' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-1 flex">
                    <button 
                      onClick={() => updateScene(scene.id, { mode: 'video' })}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${scene.mode === 'video' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      <Video className="w-4 h-4" /> Video
                    </button>
                    <button 
                      onClick={() => updateScene(scene.id, { mode: 'image' })}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${scene.mode === 'image' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                      <ImageIcon className="w-4 h-4" /> Image
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Shot Type</label>
                    <select 
                      value={scene.shot}
                      onChange={e => updateScene(scene.id, { shot: e.target.value, status: 'edited' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-300 focus:border-indigo-500 outline-none"
                    >
                      {['wide', 'medium', 'close-up', 'over-the-shoulder', 'aerial', 'macro'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Camera Move</label>
                    <select 
                      value={scene.camera}
                      onChange={e => updateScene(scene.id, { camera: e.target.value, status: 'edited' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-300 focus:border-indigo-500 outline-none"
                    >
                      {['push-in', 'static', 'pan', 'handheld', 'tracking', 'pull-back'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visual Prompt</label>
                  <textarea 
                    value={scene.visualPrompt}
                    onChange={e => updateScene(scene.id, { visualPrompt: e.target.value, status: 'edited' })}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Negative Prompt</label>
                  <input 
                    type="text"
                    value={scene.negativePrompt}
                    onChange={e => updateScene(scene.id, { negativePrompt: e.target.value, status: 'edited' })}
                    placeholder="Things to avoid..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none placeholder-slate-600"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                    <Wand2 className="w-4 h-4" /> Rewrite from shot
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-800/50">
                    <Copy className="w-4 h-4" /> Copy Prompt
                  </button>
                </div>
              </div>
            )}

            {/* VOICE TAB */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voiceover Script</label>
                  <textarea 
                    value={scene.script}
                    onChange={e => updateScene(scene.id, { script: e.target.value, status: 'edited' })}
                    rows={6}
                    className="w-full bg-teal-950/30 border border-teal-900/50 rounded-xl p-4 text-lg font-serif text-teal-100 leading-relaxed focus:border-teal-700 outline-none resize-none"
                  />
                  <div className="text-right mt-2 text-xs font-bold text-teal-500">~{estimatedVoiceSec}s spoken length</div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Persona</label>
                    <input 
                      type="text"
                      value={scene.persona}
                      onChange={e => updateScene(scene.id, { persona: e.target.value, status: 'edited' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tone</label>
                    <input 
                      type="text"
                      value={scene.tone}
                      onChange={e => updateScene(scene.id, { tone: e.target.value, status: 'edited' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pace</label>
                    <select 
                      value={scene.pace}
                      onChange={e => updateScene(scene.id, { pace: e.target.value as any, status: 'edited' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-200 outline-none"
                    >
                      {['Slow', 'Normal', 'Fast'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-teal-400 bg-teal-900/30 hover:bg-teal-900/50 rounded-lg transition-colors border border-teal-800/50">
                    <Copy className="w-4 h-4" /> Copy script & settings
                  </button>
                </div>
              </div>
            )}

            {/* SYNC TAB */}
            {activeTab === 'sync' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-6">Timing Alignment</h3>
                  
                  <div className="space-y-4 relative">
                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-bold text-slate-500 flex items-center gap-2"><AudioLines className="w-4 h-4 text-teal-500"/> Voice</div>
                      <div className="flex-1 h-8 bg-slate-950 rounded-md relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 left-0 bottom-0 bg-teal-500/80 rounded-md" style={{ width: `${Math.min(100, (estimatedVoiceSec / Math.max(15, scene.clipSec)) * 100)}%` }} />
                      </div>
                      <div className="w-12 text-sm font-bold text-slate-300 text-right">{estimatedVoiceSec}s</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-24 text-sm font-bold text-slate-500 flex items-center gap-2"><Video className="w-4 h-4 text-indigo-500"/> Clip</div>
                      <div className="flex-1 h-8 bg-slate-950 rounded-md relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 left-0 bottom-0 bg-indigo-500/80 rounded-md" style={{ width: `${Math.min(100, (scene.clipSec / Math.max(15, scene.clipSec)) * 100)}%` }} />
                      </div>
                      <div className="w-12 text-sm font-bold text-slate-300 text-right">{scene.clipSec}s</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                    <SlidersHorizontal className="w-5 h-5 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {diff === 0 ? "Perfect match! The clip and voiceover are the same length." :
                         diff > 0 ? `The clip has ${diff} seconds of silence at the end.` :
                         `The voice runs ${Math.abs(diff)} seconds past the clip.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Clip Length Override (Seconds)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="2" max="15" step="1"
                      value={scene.clipSec}
                      onChange={e => updateScene(scene.id, { clipSec: parseInt(e.target.value), status: 'edited' })}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="font-bold text-indigo-400 w-8 text-right">{scene.clipSec}s</span>
                  </div>
                  
                  <button 
                    onClick={() => updateScene(scene.id, { clipSec: estimatedVoiceSec, status: 'edited' })}
                    className="mt-4 text-sm font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    Match clip to voice
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Music / Sound Cue</label>
                  <input 
                    type="text"
                    value={scene.soundCue || ''}
                    onChange={e => updateScene(scene.id, { soundCue: e.target.value, status: 'edited' })}
                    placeholder="e.g. Bass drop, whoosh, upbeat tempo starts..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:border-indigo-500 outline-none placeholder-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 flex justify-between bg-slate-950">
            <button 
              onClick={() => currentIndex > 0 && onNavigate(scenes[currentIndex - 1].id)}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Scene
            </button>
            <button 
              onClick={() => currentIndex < scenes.length - 1 && onNavigate(scenes[currentIndex + 1].id)}
              disabled={currentIndex === scenes.length - 1}
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next Scene <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
