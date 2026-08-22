"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Upload, Loader2, Send, ExternalLink, Image as ImageIcon, FileText, Copy, UploadCloud, Download, X, AlertCircle } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import AtsCvTemplate from "./AtsCvTemplate";
import CoverLetterPreview from "./CoverLetterPreview";

export default function SpeedApplier() {
  const [jobDescription, setJobDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [popupNotice, setPopupNotice] = useState<{
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  const showPopupNotice = (title: string, message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setPopupNotice({ title, message, type });
  };

  const quickCopyData = {
    firstName: "Ola",
    lastName: "Olasunkanmi",
    fullName: "Ola Olasunkanmi",
    email: "olasunkanmiola531@gmail.com",
    phone: "+234 808 629 8113",
    location: "Lagos, Nigeria",
    zipCode: "100001",
    role: "Full Stack Web, Mobile & AI Developer",
    experience: "3",
    linkedin: "https://www.linkedin.com/in/ola-olasunkanmi/",
    github: "https://github.com/nicxd531",
    portfolio: "https://ola.flexitistudio.com",
    pass: "Default123!@#$",
  };

  const targetJobs = [
    "Full Stack Developer",
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "AI Automation Engineer",
    "Mobile App Developer"
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
  const [jobTitle, setJobTitle] = useState<string>("");
  const [allApplications, setAllApplications] = useState<any[]>([]);

  // Fetch all apps on mount to prevent double applying
  useEffect(() => {
    fetchAllApps();
  }, []);

  const fetchAllApps = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setAllApplications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [activeTab, setActiveTab] = useState<"cv" | "cover_letter">("cv");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [uploadedCvUrl, setUploadedCvUrl] = useState<string | null>(null);
  const [uploadedClUrl, setUploadedClUrl] = useState<string | null>(null);

  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [careersList, setCareersList] = useState<any[]>([]);
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Record<string, boolean>>({});
  const [jobType, setJobType] = useState<'remote' | 'hybrid' | 'in-person'>('remote');
  const [trackerTarget, setTrackerTarget] = useState<'job' | 'gig'>('job');
  const [careerSkills, setCareerSkills] = useState<any[]>([]);
  const [isLoadingCareerSkills, setIsLoadingCareerSkills] = useState(false);

  const fetchAndSetCareerSkills = async (careerId: string) => {
    setIsLoadingCareerSkills(true);
    try {
      const res = await fetch(`/api/career/${careerId}`);
      if (res.ok) {
        const json = await res.json();
        const career = json.career;
        const skills: any[] = Array.isArray(career?.skills) 
          ? career.skills 
          : (career?.skills ? JSON.parse(career.skills) : []);
        setCareerSkills(skills);
      }
    } catch (e) {
      console.error("Failed to fetch career skills", e);
      setCareerSkills([]);
    } finally {
      setIsLoadingCareerSkills(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription) return showPopupNotice("Missing Input", "Please enter a job description before generating.", "warning");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/speed/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, prompt })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCv(data.cv);
        const cl = data.coverLetter || data.cover_letter || "";
        setGeneratedCoverLetter(typeof cl === 'object' ? JSON.stringify(cl, null, 2) : cl);
        const genCompany = data.companyName || "Unknown Company";
        setCompanyName(genCompany);
        setJobTitle(data.jobTitle || "Frontend Developer");
        const detectedJt = (data.jobType && ['remote', 'hybrid', 'in-person'].includes(data.jobType))
          ? data.jobType
          : (jobDescription.toLowerCase().includes('hybrid') ? 'hybrid' : (jobDescription.toLowerCase().includes('onsite') || jobDescription.toLowerCase().includes('on-site') || jobDescription.toLowerCase().includes('in-person') || jobDescription.toLowerCase().includes('office')) ? 'in-person' : 'remote');
        setJobType(detectedJt);
        // extract skills if present
        try {
          const skills = (data.cv && data.cv.skills) || [];
          const flat: string[] = skills.flatMap((s: any) => s.items || []).map((s: string) => s.replace(/<[^>]*>?/gm, '').trim());
          const uniqueSkills = Array.from(new Set(flat));
          setExtractedSkills(uniqueSkills);
          const sel: Record<string, boolean> = {};
          uniqueSkills.forEach((k) => { sel[k] = true; });
          setSelectedSkills(sel);
        } catch (e) {
          setExtractedSkills([]);
        }

        const alreadyApplied = allApplications.some((app: any) => app.company?.toLowerCase() === genCompany.toLowerCase());
        if (alreadyApplied) {
          showPopupNotice("Duplicate Application", `Warning: You have already applied to ${genCompany}!`, "warning");
        }
      } else {
        showPopupNotice("Generation Error", data.error || "Failed to generate application documents.", "error");
      }
    } catch (e) {
      showPopupNotice("Generation Failed", "Failed to process job description.", "error");
    }

    setIsGenerating(false);
  };

  const isAlreadyApplied = Boolean(companyName && allApplications.some((app: any) => app.company?.toLowerCase() === companyName.toLowerCase()));

  const [modalClUrl, setModalClUrl] = useState<string | null>(null);
  const [modalCvUrl, setModalCvUrl] = useState<string | null>(null);
  const [previewCvBlobUrl, setPreviewCvBlobUrl] = useState<string | null>(null);
  const [previewClBlobUrl, setPreviewClBlobUrl] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'skills' | 'cv_pdf' | 'cl_pdf'>('skills');

  const openSkillsComparisonModal = async (clUrl?: string | null, cvUrl?: string | null) => {
    if (clUrl) {
      setModalClUrl(clUrl);
      if (clUrl.startsWith('blob:')) setPreviewClBlobUrl(clUrl);
    }
    if (cvUrl) {
      setModalCvUrl(cvUrl);
      if (cvUrl.startsWith('blob:')) setPreviewCvBlobUrl(cvUrl);
    }
    try {
      const res = await fetch('/api/career');
      if (res.ok) {
        const json = await res.json();
        const careers = json.careers || [];
        setCareersList(careers);

        // Find Software career (or matching software / dev keywords)
        const softCareer = careers.find((c: any) => 
          c.title?.toLowerCase().includes('software') || 
          c.category?.toLowerCase().includes('software') ||
          c.title?.toLowerCase().includes('developer') ||
          c.title?.toLowerCase().includes('engineer')
        ) || careers[0];

        if (softCareer) {
          setSelectedCareerId(softCareer.id);
          await fetchAndSetCareerSkills(softCareer.id);
        }
      }
    } catch (e) {
      console.error("Failed to load career data", e);
    }
    setShowSkillsModal(true);
  };

  const handleCareerChange = async (careerId: string) => {
    setSelectedCareerId(careerId);
    if (careerId) {
      await fetchAndSetCareerSkills(careerId);
    } else {
      setCareerSkills([]);
    }
  };

  const handleDownloadPdfs = async () => {
    setIsAccepting(true);
    try {
      const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_');

      const { pdf } = await import('@react-pdf/renderer');

      let latestClUrl = uploadedClUrl;
      let latestCvUrl = uploadedCvUrl;

      // Download Cover Letter PDF
      const clModule = await import('./CoverLetterPdfTemplate');
      const CoverLetterPdfTemplate = clModule.default;
      const clBlob = await pdf(<CoverLetterPdfTemplate content={generatedCoverLetter} />).toBlob();
      const clUrl = URL.createObjectURL(clBlob);
      setPreviewClBlobUrl(clUrl);
      const clA = document.createElement("a");
      clA.href = clUrl;
      clA.download = `${safeName}_Cover_Letter.pdf`;
      document.body.appendChild(clA);
      clA.click();
      document.body.removeChild(clA);

      // upload cover letter blob to server (R2)
      try {
        const fd = new FormData();
        fd.append('file', new File([clBlob], `${safeName}_Cover_Letter.pdf`, { type: 'application/pdf' }));
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        const uj = await up.json();
        if (uj?.success) {
          latestClUrl = uj.url;
          setUploadedClUrl(uj.url);
        }
      } catch (e) { console.warn('Upload CL failed', e); }

      // Download CV PDF
      const cvModule = await import('./AtsCvPdfTemplate');
      const AtsCvPdfTemplate = cvModule.default;
      const cvBlob = await pdf(<AtsCvPdfTemplate data={generatedCv} />).toBlob();
      const cvUrl = URL.createObjectURL(cvBlob);
      setPreviewCvBlobUrl(cvUrl);
      const cvA = document.createElement("a");
      cvA.href = cvUrl;
      cvA.download = `${safeName}_CV.pdf`;
      document.body.appendChild(cvA);
      cvA.click();
      document.body.removeChild(cvA);

      // upload cv blob to server (R2)
      try {
        const fd2 = new FormData();
        fd2.append('file', new File([cvBlob], `${safeName}_CV.pdf`, { type: 'application/pdf' }));
        const up2 = await fetch('/api/uploads', { method: 'POST', body: fd2 });
        const uj2 = await up2.json();
        if (uj2?.success) {
          latestCvUrl = uj2.url;
          setUploadedCvUrl(uj2.url);
        }
      } catch (e) { console.warn('Upload CV failed', e); }

      setHasDownloaded(true);
      // Open comparison popup modal
      await openSkillsComparisonModal(latestClUrl, latestCvUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
      showPopupNotice("PDF Export Error", "Failed to generate PDFs directly.", "error");
    }
    setIsAccepting(false);
  };

  const handleAppliedWithSkills = async () => {
    setIsAccepting(true);
    try {
      const clUrl = uploadedClUrl || modalClUrl;
      const cvUrl = uploadedCvUrl || modalCvUrl;

      // 1. Add missing skills to Career profile if selected
      if (selectedCareerId) {
        const existingSkillNames = careerSkills.map(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase());
        const skillsToAdd = extractedSkills.filter(s => selectedSkills[s] && !existingSkillNames.includes(s.toLowerCase()));

        if (skillsToAdd.length > 0) {
          const updatedSkills = [...careerSkills];
          skillsToAdd.forEach(s => {
            updatedSkills.push({ name: s, status: 'need' });
          });
          await fetch(`/api/career/${selectedCareerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: updatedSkills })
          });
        }
      }

      // 2. Save Application to Application Tracker
      const existingSkillNames = careerSkills.map(cs => (typeof cs === 'string' ? cs : cs.name || ''));
      const selectedSkillNames = extractedSkills.filter(s => selectedSkills[s]);
      const baseSkillsForApp = Array.from(new Set([...existingSkillNames, ...selectedSkillNames]));
      const allSkillsForApp = trackerTarget === 'gig' ? [...baseSkillsForApp, 'gig'] : baseSkillsForApp;

      const trackerRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle || "Software Developer",
          company: companyName || "Unknown Company",
          stage: "Applied",
          source: "Speed Apply",
          job_description: jobDescription,
          tags: allSkillsForApp,
          job_type: jobType,
          job_url: jobUrl || undefined,
          screenshot_url: screenshotUrl || undefined,
          cover_letter_url: clUrl || undefined,
          linked_cv_slug: cvUrl || undefined
        })
      });

      const trackerResData = await trackerRes.json().catch(() => null);

      if (trackerRes.ok) {
        showPopupNotice("Application Tracked! 🎉", `Successfully tracked application for ${companyName} and synced skills to your career profile!`, "success");

        // Reset state for next application
        setJobDescription("");
        setPrompt("");
        setGeneratedCv(null);
        setGeneratedCoverLetter("");
        setCompanyName("");
        setJobTitle("");
        setHasDownloaded(false);
        setShowSkillsModal(false);
        fetchAllApps();
      } else {
        showPopupNotice("Save Failed", trackerResData?.error || "Failed to save to Application Tracker.", "error");
      }
    } catch (e: any) {
      showPopupNotice("Error Saving Application", e?.message || "An unexpected error occurred while saving.", "error");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleConfirmApplication = async () => {
    setIsAccepting(true);
    try {
      // Save directly to global application tracker
      const baseTags = Object.keys(selectedSkills).filter(k => selectedSkills[k]);
      const tagsToSave = trackerTarget === 'gig' ? [...baseTags, 'gig'] : baseTags;

      const trackerRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle || "Frontend Developer",
          company: companyName || "Unknown Company",
          stage: "Applied",
          source: "Speed Apply",
          job_description: jobDescription,
          tags: tagsToSave,
          job_type: jobType,
          job_url: jobUrl || undefined,
          screenshot_url: screenshotUrl || undefined,
          cover_letter_url: uploadedClUrl || undefined,
          linked_cv_slug: uploadedCvUrl || undefined
        })
      });

      const trackerResData = await trackerRes.json().catch(() => null);

      if (trackerRes.ok) {
        showPopupNotice("Application Tracked! 🎉", "Application successfully saved to Application Tracker!", "success");

        // Reset state for speed
        setJobDescription("");
        setPrompt("");
        setGeneratedCv(null);
        setGeneratedCoverLetter("");
        setCompanyName("");
        setJobTitle("");
        setHasDownloaded(false);
        fetchAllApps(); // Refresh duplicate checker
      } else {
        showPopupNotice("Save Failed", trackerResData?.error || "Failed to save to Application Tracker.", "error");
      }
    } catch (e: any) {
      showPopupNotice("Error Saving Application", e?.message || "An unexpected error occurred while saving.", "error");
    }
    setIsAccepting(false);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => ({ ...prev, [skill]: !prev[skill] }));
  };

  const addSelectedSkillsToCareer = async () => {
    if (!selectedCareerId) return alert('Select a career to add skills to');
    const toAdd = Object.keys(selectedSkills).filter(k => selectedSkills[k]);
    try {
      // fetch career
      const res = await fetch(`/api/career/${selectedCareerId}`);
      if (!res.ok) throw new Error('Failed to fetch career');
      const json = await res.json();
      const career = json.career;
      const existing: any[] = Array.isArray(career.skills) ? career.skills : (career.skills ? JSON.parse(career.skills) : []);
      // normalize to array of { name, status }
      const normalized = [...existing];
      for (const s of toAdd) {
        if (!normalized.some((e: any) => e.name === s)) normalized.push({ name: s, status: 'need' });
      }
      const put = await fetch(`/api/career/${selectedCareerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: normalized })
      });
      if (!put.ok) throw new Error('Failed to update career');
      alert('Skills added to career');
      setShowSkillsModal(false);
    } catch (e: any) {
      alert('Failed to add skills: ' + e?.message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:h-auto">
        {/* Left Panel: Inputs */}
        <div className="flex flex-col gap-6 print:hidden">
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setJobDescription(val);
                    const lower = val.toLowerCase();
                    if (lower.includes('hybrid')) setJobType('hybrid');
                    else if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('in-person') || lower.includes('in person') || lower.includes('office') || lower.includes('relocation')) setJobType('in-person');
                    else if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) setJobType('remote');
                  }}
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
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {isGenerating ? "Analyzing & Generating..." : "Generate Application"}
            </button>
          </div>

          <div className="flex-1 pr-2 space-y-6">
            {/* Quick Copy Panel */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                Quick Copy Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden print:border-none print:bg-white print:text-black print:overflow-visible print:block">
          {!generatedCv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 print:hidden">
              <FileText size={48} className="mb-4 opacity-50" />
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

              <div className="flex-1 bg-white print:overflow-visible overflow-x-auto">
                <div className="min-w-[800px] sm:min-w-0">
                  <div id="cv-print-container" className={activeTab === "cv" ? "block" : "hidden"}>
                    <AtsCvTemplate data={generatedCv} />
                  </div>
                  <div className={activeTab === "cover_letter" ? "block" : "hidden"}>
                    <CoverLetterPreview content={generatedCoverLetter} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 print:hidden flex flex-col gap-3">
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Job Location Type:</span>
                  <div className="flex items-center gap-2">
                    {(['remote', 'hybrid', 'in-person'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setJobType(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          jobType === type
                            ? type === 'remote'
                              ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-950/40'
                              : type === 'hybrid'
                              ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-md shadow-purple-950/40'
                              : 'bg-amber-600 border-amber-500 text-white font-bold shadow-md shadow-amber-950/40'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {type === 'remote' ? '🌐 Remote' : type === 'hybrid' ? '⚡ Hybrid' : '🏢 Onsite'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tracker Destination:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackerTarget('job')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        trackerTarget === 'job'
                          ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-950/40'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      👔 Jobs
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackerTarget('gig')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        trackerTarget === 'gig'
                          ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-950/40'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      🚀 Gigs
                    </button>
                  </div>
                </div>

                {isAlreadyApplied && (
                  <div className="mb-1 text-red-500 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                    You have already applied to {companyName}. Application blocked.
                  </div>
                )}

                {!hasDownloaded ? (
                  <button
                    onClick={handleDownloadPdfs}
                    disabled={isAccepting || isAlreadyApplied}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isAlreadyApplied
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                      }`}
                  >
                    {isAccepting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    {isAlreadyApplied ? "Already Applied" : "1. Download PDFs"}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmApplication}
                    disabled={isAccepting || isAlreadyApplied}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isAlreadyApplied
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                      }`}
                  >
                    {isAccepting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {isAlreadyApplied ? "Already Applied" : "2. Confirm Applied"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>


      </div>
      <AnimatePresence>
        {showSkillsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-indigo-400" size={20} />
                    Job Skills vs Career Profile
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Comparing required skills for <strong className="text-white">{jobTitle}</strong> at <strong className="text-white">{companyName}</strong> against your Software Career page.
                  </p>
                </div>
                <button
                  onClick={() => setShowSkillsModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Career & Job Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col justify-center gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Target Career Profile:
                  </label>
                  <select
                    value={selectedCareerId || ''}
                    onChange={(e) => handleCareerChange(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 outline-none w-full"
                  >
                    {careersList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.category || 'Career'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col justify-center gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Job Location Type:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {(['remote', 'hybrid', 'in-person'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setJobType(type)}
                        className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all border text-center ${
                          jobType === type
                            ? type === 'remote'
                              ? 'bg-blue-600 border-blue-500 text-white font-bold'
                              : type === 'hybrid'
                              ? 'bg-purple-600 border-purple-500 text-white font-bold'
                              : 'bg-amber-600 border-amber-500 text-white font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {type === 'remote' ? '🌐 Remote' : type === 'hybrid' ? '⚡ Hybrid' : '🏢 Onsite'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub-Tab Navigation for Modal View Modes */}
              <div className="flex items-center gap-2 mb-4 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setModalTab('skills')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    modalTab === 'skills'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Skills & Profile Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('cv_pdf')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    modalTab === 'cv_pdf'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <FileText size={14} />
                  <span>📄 Live CV PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('cl_pdf')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    modalTab === 'cl_pdf'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <FileText size={14} />
                  <span>✉️ Live Cover Letter PDF</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-6 hide-scrollbar">
                {modalTab === 'cv_pdf' ? (
                  <div className="w-full h-full min-h-[480px] bg-zinc-900 rounded-xl p-2 border border-zinc-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs text-zinc-300 font-semibold">Interactive Tailored CV PDF Preview</span>
                      {(previewCvBlobUrl || uploadedCvUrl || modalCvUrl) && (
                        <a
                          href={previewCvBlobUrl || uploadedCvUrl || modalCvUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2 py-1 rounded bg-blue-950/60 text-blue-300 hover:text-white flex items-center gap-1 font-medium"
                        >
                          Open PDF in New Tab <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {previewCvBlobUrl || uploadedCvUrl || modalCvUrl ? (
                      <iframe
                        src={previewCvBlobUrl || uploadedCvUrl || modalCvUrl || ''}
                        className="w-full flex-1 rounded-lg border-0 bg-white min-h-[440px]"
                        title="CV PDF Preview"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        PDF is generating...
                      </div>
                    )}
                  </div>
                ) : modalTab === 'cl_pdf' ? (
                  <div className="w-full h-full min-h-[480px] bg-zinc-900 rounded-xl p-2 border border-zinc-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs text-zinc-300 font-semibold">Interactive Cover Letter PDF Preview</span>
                      {(previewClBlobUrl || uploadedClUrl || modalClUrl) && (
                        <a
                          href={previewClBlobUrl || uploadedClUrl || modalClUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2 py-1 rounded bg-purple-950/60 text-purple-300 hover:text-white flex items-center gap-1 font-medium"
                        >
                          Open PDF in New Tab <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {previewClBlobUrl || uploadedClUrl || modalClUrl ? (
                      <iframe
                        src={previewClBlobUrl || uploadedClUrl || modalClUrl || ''}
                        className="w-full flex-1 rounded-lg border-0 bg-white min-h-[440px]"
                        title="Cover Letter PDF Preview"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        PDF is generating...
                      </div>
                    )}
                  </div>
                ) : isLoadingCareerSkills ? (
                  <div className="py-8 flex items-center justify-center text-zinc-500 gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span className="text-sm">Comparing career skills...</span>
                  </div>
                ) : (
                  <>
                    {/* Skills Match Percentage */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 mb-2">
                      <div className="text-sm font-semibold text-zinc-300">Skill Match</div>
                      <div className="text-3xl font-bold text-white">
                        {extractedSkills.length > 0 ? Math.round((extractedSkills.filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length / extractedSkills.length) * 100) : 0}%
                      </div>
                      <div className="text-xs text-zinc-500">
                        {extractedSkills.filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length} of {extractedSkills.length} required skills found in profile
                      </div>
                    </div>

                    {/* Existing Career Skills */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          <CheckCircle2 size={14} />
                          Existing Career Skills You Already Have ({extractedSkills.filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length})
                        </div>
                        <button
                          onClick={() => handleCopy(extractedSkills.filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).join(", "))}
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center gap-1 transition-colors"
                          title="Copy existing skills"
                        >
                          <Copy size={12} /> Copy Existing
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {extractedSkills
                          .filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase()))
                          .map(skill => (
                            <span key={skill} className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="text-emerald-400" />
                              {skill}
                            </span>
                          ))}
                        {extractedSkills.filter(s => careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length === 0 && (
                          <span className="text-xs text-zinc-500 italic">No matching existing skills found in this profile.</span>
                        )}
                      </div>
                    </div>

                    {/* New / Missing Skills */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                          <Sparkles size={14} />
                          New / Missing Skills Required for Job ({extractedSkills.filter(s => !careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length})
                        </div>
                        <button
                          onClick={() => handleCopy(extractedSkills.filter(s => !careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).join(", "))}
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center gap-1 transition-colors"
                          title="Copy missing skills"
                        >
                          <Copy size={12} /> Copy Missing
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3">
                        Checked skills will automatically be added to your Software Career profile under missing skills when you click <strong className="text-emerald-400">Applied</strong>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {extractedSkills
                          .filter(s => !careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase()))
                          .map(skill => (
                            <label
                              key={skill}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                selectedSkills[skill]
                                  ? "bg-amber-950/20 border-amber-800/60 text-amber-200"
                                  : "bg-zinc-900/40 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!selectedSkills[skill]}
                                onChange={() => toggleSkill(skill)}
                                className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0"
                              />
                              <span className="text-xs font-medium flex-1">{skill}</span>
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                                New Skill
                              </span>
                            </label>
                          ))}
                        {extractedSkills.filter(s => !careerSkills.some(cs => (typeof cs === 'string' ? cs : cs.name || '').toLowerCase() === s.toLowerCase())).length === 0 && (
                          <span className="text-xs text-emerald-400 font-medium col-span-2 bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-xl">
                            🎉 Awesome! You already have all the required skills in your Software Career profile!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Generated Documents Preview & PDF Links Section */}
                    <div className="pt-4 border-t border-zinc-800 space-y-3">
                      {/* Quick Document Text Previews */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Tailored CV Snippet Preview */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                              📄 Tailored CV Preview
                            </span>
                            {(uploadedCvUrl || modalCvUrl || generatedCv) && (
                              <button
                                onClick={() => {
                                  let cvText = "";
                                  if (generatedCv?.personal_info?.name) {
                                    cvText += `${generatedCv.personal_info.name} — ${generatedCv.personal_info.title || jobTitle}\n\n`;
                                  }
                                  if (generatedCv?.summary_bullets) {
                                    cvText += generatedCv.summary_bullets.map((b: string) => `• ${b.replace(/<[^>]+>/g, '')}`).join("\n\n");
                                  }
                                  navigator.clipboard.writeText(cvText || "No CV text available.");
                                  sonnerToast.success("Copied CV text!");
                                }}
                                className="text-zinc-400 hover:text-white transition-colors"
                                title="Copy CV Text"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto hide-scrollbar bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60">
                            {generatedCv?.personal_info?.name && (
                              <p className="font-bold text-white mb-1">{generatedCv.personal_info.name} — {generatedCv.personal_info.title || jobTitle}</p>
                            )}
                            {generatedCv?.summary_bullets?.map((b: string, i: number) => (
                              <p key={i} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: `• ${b}` }} />
                            ))}
                            {(!generatedCv?.summary_bullets || generatedCv.summary_bullets.length === 0) && (
                              <p className="italic text-zinc-500">Tailored CV generated successfully.</p>
                            )}
                          </div>
                        </div>

                        {/* Cover Letter Snippet Preview */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                              ✉️ Cover Letter Preview
                            </span>
                            {(uploadedClUrl || modalClUrl || generatedCoverLetter) && (
                              <button
                                onClick={() => {
                                  let clText = generatedCoverLetter || "No cover letter available.";
                                  clText = clText.replace(/<br\s*\/?>/gi, "\n").replace(/<p>/gi, "").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, '').trim();
                                  navigator.clipboard.writeText(clText);
                                  sonnerToast.success("Copied Cover Letter text!");
                                }}
                                className="text-zinc-400 hover:text-white transition-colors"
                                title="Copy Cover Letter Text"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto hide-scrollbar bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60 font-serif leading-relaxed">
                            {generatedCoverLetter ? (
                              <div dangerouslySetInnerHTML={{ __html: generatedCoverLetter }} />
                            ) : (
                              <p className="italic text-zinc-500 font-sans">Cover letter generated successfully.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div className="border-t border-zinc-800 pt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowSkillsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                  Close / Skip Sync
                </button>
                <button
                  onClick={handleAppliedWithSkills}
                  disabled={isAccepting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
                >
                  {isAccepting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  <span>Applied</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {popupNotice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800">
                {popupNotice.type === "success" && <CheckCircle2 className="text-emerald-400" size={26} />}
                {popupNotice.type === "error" && <AlertCircle className="text-red-400" size={26} />}
                {popupNotice.type === "warning" && <Sparkles className="text-amber-400" size={26} />}
                {popupNotice.type === "info" && <Sparkles className="text-indigo-400" size={26} />}
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">{popupNotice.title}</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">{popupNotice.message}</p>
              </div>
              <button
                onClick={() => setPopupNotice(null)}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  popupNotice.type === "success"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                    : popupNotice.type === "error"
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/30"
                    : popupNotice.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/30"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/30"
                }`}
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[100] bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-xl shadow-emerald-900/50 flex items-center gap-2 font-medium text-sm"
          >
            <CheckCircle2 size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
