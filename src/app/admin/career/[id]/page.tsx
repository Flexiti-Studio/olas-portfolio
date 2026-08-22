"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Target, Trophy, Milestone, Code, Calendar, CheckCircle2, CircleDashed, Clock, Sparkles, Edit2, X, Plus, Trash2, Save, Copy, Check, GraduationCap, Award, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from "@hello-pangea/dnd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const queryClient = new QueryClient();

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

function DataEditorModal({ 
  isOpen, 
  onClose, 
  title, 
  type, 
  initialData, 
  onSave,
  isPending
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  type: "skills" | "timeline" | "education" | "certification", 
  initialData: any[], 
  onSave: (data: any[]) => void,
  isPending: boolean
}) {
  const [activeTab, setActiveTab] = useState<"manual" | "json">("manual");
  const [items, setItems] = useState<any[]>(initialData || []);
  const [jsonText, setJsonText] = useState(JSON.stringify(initialData || [], null, 2));
  const [jsonError, setJsonError] = useState("");
  const [copiedFormat, setCopiedFormat] = useState(false);

  if (!isOpen) return null;

  const handleCopyFormat = () => {
    const format = type !== "timeline" 
      ? '[\n  {\n    "name": "React",\n    "status": "have",\n    "desc": "3 years experience"\n  }\n]' 
      : '[\n  {\n    "title": "Phase 1",\n    "date": "Jan 2024",\n    "status": "completed",\n    "desc": "Did stuff"\n  }\n]';
    navigator.clipboard.writeText(format);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        setItems(parsed);
        setJsonError("");
      } else {
        setJsonError("JSON must be an array.");
      }
    } catch (e) {
      setJsonError("Invalid JSON format.");
    }
  };

  const handleManualChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    setJsonText(JSON.stringify(newItems, null, 2));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setJsonText(JSON.stringify(newItems, null, 2));
  };

  const addItem = () => {
    const newItem = type !== "timeline" 
      ? { name: "", status: "need" } 
      : { title: "", date: "", status: "upcoming", desc: "" };
    const newItems = [...items, newItem];
    setItems(newItems);
    setJsonText(JSON.stringify(newItems, null, 2));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit {title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6 p-1 bg-zinc-900 rounded-lg">
          <button 
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "manual" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Manual Entry
          </button>
          <button 
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "json" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Raw JSON
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "json" ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs text-zinc-400">Paste a JSON array of objects.</p>
                <button 
                  onClick={handleCopyFormat}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded-md"
                >
                  {copiedFormat ? <Check size={12} /> : <Copy size={12} />}
                  {copiedFormat ? "Copied!" : "Copy Example JSON"}
                </button>
              </div>
              <textarea 
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="w-full flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-zinc-700 min-h-[300px]"
                spellCheck={false}
              />
              {jsonError && <p className="text-red-400 text-sm mt-2">{jsonError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3 relative group"
                  >
                    {type !== "timeline" ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                          <input 
                            type="text"
                            value={item.name || ""}
                            onChange={(e) => handleManualChange(index, "name", e.target.value)}
                            placeholder={type === "education" ? "Degree/Course (e.g. BSc CS)" : type === "certification" ? "Certification (e.g. AWS)" : "Skill Name (e.g. React.js)"}
                            className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
                          />
                          <select 
                            value={item.status || "need"}
                            onChange={(e) => handleManualChange(index, "status", e.target.value)}
                            className="w-full md:w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 shrink-0"
                          >
                            <option value="have">Acquired</option>
                            <option value="progress">In Progress</option>
                            <option value="need">Target</option>
                          </select>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 flex items-center justify-center shrink-0"
                            title={`Remove ${type === "education" ? "Education" : type === "certification" ? "Certification" : "Skill"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <input 
                          type="text"
                          value={item.desc || ""}
                          onChange={(e) => handleManualChange(index, "desc", e.target.value)}
                          placeholder={`${type === "education" ? "Education" : type === "certification" ? "Certification" : "Skill"} details/notes (optional)`}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                          <input 
                            type="text"
                            value={item.title || ""}
                            onChange={(e) => handleManualChange(index, "title", e.target.value)}
                            placeholder="Stage Title"
                            className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
                          />
                          <input 
                            type="text"
                            value={item.date || ""}
                            onChange={(e) => handleManualChange(index, "date", e.target.value)}
                            placeholder="Date"
                            className="w-full md:w-28 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 shrink-0"
                          />
                          <select 
                            value={item.status || "upcoming"}
                            onChange={(e) => handleManualChange(index, "status", e.target.value)}
                            className="w-full md:w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 shrink-0"
                          >
                            <option value="completed">Completed</option>
                            <option value="current">Current</option>
                            <option value="upcoming">Upcoming</option>
                          </select>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 flex items-center justify-center shrink-0"
                            title="Remove Stage"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <input 
                          type="text"
                          value={item.desc || ""}
                          onChange={(e) => handleManualChange(index, "desc", e.target.value)}
                          placeholder="Short description (optional)"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button 
                onClick={addItem}
                className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={16} /> Add New {type === "skills" ? "Skill" : type === "education" ? "Education" : type === "certification" ? "Certification" : "Stage"}
              </button>
            </div>
          )}
        </div>

        <div className="pt-6 mt-6 border-t border-zinc-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => !jsonError && onSave(items)}
            disabled={!!jsonError || isPending}
            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SkillDetailsModal({ skill, onClose }: { skill: any, onClose: () => void }) {
  if (!skill) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white pr-4">{skill.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-zinc-400 mb-6 whitespace-pre-wrap leading-relaxed">
          {skill.desc || "No additional details or notes provided yet."}
        </p>
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors font-semibold text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BasicInfoEditorModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  isPending
}: {
  isOpen: boolean,
  onClose: () => void,
  initialData: any,
  onSave: (data: any) => void,
  isPending: boolean
}) {
  const [title, setTitle] = useState(initialData.title || "");
  const [category, setCategory] = useState(initialData.category || "Goal");
  const [status, setStatus] = useState(initialData.status || "Planned");
  const [date, setDate] = useState(initialData.date || "");
  const [description, setDescription] = useState(initialData.description || "");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl shadow-xl w-full max-w-lg flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit Entry Details</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1 block">Title</label>
            <input 
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 font-medium mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700">
                <option value="Goal">Goal</option>
                <option value="Achievement">Achievement</option>
                <option value="Milestone">Milestone</option>
                <option value="Skill">Skill</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 font-medium mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700">
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Achieved">Achieved</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1 block">Target / Completion Date</label>
            <input 
              type="text" value={date} onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. Jan 2024 or 2024-05-12"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1 block">Description & Notes</label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 min-h-[120px]"
            />
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors font-medium text-sm">
            Cancel
          </button>
          <button 
            onClick={() => onSave({ title, category, status, date, description })}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CareerDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [isEditingCertifications, setIsEditingCertifications] = useState(false);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedSkillForDetails, setSelectedSkillForDetails] = useState<any>(null);

  const [pageHave, setPageHave] = useState(1);
  const [pageProgress, setPageProgress] = useState(1);
  const [pageNeed, setPageNeed] = useState(1);

  const [eduPageHave, setEduPageHave] = useState(1);
  const [eduPageProgress, setEduPageProgress] = useState(1);
  const [eduPageNeed, setEduPageNeed] = useState(1);

  const [certPageHave, setCertPageHave] = useState(1);
  const [certPageProgress, setCertPageProgress] = useState(1);
  const [certPageNeed, setCertPageNeed] = useState(1);

  const ITEMS_PER_PAGE = 5;

  const { data: career, isLoading } = useQuery({
    queryKey: ["career", id],
    queryFn: async () => {
      const res = await fetch(`/api/career/${id}?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch career details");
      const data = await res.json();
      return data.career;
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/career/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update career");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["career", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-zinc-950 min-h-screen p-4 md:p-8">
        <div className="flex flex-col w-full max-w-[1400px] mx-auto animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-8 border-b border-zinc-800 pb-6">
            <div className="w-48 h-5 bg-zinc-700/60 rounded mb-6" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-zinc-700/60 rounded-2xl" />
              <div className="space-y-3">
                <div className="w-32 h-5 bg-zinc-700/60 rounded" />
                <div className="w-64 h-10 bg-zinc-700/60 rounded" />
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Details Block */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 h-64" />
              {/* Skills Block */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 h-96" />
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              {/* Timeline Info Block */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-32" />
              {/* Timeline Stages Block */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!career) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Entry Not Found</h2>
        <p className="text-zinc-400 mb-6">The career entry you are looking for does not exist.</p>
        <button
          onClick={() => router.push("/admin/career")}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Careers</span>
        </button>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Goal": return <Target size={24} className="text-blue-400" />;
      case "Achievement": return <Trophy size={24} className="text-yellow-400" />;
      case "Milestone": return <Milestone size={24} className="text-purple-400" />;
      case "Skill": return <Code size={24} className="text-emerald-400" />;
      default: return <Target size={24} className="text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Achieved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "In Progress": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Planned": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const skills = Array.isArray(career.skills) && career.skills.length > 0 
    ? career.skills 
    : [];

  const education = Array.isArray(career.education) && career.education.length > 0 
    ? career.education 
    : [];

  const certifications = Array.isArray(career.certifications) && career.certifications.length > 0 
    ? career.certifications 
    : [];

  const timeline = Array.isArray(career.timeline) && career.timeline.length > 0
    ? career.timeline
    : [];

  const handleSaveSkills = (newSkills: any[]) => {
    mutation.mutate({ skills: newSkills }, {
      onSuccess: () => setIsEditingSkills(false)
    });
  };

  const handleSaveEducation = (newEducation: any[]) => {
    mutation.mutate({ education: newEducation }, {
      onSuccess: () => setIsEditingEducation(false)
    });
  };

  const handleSaveCertifications = (newCertifications: any[]) => {
    mutation.mutate({ certifications: newCertifications }, {
      onSuccess: () => setIsEditingCertifications(false)
    });
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const [type, indexStr] = draggableId.split("-");
    const originalIndex = parseInt(indexStr, 10);
    const destStatus = destination.droppableId.split("-")[1];

    let currentArray: any[] = [];
    if (type === "skills") currentArray = [...skills];
    else if (type === "education") currentArray = [...education];
    else if (type === "certification") currentArray = [...certifications];

    if (currentArray[originalIndex]) {
      currentArray[originalIndex].status = destStatus;
      if (type === "skills") handleSaveSkills(currentArray);
      else if (type === "education") handleSaveEducation(currentArray);
      else if (type === "certification") handleSaveCertifications(currentArray);
    }
  };

  const handleSaveTimeline = (newTimeline: any[]) => {
    mutation.mutate({ timeline: newTimeline }, {
      onSuccess: () => setIsEditingTimeline(false)
    });
  };

  const handleSaveDetails = (newData: any) => {
    mutation.mutate(newData, {
      onSuccess: () => setIsEditingDetails(false)
    });
  };

  const normalizeStatus = (status: any) => {
    if (!status || typeof status !== 'string') return "need";
    const s = status.toLowerCase().trim();
    if (s === "have" || s === "acquired" || s === "completed" || s === "done") return "have";
    if (s === "progress" || s === "in progress" || s === "current") return "progress";
    return "need";
  };

  const skillsWithIndex = skills.map((s: any, idx: number) => ({ ...s, _originalIndex: idx }));
  const haveSkills = skillsWithIndex.filter((s: any) => normalizeStatus(s.status) === "have");
  const progressSkills = skillsWithIndex.filter((s: any) => normalizeStatus(s.status) === "progress");
  const needSkills = skillsWithIndex.filter((s: any) => normalizeStatus(s.status) === "need");

  const educationWithIndex = education.map((s: any, idx: number) => ({ ...s, _originalIndex: idx }));
  const haveEducation = educationWithIndex.filter((s: any) => normalizeStatus(s.status) === "have");
  const progressEducation = educationWithIndex.filter((s: any) => normalizeStatus(s.status) === "progress");
  const needEducation = educationWithIndex.filter((s: any) => normalizeStatus(s.status) === "need");

  const certificationsWithIndex = certifications.map((s: any, idx: number) => ({ ...s, _originalIndex: idx }));
  const haveCertifications = certificationsWithIndex.filter((s: any) => normalizeStatus(s.status) === "have");
  const progressCertifications = certificationsWithIndex.filter((s: any) => normalizeStatus(s.status) === "progress");
  const needCertifications = certificationsWithIndex.filter((s: any) => normalizeStatus(s.status) === "need");

  const renderSkillList = (
    list: any[], 
    page: number, 
    setPage: (p: number) => void, 
    colorClass: string, 
    bgClass: string,
    emptyMessage: string,
    droppableId: string,
    type: string
  ) => {
    const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
    const paginatedList = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
      <div className="flex flex-col h-full">
        <StrictModeDroppable droppableId={droppableId}>
          {(provided) => (
            <ul 
              className="space-y-2 flex-1 min-h-[100px]"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {paginatedList.map((s: any, i: number) => {
                 const actualIndex = (page - 1) * ITEMS_PER_PAGE + i + 1;
                 const draggableId = `${type}-${s._originalIndex}`;
                 return (
                   <Draggable key={draggableId} draggableId={draggableId} index={i}>
                     {(provided, snapshot) => (
                       <li
                         ref={provided.innerRef}
                         {...provided.draggableProps}
                         {...provided.dragHandleProps}
                         className={`rounded-lg mb-2 ${snapshot.isDragging ? "opacity-90 shadow-2xl scale-[1.02] z-50 relative ring-2 ring-white/20 bg-zinc-900" : ""}`}
                         style={provided.draggableProps.style}
                       >
                         <button 
                           onClick={() => setSelectedSkillForDetails(s)}
                           className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 border hover:opacity-80 transition-opacity ${bgClass}`}
                         >
                           <div className="flex items-center gap-2 overflow-hidden">
                             <GripVertical size={14} className="text-zinc-500 shrink-0 mr-1 opacity-50 cursor-grab" />
                             <span className={`font-bold opacity-70 shrink-0 ${colorClass}`}>{actualIndex}.</span>
                             <span className={`font-medium truncate ${colorClass}`}>{s.name}</span>
                           </div>
                         </button>
                       </li>
                     )}
                   </Draggable>
                 );
              })}
              {provided.placeholder}
              {list.length === 0 && <p className="text-xs text-zinc-500 italic mt-2 text-center pointer-events-none">{emptyMessage}</p>}
            </ul>
          )}
        </StrictModeDroppable>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
            <button 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-950 text-white min-h-screen p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col w-full max-w-[1400px] mx-auto"
      >
        <div className="mb-8 border-b border-zinc-800 pb-6">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 group w-fit"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Admin Dashboard</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-inner">
                {getCategoryIcon(career.category)}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-medium text-zinc-400 tracking-wide uppercase">
                    {career.category}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getStatusColor(career.status)}`}>
                    {career.status}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {career.title}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm relative group">
              <button 
                onClick={() => setIsEditingDetails(true)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit Details"
              >
                <Edit2 size={16} />
              </button>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4 pr-10">Details & Notes</h2>
              {career.description ? (
                <div className="relative">
                  <div className={`prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed transition-all duration-300 whitespace-pre-wrap ${!isDescriptionExpanded ? "max-h-[300px] overflow-hidden" : ""}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {career.description}
                    </ReactMarkdown>
                  </div>
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                  )}
                  <button 
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    {isDescriptionExpanded ? "Show Less" : "Read More"}
                  </button>
                </div>
              ) : (
                <p className="text-zinc-500 italic">No additional notes provided for this entry.</p>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm relative group">
              <button 
                onClick={() => setIsEditingSkills(true)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit Skills"
              >
                <Edit2 size={16} />
              </button>

              <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4 pr-10">
                <Sparkles size={20} className="text-purple-400" />
                <h2 className="text-xl font-bold text-white">Skills Tracker</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Have */}
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} /> Acquired
                  </h3>
                  {renderSkillList(haveSkills, pageHave, setPageHave, "text-emerald-400", "bg-emerald-500/10 border-emerald-500/20", "None yet.", "skills-have", "skills")}
                </div>

                {/* In Progress */}
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <CircleDashed size={16} /> In Progress
                  </h3>
                  {renderSkillList(progressSkills, pageProgress, setPageProgress, "text-blue-400", "bg-blue-500/10 border-blue-500/20", "None currently.", "skills-progress", "skills")}
                </div>

                {/* Need */}
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                    <Target size={16} /> Target
                  </h3>
                  {renderSkillList(needSkills, pageNeed, setPageNeed, "text-yellow-400", "bg-yellow-500/10 border-yellow-500/20 border-dashed", "No targets set.", "skills-need", "skills")}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm relative group">
              <button 
                onClick={() => setIsEditingEducation(true)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit Education"
              >
                <Edit2 size={16} />
              </button>

              <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4 pr-10">
                <GraduationCap size={20} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">Education Tracker</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} /> Acquired
                  </h3>
                  {renderSkillList(haveEducation, eduPageHave, setEduPageHave, "text-emerald-400", "bg-emerald-500/10 border-emerald-500/20", "None yet.", "education-have", "education")}
                </div>
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <CircleDashed size={16} /> In Progress
                  </h3>
                  {renderSkillList(progressEducation, eduPageProgress, setEduPageProgress, "text-blue-400", "bg-blue-500/10 border-blue-500/20", "None currently.", "education-progress", "education")}
                </div>
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                    <Target size={16} /> Target
                  </h3>
                  {renderSkillList(needEducation, eduPageNeed, setEduPageNeed, "text-yellow-400", "bg-yellow-500/10 border-yellow-500/20 border-dashed", "No targets set.", "education-need", "education")}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm relative group">
              <button 
                onClick={() => setIsEditingCertifications(true)}
                className="absolute top-6 right-6 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit Certifications"
              >
                <Edit2 size={16} />
              </button>

              <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4 pr-10">
                <Award size={20} className="text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Certifications Tracker</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} /> Acquired
                  </h3>
                  {renderSkillList(haveCertifications, certPageHave, setCertPageHave, "text-emerald-400", "bg-emerald-500/10 border-emerald-500/20", "None yet.", "certification-have", "certification")}
                </div>
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <CircleDashed size={16} /> In Progress
                  </h3>
                  {renderSkillList(progressCertifications, certPageProgress, setCertPageProgress, "text-blue-400", "bg-blue-500/10 border-blue-500/20", "None currently.", "certification-progress", "certification")}
                </div>
                <div className="space-y-4 flex flex-col">
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                    <Target size={16} /> Target
                  </h3>
                  {renderSkillList(needCertifications, certPageNeed, setCertPageNeed, "text-yellow-400", "bg-yellow-500/10 border-yellow-500/20 border-dashed", "No targets set.", "certification-need", "certification")}
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Timeline Info</h3>
              
              <div className="flex items-start gap-3 mb-4">
                <div className="mt-0.5 p-2 bg-zinc-800 rounded-lg text-zinc-400">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">Target / Completion Date</p>
                  <p className="text-white font-medium">
                    {career.date && !isNaN(new Date(career.date).getTime()) 
                      ? new Date(career.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
                      : "Not specified"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 bg-zinc-800 rounded-lg text-zinc-400">
                  <Target size={16} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">Current Status</p>
                  <p className="text-white font-medium">{career.status}</p>
                </div>
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm relative group">
              <button 
                onClick={() => setIsEditingTimeline(true)}
                className="absolute top-4 right-4 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit Stages"
              >
                <Edit2 size={16} />
              </button>

              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2 pr-10">
                <Clock size={16} className="text-zinc-400" /> Stages
              </h3>
              
              <div className="relative border-l-2 border-zinc-800 ml-3 space-y-8 pb-4">
                {timeline.map((stage: any, i: number) => {
                  const isCompleted = stage.status?.toLowerCase() === 'completed';
                  const isCurrent = stage.status?.toLowerCase() === 'current';
                  
                  return (
                    <div key={i} className="relative pl-6">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-zinc-900 ${
                        isCompleted ? 'bg-emerald-500' :
                        isCurrent ? 'bg-blue-500 ring-2 ring-blue-500/30' :
                        'bg-zinc-600'
                      }`} />
                      
                      {/* Optional Connecting Line (shows green track for completed stages) */}
                      {isCompleted && i < timeline.length - 1 && (
                        <div className="absolute -left-[2px] top-5 w-[2px] h-[calc(100%+16px)] bg-emerald-500" />
                      )}
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-500 mb-1">{stage.date}</span>
                        <h4 className={`text-base font-semibold ${
                          isCompleted ? 'text-zinc-200' :
                          isCurrent ? 'text-blue-400' :
                          'text-zinc-500'
                        }`}>
                          {stage.title}
                        </h4>
                        {stage.desc && (
                          <p className="text-sm text-zinc-400 mt-1 leading-snug">
                            {stage.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && (
                  <div className="relative pl-6">
                     <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-zinc-900 bg-zinc-600" />
                     <p className="text-zinc-500 italic text-sm">No timeline stages defined.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </DragDropContext>
      </motion.div>

      {isEditingSkills && (
        <DataEditorModal
          isOpen={isEditingSkills}
          onClose={() => setIsEditingSkills(false)}
          title="Skills Tracker"
          type="skills"
          initialData={Array.isArray(career?.skills) && career.skills.length > 0 ? career.skills : []}
          onSave={handleSaveSkills}
          isPending={mutation.isPending}
        />
      )}

      {isEditingEducation && (
        <DataEditorModal
          isOpen={isEditingEducation}
          onClose={() => setIsEditingEducation(false)}
          title="Education Tracker"
          type="education"
          initialData={Array.isArray(career?.education) && career.education.length > 0 ? career.education : []}
          onSave={handleSaveEducation}
          isPending={mutation.isPending}
        />
      )}

      {isEditingCertifications && (
        <DataEditorModal
          isOpen={isEditingCertifications}
          onClose={() => setIsEditingCertifications(false)}
          title="Certifications Tracker"
          type="certification"
          initialData={Array.isArray(career?.certifications) && career.certifications.length > 0 ? career.certifications : []}
          onSave={handleSaveCertifications}
          isPending={mutation.isPending}
        />
      )}

      {isEditingTimeline && (
        <DataEditorModal
          isOpen={isEditingTimeline}
          onClose={() => setIsEditingTimeline(false)}
          title="Timeline Stages"
          type="timeline"
          initialData={Array.isArray(career?.timeline) && career.timeline.length > 0 ? career.timeline : []}
          onSave={handleSaveTimeline}
          isPending={mutation.isPending}
        />
      )}

      {isEditingDetails && (
        <BasicInfoEditorModal
          isOpen={isEditingDetails}
          onClose={() => setIsEditingDetails(false)}
          initialData={career}
          onSave={handleSaveDetails}
          isPending={mutation.isPending}
        />
      )}

      <SkillDetailsModal 
        skill={selectedSkillForDetails}
        onClose={() => setSelectedSkillForDetails(null)}
      />
    </div>
  );
}

export default function CareerDetailsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CareerDetailsContent />
    </QueryClientProvider>
  );
}
