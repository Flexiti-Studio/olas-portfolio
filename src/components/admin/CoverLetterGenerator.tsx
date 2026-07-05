import { useState, useEffect } from "react";
import { Download, Bot, Sparkles, FileText, CheckCircle2, AlertCircle, Copy, Building, Briefcase } from "lucide-react";
import { Application } from "./ApplicationTracker";

export default function CoverLetterGenerator() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  
  // Form State
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("Professional");
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    fetchApplications();
    fetchSavedRecords();
  }, []);

  const fetchSavedRecords = async () => {
    try {
      const res = await fetch("/api/cover-letters");
      if (res.ok) setSavedRecords(await res.json());
    } catch (err) {
      console.error("Failed to fetch cover letters:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    }
  };

  const handleAppSelect = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) {
      setSelectedApp(app);
      setCompany(app.company);
      setJobTitle(app.job_title);
      setJobDescription(app.job_description || "");
    } else {
      setSelectedApp(null);
      setCompany("");
      setJobTitle("");
      setJobDescription("");
    }
  };

  const handleGenerate = async () => {
    if (!company || !jobTitle) return alert("Company and Job Title are required!");
    
    setIsGenerating(true);
    setCoverLetter("");
    
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, jobTitle, jobDescription, tone }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let currentText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        currentText += chunk;
        setCoverLetter(currentText);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error generating cover letter: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!coverLetter || !company || !jobTitle) return;
    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          jobTitle,
          jobDescription,
          tone,
          text: coverLetter,
          applicationId: selectedApp?.id
        })
      });
      if (res.ok) {
        alert("Cover letter saved and attached to application successfully!");
        fetchSavedRecords();
      } else {
        alert("Failed to save cover letter.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving cover letter.");
    }
  };

  const handleDownloadPdf = async (textToDownload: string, dlCompany: string, dlTitle: string) => {
    if (!textToDownload) return;
    try {
      const { pdf, Document, Page, Text, StyleSheet } = await import("@react-pdf/renderer");
      const styles = StyleSheet.create({
        page: { padding: 50, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.6, color: '#000' },
      });
      const MyDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text>{textToDownload}</Text>
          </Page>
        </Document>
      );
      const blob = await pdf(MyDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dlCompany.replace(/\s+/g, '_')}_${dlTitle.replace(/\s+/g, '_')}_Cover_Letter.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
      // Fallback to text download
      const blob = new Blob([textToDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dlCompany.replace(/\s+/g, '_')}_${dlTitle.replace(/\s+/g, '_')}_Cover_Letter.txt`;
      a.click();
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex bg-zinc-950 text-white rounded-2xl border border-zinc-800 relative">
      
      {/* LEFT COLUMN: Controls & Inputs */}
      <div className="w-1/3 min-w-[350px] border-r border-zinc-800 bg-zinc-900/30 flex flex-col rounded-l-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Cover Letter</h2>
            <p className="text-xs text-zinc-400">Tailor-made letters in seconds</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* App Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
              Target Application
            </label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
              onChange={(e) => handleAppSelect(e.target.value)}
            >
              <option value="">-- Manual Entry --</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.company} - {app.job_title}
                </option>
              ))}
            </select>
            {selectedApp && (
              <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> Auto-filled from Tracker
              </p>
            )}
          </div>

          <div className="h-px bg-zinc-800/50 w-full" />

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Company Name</label>
              <div className="relative">
                <Building size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                <input 
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Job Title</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                <input 
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 outline-none"
                  placeholder="e.g. Frontend Developer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 flex justify-between items-center">
                <span>Job Description</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">Crucial for AI matching</span>
              </label>
              <textarea 
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none resize-none"
                placeholder="Paste the full job description here..."
              />
            </div>
            
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tone</label>
              <select 
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
              >
                <option>Professional</option>
                <option>Enthusiastic</option>
                <option>Direct & Confident</option>
                <option>Creative</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !company || !jobTitle}
            className="w-full bg-blue-600 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing & Writing...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Cover Letter
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Preview */}
      <div className="flex-1 bg-zinc-950 flex flex-col relative rounded-r-2xl overflow-hidden">
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2 text-zinc-300">
            <FileText size={16} />
            <span className="font-semibold text-sm">Live Preview</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
            >
              <CheckCircle2 size={14} /> Save to DB
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(coverLetter)}
              className="flex items-center gap-2 bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              <Copy size={14} /> Copy Text
            </button>
            <button 
              onClick={() => handleDownloadPdf(coverLetter, company || 'Company', jobTitle || 'Position')}
              disabled={!coverLetter}
              className="flex items-center gap-2 bg-white text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>

        <div className="flex-1 p-12 flex justify-center bg-zinc-950">
          {/* A4 Paper representation */}
          <div className="w-full max-w-[800px] min-h-[1056px] bg-white rounded shadow-2xl p-12 text-black prose prose-sm shrink-0">
            {coverLetter ? (
              <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">
                {coverLetter}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 opacity-50">
                <FileText size={48} strokeWidth={1} />
                <p>Your AI-generated cover letter will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Saved Cover Letters Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileText size={20} className="text-zinc-400" />
          Saved Cover Letters
        </h3>
        {savedRecords.length === 0 ? (
          <p className="text-zinc-500 italic">No cover letters saved yet.</p>
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
                        const text = typeof ver === 'string' ? ver : (ver.text || ver.content || JSON.stringify(ver));
                        setCoverLetter(text);
                        setCompany(record.company || "");
                        setJobTitle(record.jobTitle || "");
                        setJobDescription(record.jobDescription || "");
                        setTone(record.tone || "Professional");
                      }
                    }}
                    className="flex-1 bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Load in Editor
                  </button>
                  <button 
                    onClick={() => {
                      if (record.versions && record.versions.length > 0) {
                        const ver = record.versions[record.currentVersion || 0];
                        const text = typeof ver === 'string' ? ver : (ver.text || ver.content || JSON.stringify(ver));
                        handleDownloadPdf(text, record.company || 'Company', record.jobTitle || 'Position');
                      }
                    }}
                    className="bg-zinc-800 text-white p-1.5 rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-center"
                    title="Download PDF"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
