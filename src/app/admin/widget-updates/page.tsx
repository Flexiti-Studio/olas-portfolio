"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles, 
  Download, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Globe,
  FileCode2,
  UploadCloud,
  Zap,
  RotateCcw,
  History,
  Check
} from "lucide-react";

interface UpdatePayload {
  id?: string;
  version: string;
  notes: string;
  downloadUrl: string;
  signature?: string;
  isActive: boolean;
  pubDate?: string;
  createdAt?: string;
}

export default function WidgetUpdatesAdminPage() {
  const [version, setVersion] = useState("1.2.0");
  const [notes, setNotes] = useState("Version 1.2: Ability to create projects directly from widget and full offline auto-sync.");
  const [downloadUrl, setDownloadUrl] = useState("https://ola.flexitistudio.com/downloads/olas-todo-widget_1.2.0_x64-setup.exe");
  const [signature, setSignature] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [releaseHistory, setReleaseHistory] = useState<UpdatePayload[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUpdateAndHistory = async () => {
    try {
      setLoading(true);
      // Fetch active update
      const res = await fetch("/api/widget/update");
      if (res.ok && res.status !== 204) {
        const json = await res.json();
        if (json.version) {
          setVersion(json.version);
          setNotes(json.notes || "");
          const winPlatform = json.platforms?.["windows-x86_64"];
          if (winPlatform) {
            setDownloadUrl(winPlatform.url || "");
            setSignature(winPlatform.signature || "");
          }
        }
      }

      // Fetch release history
      const historyRes = await fetch("/api/widget/update?history=true");
      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        if (historyJson.releases) {
          setReleaseHistory(historyJson.releases);
        }
      }
    } catch (err) {
      console.error("Failed to load widget update setting:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdateAndHistory();
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setMessage(null);

    try {
      // 1. Get presigned URL from API
      const presignRes = await fetch("/api/widget/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
      });

      if (!presignRes.ok) {
        const errText = await presignRes.text();
        let errMsg = `Failed to get upload URL (HTTP ${presignRes.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) errMsg = parsed.error.message;
        } catch {
          if (errText) errMsg = errText.slice(0, 150);
        }
        throw new Error(errMsg);
      }

      const presignJson = await presignRes.json();

      if (!presignJson.success || !presignJson.data) {
        throw new Error(presignJson.error?.message || "Failed to get secure upload URL");
      }

      const { presignedUrl, downloadUrl: newUrl, detectedVersion, uploadSource } = presignJson.data;

      setMessage({ type: "success", text: "Secure link acquired, uploading directly to S3..." });

      // 2. Upload file directly to S3
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        const uploadErrText = await uploadRes.text().catch(() => "");
        throw new Error(`S3 Upload failed (HTTP ${uploadRes.status}): ${uploadErrText.slice(0, 150) || uploadRes.statusText}`);
      }

      // 3. Update UI
      setDownloadUrl(newUrl);
      if (detectedVersion) {
        setVersion(detectedVersion);
      }
      const sourceLabel = uploadSource === "R2_S3_PRESIGNED" ? "Cloudflare R2 S3 CDN (Direct)" : "Server Storage";
      setMessage({
        type: "success",
        text: `Successfully uploaded "${file.name}" to ${sourceLabel}! Download URL ${detectedVersion ? `& Version v${detectedVersion}` : ""} auto-filled.`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "File upload failed." });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: UpdatePayload = {
        version: version.trim(),
        notes: notes.trim(),
        downloadUrl: downloadUrl.trim(),
        signature: signature.trim(),
        isActive,
      };

      const res = await fetch("/api/widget/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        setMessage({ type: "success", text: `Successfully published widget update v${version.trim()}!` });
        await fetchUpdateAndHistory();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save update configuration." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertVersion = async (targetVersion: string, targetId?: string) => {
    if (!confirm(`Are you sure you want to activate and revert to Version v${targetVersion}? Desktop widgets will immediately check and update to this version.`)) {
      return;
    }

    setRevertingId(targetId || targetVersion);
    setMessage(null);

    try {
      const res = await fetch("/api/widget/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: targetVersion, id: targetId }),
      });

      const json = await res.json();

      if (json.success) {
        setMessage({ type: "success", text: `Successfully reverted active release to Version v${targetVersion}!` });
        await fetchUpdateAndHistory();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to revert version." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error reverting version." });
    } finally {
      setRevertingId(null);
    }
  };

  const previewManifest = {
    version: version.trim(),
    notes: notes.trim(),
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature: signature.trim(),
        url: downloadUrl.trim(),
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <Link 
              href="/admin" 
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Desktop Widget Updates</h1>
                <p className="text-xs text-slate-400">Database Release History & One-Click Version Rollback Manager</p>
              </div>
            </div>
          </div>

          <a
            href="/api/widget/update"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition-all self-start sm:self-auto"
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>View Live update.json</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
            message.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Loading update status...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Form (2 Columns) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Direct Installer Upload Dropzone */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900/80 hover:bg-slate-900 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 relative group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".msi,.exe,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                      <p className="text-sm font-medium text-white">Uploading installer to Cloudflare R2 S3 CDN...</p>
                      <p className="text-xs text-slate-400">Please wait while the binary file is being processed</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                          <span>Drop your built .MSI or .EXE file here</span>
                          <Zap className="w-4 h-4 text-amber-400" />
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          or <span className="text-blue-400 underline font-medium">click to browse</span> installer from your build directory
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 mt-1">
                        <span>Supported: .msi, .exe, .nsis.zip</span>
                        <span>•</span>
                        <span>Direct S3 Upload</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Release Form */}
                <form onSubmit={handleSave} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      Publish New Release
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Release Status:</span>
                      <button
                        type="button"
                        onClick={() => setIsActive(!isActive)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          isActive 
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" 
                            : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        }`}
                      >
                        {isActive ? "ACTIVE" : "INACTIVE / DRAFT"}
                      </button>
                    </div>
                  </div>

                  {/* Version & Download URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Version String <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1.2.0"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Download URL (CDN / S3 Link) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://pub-611c6bf0623f4d68be69771944118b95.r2.dev/downloads/olas-todo-widget_1.2.0_x64-setup.exe"
                        value={downloadUrl}
                        onChange={(e) => setDownloadUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Release Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Release Notes / Changelog
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe what's new in this release..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Signature (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span>Code Signature (Base64)</span>
                      <span className="text-[11px] text-slate-500 font-normal">Optional (if pubkey is set in tauri.conf.json)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. dWdkYXRhLXNpZ25hdHVyZS1iYXNlNjQtc3RyaW5n"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving || !version.trim() || !downloadUrl.trim()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Publishing Update...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Publish Update Manifest</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Manifest Preview */}
              <div className="space-y-6">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                      <FileCode2 className="w-4 h-4 text-emerald-400" />
                      Live update.json Output
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This exact JSON payload will be served to installed widgets when checking for updates:
                  </p>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                    <pre>{JSON.stringify(previewManifest, null, 2)}</pre>
                  </div>
                </div>

                {/* Protocol Quick Info Card */}
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                  <h4 className="font-semibold text-blue-400 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    One-Click Release Workflow
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                    <li>Run <code className="text-blue-300">npm run tauri build</code> in your widget terminal.</li>
                    <li>Drag & drop the built <code className="text-blue-300">.exe</code> or <code className="text-blue-300">.msi</code> above.</li>
                    <li>Click **Publish Update Manifest**!</li>
                  </ol>
                </div>
              </div>

            </div>

            {/* Release History & Version Rollback Section */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Database Release History & Version Rollback</h2>
                    <p className="text-xs text-slate-400">Review past versions and click to immediately revert active release</p>
                  </div>
                </div>
              </div>

              {releaseHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  No previous release records found in database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3 font-semibold">Version</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Published Date</th>
                        <th className="p-3 font-semibold">Notes / Features</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {releaseHistory.map((rel) => {
                        const isCurrentActive = rel.isActive;
                        const isReverting = revertingId === (rel.id || rel.version);

                        return (
                          <tr key={rel.id || rel.version} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-white">
                              v{rel.version}
                            </td>
                            <td className="p-3">
                              {isCurrentActive ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  <Check className="w-3 h-3" /> ACTIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                                  INACTIVE
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400 whitespace-nowrap">
                              {rel.pubDate ? new Date(rel.pubDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="p-3 max-w-xs truncate text-slate-300" title={rel.notes}>
                              {rel.notes || "No notes provided."}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              {isCurrentActive ? (
                                <span className="text-[11px] text-emerald-400 font-medium italic">
                                  Current Served Version
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRevertVersion(rel.version, rel.id)}
                                  disabled={isReverting}
                                  className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isReverting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  )}
                                  <span>Revert to v{rel.version}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
