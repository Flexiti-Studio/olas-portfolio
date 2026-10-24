import React, { useState, useEffect } from "react";
import { X, Check, Loader2, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreatePostModal({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const router = useRouter();
  const [socials, setSocials] = useState<string[]>([]);
  const [originalContent, setOriginalContent] = useState("");
  const [sourceSocialId, setSourceSocialId] = useState("");
  const [targetSocials, setTargetSocials] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [postType, setPostType] = useState<"normal" | "video">("normal");
  const [videoStory, setVideoStory] = useState("");

  const [creatorName, setCreatorName] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [creatorImage, setCreatorImage] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/socials")
        .then((res) => res.json())
        .then((data) => {
          if (data.socials) {
            setSocials(data.socials);
          }
        })
        .catch((err) => console.error("Failed to fetch socials:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleSubmit();
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, originalContent, sourceSocialId]);

  if (!isOpen) return null;

  const handleToggleTarget = (platform: string) => {
    setTargetSocials((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSelectAll = () => {
    const available = socials.filter((s) => s !== sourceSocialId);
    if (targetSocials.length === available.length) {
      setTargetSocials([]);
    } else {
      setTargetSocials(available);
    }
  };

  const handleSubmit = async () => {
    setError("");
    
    if (postType === "video") {
      if (!videoStory.trim()) {
        setError("Please enter the video storyline.");
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/creators/${projectId}/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story: videoStory }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create video story");
        }

        const { video } = await res.json();
        // Option 1: navigate to the scenework page
        router.push(`/admin/creators/${projectId}/scenework?videoId=${video.id}`);
        // Alternatively, we could stay and reload or just navigate to the list
        onClose();
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
      return;
    }

    if (!originalContent.trim()) {
      setError("Please paste the post content.");
      return;
    }
    if (!sourceSocialId) {
      setError("Please select the source platform.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/creators/${projectId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSocialId,
          originalContent,
          targetSocials,
          creatorName,
          creatorHandle,
          creatorImage,
          postType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create post");
      }

      const { post } = await res.json();
      router.push(`/admin/creators/${projectId}/posts/${post.id}`);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const availableTargets = socials.filter((s) => s !== sourceSocialId);
  const isAllSelected =
    availableTargets.length > 0 && targetSocials.length === availableTargets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <PenTool className="w-6 h-6 text-emerald-400" />
            Add Initial Post
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setPostType("normal")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                postType === "normal" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Normal Post
            </button>
            <button
              onClick={() => setPostType("video")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                postType === "video" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Video Post
            </button>
          </div>

          {postType === "normal" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Creator Details (for Preview)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Name (e.g. John Doe)"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Handle (e.g. @johndoe)"
                    value={creatorHandle}
                    onChange={(e) => setCreatorHandle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={creatorImage}
                    onChange={(e) => setCreatorImage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Original Post Content
                </label>
                <div className="relative">
                  <textarea
                    value={originalContent}
                    onChange={(e) => setOriginalContent(e.target.value)}
                    placeholder="Paste the original post text here..."
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                    {originalContent.length} chars
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Written for (Source Platform)
                </label>
                <div className="flex flex-wrap gap-2">
                  {socials.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        setSourceSocialId(platform);
                        if (targetSocials.includes(platform)) {
                          setTargetSocials(targetSocials.filter((p) => p !== platform));
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${
                        sourceSocialId === platform
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              {sourceSocialId && (
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Also create versions for:
                    </label>
                    {availableTargets.length > 0 && (
                      <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        {isAllSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTargets.length === 0 ? (
                      <span className="text-sm text-slate-500">No other platforms available.</span>
                    ) : (
                      availableTargets.map((platform) => (
                        <button
                          key={platform}
                          onClick={() => handleToggleTarget(platform)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border flex items-center gap-2 ${
                            targetSocials.includes(platform)
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${
                              targetSocials.includes(platform)
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-slate-500 bg-slate-900"
                            }`}
                          >
                            {targetSocials.includes(platform) && <Check className="w-3 h-3" />}
                          </div>
                          {platform}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Video Story Line
              </label>
              <div className="relative">
                <textarea
                  value={videoStory}
                  onChange={(e) => setVideoStory(e.target.value)}
                  placeholder="Write or paste your story here..."
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors font-serif text-lg resize-none"
                />
                <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-md">
                  {videoStory.trim() ? videoStory.trim().split(/\s+/).length : 0} words
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Tip: Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Cmd/Ctrl + Enter</kbd> to generate
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
