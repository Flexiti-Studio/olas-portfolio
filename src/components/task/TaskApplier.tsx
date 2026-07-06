"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Upload, Loader2, Send, ExternalLink, Image as ImageIcon, FileText, Copy, UploadCloud } from "lucide-react";
import AtsCvTemplate from "./AtsCvTemplate";
import CoverLetterPreview from "./CoverLetterPreview";

export default function TaskApplier() {
  const [jobDescription, setJobDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  
  const quickCopyData = {
    firstName: "Emmanuel",
    lastName: "Adeleke",
    fullName: "Emmanuel Adeleke",
    email: "emmanuel.success.work@gmail.com",
    phone: "+1 (339)-399-0519",
    location: "Brooklyn, NY 11233",
    role: "Senior Full Stack Engineer",
    experience: "8",
    linkedin: "https://www.linkedin.com/in/emmanuel-adeleke-success/",
    github: "https://github.com/svendev888",
  };

  const targetJobs = [
    "Senior Full Stack Engineer",
    "Senior Frontend Engineer",
    "Senior Backend Engineer",
    "Software Engineering Manager",
    "Tech Lead",
    "Web3 / Blockchain Developer",
    "Cloud / DevOps Engineer",
    "UI/UX Developer"
  ];

  const [toast, setToast] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast("Copied to clipboard!");
    setTimeout(() => setToast(null), 2000);
  };
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCv, setGeneratedCv] = useState<any>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/task/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const [activeTab, setActiveTab] = useState<"cv" | "cover_letter">("cv");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleGenerate = async () => {
    if (!jobDescription) return alert("Please enter a job description");
    setIsGenerating(true);
    
    try {
      const res = await fetch("/api/task/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, prompt })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCv(data.cv);
        const cl = data.coverLetter || data.cover_letter || "";
        setGeneratedCoverLetter(typeof cl === 'object' ? JSON.stringify(cl, null, 2) : cl);
        setCompanyName(data.companyName || "Unknown Company");
      } else {
        alert("Error generating: " + data.error);
      }
    } catch (e) {
      alert("Failed to generate");
    }
    
    setIsGenerating(false);
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      
      try {
        const { pdf } = await import('@react-pdf/renderer');
        
        // Download Cover Letter PDF
        const clModule = await import('./CoverLetterPdfTemplate');
        const CoverLetterPdfTemplate = clModule.default;
        const clBlob = await pdf(<CoverLetterPdfTemplate content={generatedCoverLetter} />).toBlob();
        const clUrl = URL.createObjectURL(clBlob);
        const clA = document.createElement("a");
        clA.href = clUrl;
        clA.download = `${safeName}_Cover_Letter.pdf`;
        document.body.appendChild(clA);
        clA.click();
        document.body.removeChild(clA);
        URL.revokeObjectURL(clUrl);

        // Download CV PDF
        const cvModule = await import('./AtsCvPdfTemplate');
        const AtsCvPdfTemplate = cvModule.default;
        const cvBlob = await pdf(<AtsCvPdfTemplate data={generatedCv} />).toBlob();
        const cvUrl = URL.createObjectURL(cvBlob);
        const cvA = document.createElement("a");
        cvA.href = cvUrl;
        cvA.download = `${safeName}_CV.pdf`;
        document.body.appendChild(cvA);
        cvA.click();
        document.body.removeChild(cvA);
        URL.revokeObjectURL(cvUrl);
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF files directly. Continuing application save...");
      }
      
      const res = await fetch("/api/task/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          cvContent: generatedCv,
          coverLetter: generatedCoverLetter
        })
      });
      const data = await res.json();
      if (res.ok) {
        setApplicationId(data.id);
        setShowUploadPopup(true);
      } else {
        alert("Server error: " + data.error);
      }
    } catch (e: any) {
      alert("Error saving application: " + e?.message);
    }
    setIsAccepting(false);
  };

  const handleFinalize = async () => {
    if (!jobUrl || !screenshotUrl) return alert("URL and Screenshot are required");
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/task/apply/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobUrl, screenshotUrl })
      });
      
      if (res.ok) {
        // Now trigger the telegram / sheets notify
        await fetch("/api/task/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, jobUrl, screenshotUrl })
        });
        
        alert("Application completely saved and notified!");
        setShowUploadPopup(false);
        // Reset
        setJobDescription("");
        setPrompt("");
        setGeneratedCv(null);
        setGeneratedCoverLetter("");
        setCompanyName("");
        setApplicationId(null);
        setJobUrl("");
        setScreenshotUrl("");
        fetchHistory();
      }
    } catch (e) {
      alert("Error finalizing");
    }
    setIsFinalizing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:h-auto">
      {/* Left Panel: Inputs */}
      <div className="flex flex-col gap-6 h-full print:hidden">
        {/* Job Details & Configuration (Moved to Top) */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex-none flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Job Details & Configuration</h3>
          
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 flex flex-col">
              <label className="text-sm text-zinc-400 mb-2">Job Description</label>
              <textarea 
                className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 resize-none h-32"
                placeholder="Paste the complete job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            
            <div className="flex-1 flex flex-col">
              <label className="text-sm text-zinc-400 mb-2">Custom AI Prompt (Optional)</label>
              <textarea 
                className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 resize-none h-24"
                placeholder="E.g. Collaborated with cross-functional teams to develop smart contracts..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || !jobDescription}
            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
            {isGenerating ? "Analyzing & Generating..." : "Generate Application"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Quick Copy Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              Quick Copy Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(quickCopyData).map(([key, value]) => (
                <div key={key} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between group">
                  <div className="flex flex-col overflow-hidden pr-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-xs text-zinc-300 truncate">{value}</span>
                  </div>
                  <button 
                    onClick={() => handleCopy(value)}
                    className="w-7 h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy to clipboard"
                  >
                    <FileText size={12} className="text-zinc-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Target Job Titles */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Target Job Titles</h3>
            <div className="flex flex-wrap gap-2">
              {targetJobs.map((job, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleCopy(job)}
                  className="bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-300 transition-colors px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 group"
                  title="Click to copy"
                >
                  {job}
                  <FileText size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden h-full print:border-none print:bg-white print:text-black print:overflow-visible print:block">
        {!generatedCv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 print:hidden">
            <FileText size={48} className="mb-4 opacity-50"/>
            <p>Generated documents will appear here</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-zinc-800 p-2 gap-2 bg-zinc-900 shrink-0 print:hidden">
              <button 
                onClick={() => setActiveTab("cv")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "cv" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
              >
                ATS CV
              </button>
              <button 
                onClick={() => setActiveTab("cover_letter")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "cover_letter" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}
              >
                Cover Letter
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-white print:overflow-visible">
              <div id="cv-print-container" className={activeTab === "cv" ? "block" : "hidden"}>
                <AtsCvTemplate data={generatedCv} />
              </div>
              <div className={activeTab === "cover_letter" ? "block" : "hidden"}>
                <CoverLetterPreview content={generatedCoverLetter} />
              </div>
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 print:hidden">
              <button 
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {isAccepting ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>}
                Download PDF & Accept
              </button>
            </div>
          </>
        )}
      </div>

      {/* Upload Popup */}
      <AnimatePresence>
        {showUploadPopup && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-2">Finalize Application</h3>
              <p className="text-zinc-400 text-sm mb-6">Provide the job link and an image URL for the screenshot to save to DB, Google Sheets and Telegram.</p>
              
              <div className="space-y-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold mb-3 text-zinc-400 uppercase tracking-wider">Quick Copy Details</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(quickCopyData).map(([key, value]) => (
                      <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex items-center justify-between group">
                        <div className="flex flex-col overflow-hidden pr-2">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-xs text-zinc-300 truncate">{value}</span>
                        </div>
                        <button 
                          onClick={() => handleCopy(value)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all shrink-0"
                          title="Copy to clipboard"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Job URL</label>
                  <input 
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://company.com/careers/job-123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Application Screenshot (Proof)</label>
                  <label className="w-full border-2 border-dashed border-zinc-800 hover:border-indigo-500 bg-zinc-950 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <UploadCloud className="text-zinc-500 group-hover:text-indigo-400 mb-2" size={24} />
                    <span className="text-sm text-zinc-400 group-hover:text-indigo-400 font-medium">Click to upload image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setScreenshotUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {screenshotUrl && screenshotUrl.startsWith("data:image") && (
                    <div className="mt-2 text-emerald-500 text-xs flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Image successfully attached
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowUploadPopup(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalize}
                  disabled={isFinalizing || !jobUrl || !screenshotUrl}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isFinalizing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                  Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-medium flex items-center gap-2 z-[60]"
          >
            <CheckCircle2 size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      </div> {/* Close the grid div */}

      {/* Application History Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 print:hidden">
        <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
          <CheckCircle2 className="text-emerald-500" /> Recent Applications
        </h3>
        {history.length === 0 ? (
          <p className="text-zinc-500 text-sm">No applications recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Job Link</th>
                  <th className="px-4 py-3">Screenshot</th>
                  <th className="px-4 py-3 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((app) => (
                  <tr key={app.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-full border border-indigo-500/20">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {app.job_url ? (
                        <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                          View Job <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {app.screenshot_url ? (
                        <a href={app.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                          View Image <ImageIcon size={12} />
                        </a>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => {
                          setGeneratedCv(app.cv_content);
                          setGeneratedCoverLetter(app.cover_letter);
                          setActiveTab("cv");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                      >
                        Load Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
