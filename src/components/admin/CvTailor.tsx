import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Copy, RefreshCw, Send, CheckCircle2, AlertCircle, FileText, X, Check, ExternalLink } from "lucide-react";
import dynamic from 'next/dynamic';
import CvDocument from "./CvDocument";

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then(mod => mod.PDFViewer), { ssr: false });

export default function CvTailor() {
  const [toast, setToast] = useState<{ message: string, type: "success" | "error" } | null>(null);
  
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [templates, setTemplates] = useState<any[]>([]);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState("Professional");
  const [fullName, setFullName] = useState("Ola Olasunkanmi");
  
  const [basicInfo, setBasicInfo] = useState<Record<string, string>>({
    email: "olasunkanmiola531@gmail.com",
    phone: "+234 808 629 8113",
    portfolio: "ola.flexitistudio.com",
    location: "Lagos, Nigeria",
    linkedin: "linkedin.com/in/ola-olasunkanmi"
  });
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavingBasicInfo, setIsSavingBasicInfo] = useState(false);

  const [selectedDesign, setSelectedDesign] = useState("standard");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState("sections"); // sections, keywords, raw
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  
  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);

  const [showReviewModal, setShowReviewModal] = useState(false);

  // Template upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    fetchTemplates();
    fetchSavedRecords();
    fetchBasicInfo();
  }, []);

  const fetchBasicInfo = async () => {
    try {
      const res = await fetch("/api/settings?key=cv_basic_info");
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          setBasicInfo(data.value);
        }
      }
    } catch (err) {
      console.error("Failed to fetch basic info:", err);
    }
  };

  const saveBasicInfoToDB = async (updatedInfo: Record<string, string>) => {
    setIsSavingBasicInfo(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "cv_basic_info", value: updatedInfo })
      });
    } catch (err) {
      console.error("Failed to save basic info to DB:", err);
    }
    setIsSavingBasicInfo(false);
  };

  const handleSaveBasicInfo = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const updated = { ...basicInfo, [field]: e.target.value };
    setBasicInfo(updated);
  };

  const handleAddNewField = () => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (basicInfo[key]) return showToast("Field already exists", "error");
    
    const updated = { ...basicInfo, [key]: "" };
    setBasicInfo(updated);
    setNewFieldName("");
  };

  const handleRemoveField = (field: string) => {
    const updated = { ...basicInfo };
    delete updated[field];
    setBasicInfo(updated);
  };

  const handleCloseBasicInfoModal = async () => {
    await saveBasicInfoToDB(basicInfo);
    setShowBasicInfoModal(false);
    showToast("Basic info saved to database", "success");
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to fetch templates", "error");
        return;
      }
      setTemplates(data);
      if (data.length > 0) setSelectedTemplateId(data[0]._id);
    } catch (error) {
      console.error(error);
      showToast("Network error fetching templates", "error");
    }
  };

  const fetchSavedRecords = async () => {
    const res = await fetch("/api/cv");
    if (res.ok) {
      setSavedRecords(await res.json());
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId || !jobDescription) return showToast("Template and Job Description required.", "error");
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          jobDescription,
          instructions,
          tone,
          fullName,
          basicInfo
        })
      });
      const data = await res.json();
      if (res.ok) {
        const enhancedOutput = { ...data, fullName, basicInfo };
        setOutput(enhancedOutput);
        setVersions([enhancedOutput]);
        setCurrentVersionIdx(0);
      } else {
        showToast(data.error, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Generation failed", "error");
    }
    setIsGenerating(false);
  };

  const handleRefine = async () => {
    if (!refineInput || !output) return;
    
    setIsRefining(true);
    try {
      const res = await fetch("/api/cv/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentOutput: output,
          refinementInstruction: refineInput
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data);
        setVersions([...versions, data]);
        setCurrentVersionIdx(versions.length);
        setRefineInput("");
      } else {
        showToast("Refinement failed", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error during refinement", "error");
    }
    setIsRefining(false);
  };

  const handleSave = async () => {
    if (!output) return;
    try {
      // Use job title and company to make a slug
      const slug = `${output.jobTitle}-${output.company}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch("/api/cv/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          jobTitle: output.jobTitle,
          company: output.company,
          jobDescription,
          instructions,
          tone,
          fullName,
          templateId: selectedTemplateId,
          versions,
          currentVersion: currentVersionIdx,
          status: "draft"
        })
      });
      if (res.ok) {
        showToast("Saved successfully!", "success");
        fetchSavedRecords();
      } else {
        showToast("Failed to save", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error during save", "error");
    }
  };

  const handleUploadTemplate = async () => {
    if (!newTemplateName || !newTemplateFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("name", newTemplateName);
      formData.append("file", newTemplateFile);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast("Template created successfully!", "success");
          setNewTemplateName("");
          setNewTemplateFile(null);
          setUploadProgress(0);
          fetchTemplates();
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            showToast(data.error || "Failed to upload", "error");
          } catch (e) {
            showToast(`Server Error: ${xhr.statusText}`, "error");
          }
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showToast("Network Error occurred during upload.", "error");
      };

      xhr.open("POST", "/api/templates", true);
      xhr.send(formData);

    } catch (e) {
      console.error(e);
      setIsUploading(false);
    }
  };

  const handleUpdateSection = (field: string, val: string, index?: number, subfield?: string) => {
    const newOut = { ...output };
    if (index !== undefined && subfield) {
      newOut[field][index][subfield] = val;
    } else {
      newOut[field] = val;
    }
    setOutput(newOut);
    // Also update the current version array to reflect inline edits
    const newVersions = [...versions];
    newVersions[currentVersionIdx] = newOut;
    setVersions(newVersions);
  };

  const handleDownloadPdf = async () => {
    if (!output) return;
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<CvDocument output={output} design={selectedDesign} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${output.jobTitle.replace(/\s+/g, '_')}_${output.company.replace(/\s+/g, '_')}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("PDF downloaded successfully!", "success");
    } catch (e) {
      console.error("PDF generation failed", e);
      showToast("Failed to generate PDF", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex w-full relative bg-zinc-950 rounded-2xl border border-zinc-800">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
              toast.type === "success" 
                ? "bg-emerald-950/90 border-emerald-900/50 text-emerald-400" 
                : "bg-red-950/90 border-red-900/50 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Basic Info Modal */}
      {showBasicInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 p-6 rounded-2xl w-full max-w-md border border-zinc-800">
            <h3 className="text-lg font-bold mb-4">Basic Information</h3>
            {Object.entries(basicInfo).map(([key, value]) => (
              <div key={key} className="mb-3">
                <label className="text-xs text-zinc-500 capitalize">{key}</label>
                <div className="flex gap-2">
                  <input 
                    value={value} 
                    onChange={(e) => handleSaveBasicInfo(e, key)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm"
                  />
                  <button onClick={() => handleCopy(value, key)} className="p-2 hover:bg-zinc-800 rounded">
                    {copiedField === key ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => handleRemoveField(key)} className="p-2 hover:bg-red-900/50 text-red-500 rounded">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-2">
              <input 
                placeholder="New field name (e.g. github)" 
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm"
              />
              <button onClick={handleAddNewField} className="bg-zinc-800 px-4 py-2 rounded text-sm hover:bg-zinc-700">Add</button>
            </div>

            <button 
              onClick={handleCloseBasicInfoModal} 
              disabled={isSavingBasicInfo}
              className="w-full mt-6 bg-white text-black p-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isSavingBasicInfo ? "Saving..." : "Save & Close"}
            </button>
          </div>
        </div>
      )}

      {/* Left Column: Generator Inputs */}
      <div className="w-1/3 flex flex-col gap-6 pr-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">CV Tailor</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowReviewModal(true)} 
                className="bg-zinc-800 text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Review Templates
              </button>
              <button 
                onClick={() => setShowBasicInfoModal(true)}
                className="bg-zinc-800 text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Basic Info
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Full Name</label>
              <input 
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Template</label>
              <select 
                value={selectedTemplateId} 
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500"
              >
                {templates.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Job Description</label>
              <textarea 
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500"
                placeholder="Paste the JD here..."
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Custom Instructions</label>
              <textarea 
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500"
                placeholder="e.g. emphasize AI work"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Tone</label>
              <div className="flex gap-2">
                {["Professional", "Confident", "Concise"].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTone(t)}
                    className={`flex-1 py-2 text-xs font-medium rounded-full border transition-colors ${
                      tone === t ? "bg-white text-black border-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Visual Design</label>
              <select 
                value={selectedDesign} 
                onChange={(e) => setSelectedDesign(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="navy">Modern Navy Sidebar</option>
                <option value="original">Original Design (2-Column)</option>
                <option value="standard">Standard ATS (Clean)</option>
                <option value="modern">Modern (Blue Header)</option>
              </select>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-white text-black font-semibold rounded-xl p-3 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
              {isGenerating ? "Generating..." : "Generate CV"}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-semibold text-sm mb-4">Add New Template</h3>
          <input 
            placeholder="Template Name"
            value={newTemplateName}
            onChange={e => setNewTemplateName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs mb-2 focus:outline-none"
          />
          <input 
            key={newTemplateFile ? newTemplateFile.name : 'empty-file'}
            type="file"
            accept="application/pdf"
            onChange={e => e.target.files && setNewTemplateFile(e.target.files[0])}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs mb-2 focus:outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
          />
          {isUploading && (
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button 
            onClick={handleUploadTemplate}
            disabled={isUploading || !newTemplateFile || !newTemplateName}
            className="w-full bg-zinc-800 text-white text-xs font-medium rounded-lg p-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? `Uploading... ${uploadProgress}%` : "Upload & Parse PDF"}
          </button>
        </div>
      </div>

      {/* Right Column: Output */}
      <div className="flex-1 bg-zinc-950 flex flex-col relative rounded-r-2xl">
        {output ? (
          <div className="flex-1 p-6 flex flex-col">
            
            {/* Output Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950 py-4 -mt-4">
              <div>
                <h2 className="text-xl font-bold">{output.jobTitle}</h2>
                <p className="text-zinc-400 text-sm">@ {output.company}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300" title="Save">
                  <Save size={18} />
                </button>
                <button onClick={handleDownloadPdf} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300" title="Download PDF">
                  <Download size={18} />
                </button>
                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(output, null, 2))} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300" title="Copy Raw">
                  <Copy size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-zinc-800 mb-4">
              {["sections", "ATS Review", "preview", "raw"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                  className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab.toLowerCase().replace(' ', '-') ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1">
              {activeTab === "sections" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs text-zinc-500 uppercase font-semibold mb-2">Profile</h4>
                    <textarea 
                      value={output.profile || ''}
                      onChange={e => handleUpdateSection("profile", e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-zinc-500 min-h-[100px]"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs text-zinc-500 uppercase font-semibold mb-2">Experience</h4>
                    {output.experience?.map((exp: any, i: number) => (
                      <div key={i} className="mb-4 bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                        <div className="flex gap-4 mb-2">
                          <input 
                            value={exp.title || ''}
                            onChange={e => handleUpdateSection("experience", e.target.value, i, "title")}
                            className="flex-1 bg-transparent border-b border-zinc-800 pb-1 font-medium focus:outline-none"
                          />
                          <input 
                            value={exp.company || ''}
                            onChange={e => handleUpdateSection("experience", e.target.value, i, "company")}
                            className="w-1/3 bg-transparent border-b border-zinc-800 pb-1 text-sm text-zinc-400 focus:outline-none"
                          />
                        </div>
                        <textarea 
                          value={exp.bullets?.join("\n") || ''}
                          onChange={e => {
                            const newOut = { ...output };
                            newOut.experience[i].bullets = e.target.value.split("\n");
                            setOutput(newOut);
                          }}
                          className="w-full bg-transparent text-sm focus:outline-none min-h-[100px] leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "ats-review" && (
                <div className="space-y-6">
                  {/* ATS Score and Suggestions */}
                  <div className="flex gap-4">
                    <div className="w-1/3 bg-zinc-950 p-6 rounded-xl border border-zinc-800 flex flex-col items-center justify-center">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-2">ATS Match Score</h4>
                      <div className="text-4xl font-bold text-white">{output.atsScore || 0}%</div>
                    </div>
                    <div className="flex-1 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-2">Suggestions for Improvement</h4>
                      <ul className="list-disc pl-4 text-sm text-zinc-300 space-y-2">
                        {output.atsSuggestions?.map((sug: string, i: number) => (
                          <li key={i}>{sug}</li>
                        ))}
                        {!output.atsSuggestions?.length && <li>No suggestions provided by AI.</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2 mb-3 text-green-400">
                        <CheckCircle2 size={16} />
                        <h4 className="font-semibold text-sm">Matched Keywords</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {output.matchedKeywords?.map((kw: string) => (
                          <span key={kw} className="bg-green-400/10 text-green-400 text-xs px-2 py-1 rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2 mb-3 text-red-400">
                        <AlertCircle size={16} />
                        <h4 className="font-semibold text-sm">Missing Keywords</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {output.missingKeywords?.map((kw: string) => (
                          <span key={kw} className="bg-red-400/10 text-red-400 text-xs px-2 py-1 rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="w-full h-full min-h-[500px]">
                  <PDFViewer width="100%" height="100%" className="rounded-xl border border-zinc-800">
                    <CvDocument output={output} design={selectedDesign} />
                  </PDFViewer>
                </div>
              )}

              {activeTab === "raw" && (
                <pre className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-xs text-zinc-300 overflow-x-auto">
                  {JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>

            {/* Revision & Refine */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              {versions.length > 1 && (
                <div className="flex items-center gap-2 mb-3 overflow-x-auto hide-scrollbar">
                  <span className="text-xs text-zinc-500 font-medium mr-2">Versions:</span>
                  {versions.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setCurrentVersionIdx(i);
                        setOutput(versions[i]);
                      }}
                      className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${
                        currentVersionIdx === i ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 relative">
                <input 
                  type="text"
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRefine()}
                  placeholder="Ask AI to tweak this version..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500"
                />
                <button 
                  onClick={handleRefine}
                  disabled={isRefining || !refineInput}
                  className="bg-zinc-800 text-white rounded-xl px-4 flex items-center justify-center hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {isRefining ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-500 p-8">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Select a template, paste the job description, and hit Generate to tailor your CV.</p>
          </div>
        )}
      </div>
      </div>

      {/* Saved CVs Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Save size={20} className="text-zinc-400" />
          Saved Tailored CVs
        </h3>
        {savedRecords.length === 0 ? (
          <p className="text-zinc-500 italic">No CVs saved yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRecords.map(record => (
              <div key={record.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white">{record.jobTitle}</h4>
                  <p className="text-sm text-zinc-400">@ {record.company}</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Updated: {new Date(record.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      if (record.versions && record.versions.length > 0) {
                        const ver = record.versions[record.currentVersion || 0];
                        setOutput(ver);
                        setVersions(record.versions);
                        setCurrentVersionIdx(record.currentVersion || 0);
                        setJobDescription(record.jobDescription || "");
                        setInstructions(record.instructions || "");
                        setTone(record.tone || "Professional");
                        setSelectedTemplateId(record.templateId);
                        showToast("Loaded saved CV", "success");
                      }
                    }}
                    className="flex-1 bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Load in Editor
                  </button>
                  <a 
                    href={`/admin?tab=cv-tailor&cv=${record.slug}`}
                    target="_blank"
                    className="bg-zinc-800 text-white p-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center"
                    title="Open shareable link"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Available Templates</h2>
                <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar">
                {templates.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No templates found.</p>
                ) : (
                  templates.map(template => (
                    <div key={template.id || template._id} className="flex justify-between items-center p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <div>
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        <p className="text-xs text-zinc-400">
                          {template.isDefault ? "Default Base Template" : `Uploaded on ${new Date(template.createdAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!template.isDefault && (
                          <button 
                            onClick={async () => {
                              if (!confirm("Delete this template?")) return;
                              const res = await fetch(`/api/templates/${template.id || template._id}`, { method: 'DELETE' });
                              if (res.ok) fetchTemplates();
                            }}
                            className="px-3 py-1.5 bg-red-950 border border-red-900/50 text-red-500 text-xs font-medium rounded-lg hover:bg-red-900"
                          >
                            Delete
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const enhancedOutput = {
                              jobTitle: template.name,
                              company: "Template",
                              fullName,
                              basicInfo,
                              isBaseTemplate: true,
                              ...template.sections,
                            };
                            setOutput(enhancedOutput);
                            setVersions([enhancedOutput]);
                            setCurrentVersionIdx(0);
                            setSelectedTemplateId(template.id || template._id);
                            setShowReviewModal(false);
                          }}
                          className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-200"
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Basic Info Modal */}
      {showBasicInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-[500px] max-w-[90vw] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-white">Basic Info (Autofill Data)</h3>
              <button 
                onClick={() => setShowBasicInfoModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-zinc-400 mb-6">
              This info is used by the AI to generate your CV templates. You can also quickly copy these details for job applications.
            </p>

            <div className="space-y-4">
              {Object.entries(basicInfo).map(([key, value]) => (
                <div key={key}>
                  <label className="text-xs text-zinc-400 mb-1 block capitalize">{key}</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={value}
                      onChange={(e) => handleSaveBasicInfo(e, key)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                    />
                    <button 
                      onClick={() => handleCopy(value, key)}
                      title="Copy to clipboard"
                      className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-center w-10"
                    >
                      {copiedField === key ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-zinc-400" />}
                    </button>
                    <button 
                      onClick={() => handleRemoveField(key)}
                      title="Remove field"
                      className="p-2 bg-red-950 border border-red-900 rounded-lg hover:bg-red-900 text-red-400 transition-colors flex items-center justify-center w-10"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800 flex gap-2">
              <input 
                placeholder="New field name (e.g. github)" 
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
              <button 
                onClick={handleAddNewField} 
                className="bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Add Field
              </button>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleCloseBasicInfoModal}
                disabled={isSavingBasicInfo}
                className="px-6 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {isSavingBasicInfo ? "Saving..." : "Save to Database"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
