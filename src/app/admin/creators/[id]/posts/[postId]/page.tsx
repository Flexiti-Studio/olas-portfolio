"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Copy, RefreshCw, CheckCircle2, AlertCircle, Edit2, Check, Image as ImageIcon, MessageSquare, Repeat2, Heart, Share, Bookmark, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

const platformLimits: Record<string, number> = {
  x: 280,
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  facebook: 63206,
  youtube: 5000,
  threads: 500,
};

export default function PostPreviewPage() {
  const { id, postId } = useParams();
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [availableSocials, setAvailableSocials] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingPlatforms, setGeneratingPlatforms] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [expandedPrompt, setExpandedPrompt] = useState(false);
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  type YtStep = { id: string; label: string; status: 'pending' | 'processing' | 'done' | 'error' };
  const ytInitialSteps: YtStep[] = [
    { id: 'script', label: 'Generating Script & Storyline...', status: 'pending' },
    { id: 'sceneBreakdown', label: 'Extracting Scene Breakdown...', status: 'pending' },
    { id: 'voicePrompt', label: 'Crafting Voice Prompts...', status: 'pending' },
    { id: 'videoPrompt', label: 'Engineering Video Prompts...', status: 'pending' },
    { id: 'imagePrompt', label: 'Designing Image Prompt...', status: 'pending' },
  ];
  
  const [isYtGenerating, setIsYtGenerating] = useState(false);
  const [ytSteps, setYtSteps] = useState<YtStep[]>(ytInitialSteps);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const [resPost, resSocials] = await Promise.all([
        fetch(`/api/posts/${postId}`),
        fetch(`/api/socials`)
      ]);
      if (resPost.ok && resSocials.ok) {
        const data = await resPost.json();
        const socialsData = await resSocials.json();
        setPost(data.post);
        setAvailableSocials(socialsData.socials || []);
        if (!activeTab && data.post.versions.length > 0) {
          setActiveTab(data.post.versions[0].socialId);
        } else if (!activeTab && socialsData.socials?.length > 0) {
          setActiveTab(socialsData.socials[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateYouTubeSequentially = async () => {
    setIsYtGenerating(true);
    setYtSteps(ytInitialSteps);
    
    let generatedResults: any = { script: "", sceneBreakdown: "", voicePrompt: "", videoPrompt: "" };
    let imageResult = "";

    try {
      for (let i = 0; i < ytInitialSteps.length; i++) {
        const step = ytInitialSteps[i];
        
        setYtSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'processing' } : s));
        
        const res = await fetch(`/api/posts/${postId}/generate-youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: step.id })
        });
        
        if (!res.ok) throw new Error(`Failed at ${step.label}`);
        
        const data = await res.json();
        
        if (step.id === 'imagePrompt') {
          imageResult = data.result;
        } else {
          generatedResults[step.id] = data.result;
        }
        
        setYtSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done' } : s));
      }

      setYtSteps(prev => [...prev, { id: 'saving', label: 'Saving to Database...', status: 'processing' }]);
      
      const saveRes = await fetch(`/api/posts/${postId}/generate-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "save", generatedResults, imageResult })
      });
      
      if (!saveRes.ok) throw new Error("Failed to save YouTube version");
      
      setYtSteps(prev => prev.map(s => s.id === 'saving' ? { ...s, status: 'done' } : s));
      
      setTimeout(() => {
        setIsYtGenerating(false);
        fetchPost();
      }, 1000);

    } catch (err) {
      console.error(err);
      toast.error("YouTube sequential generation failed.");
      setIsYtGenerating(false);
    }
  };

  const handleGeneratePlatform = async (platform?: string) => {
    if (platform === "youtube") {
      await generateYouTubeSequentially();
      return;
    }
    const payload: any = {};
    if (platform) {
      payload.targetSocials = [platform];
      setGeneratingPlatforms((prev) => ({ ...prev, [platform]: true }));
    } else {
      setIsGeneratingAll(true);
      const pending = post.versions.filter((v: any) => v.status === "pending" || v.status === "failed");
      pending.forEach((v: any) => setGeneratingPlatforms((prev) => ({ ...prev, [v.socialId]: true })));
    }

    try {
      const res = await fetch(`/api/posts/${postId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchPost();
      }
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      if (platform) {
        setGeneratingPlatforms((prev) => ({ ...prev, [platform]: false }));
      } else {
        setIsGeneratingAll(false);
        setGeneratingPlatforms({});
      }
    }
  };

  const handleRegenerateImagePrompt = async (platform: string) => {
    setGeneratingPlatforms((prev) => ({ ...prev, [`${platform}-image`]: true }));
    try {
      const res = await fetch(`/api/posts/${postId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSocials: [platform], imagePromptOnly: true })
      });
      if (res.ok) {
        await fetchPost();
      }
    } catch (err) {
      console.error("Image prompt generation failed", err);
    } finally {
      setGeneratingPlatforms((prev) => ({ ...prev, [`${platform}-image`]: false }));
    }
  };

  const formatSocialText = (rawText: any) => {
    if (!rawText) return "";
    let text = Array.isArray(rawText) ? rawText.join('\n\n') : String(rawText);
    const boldMap: Record<string, string> = {
      'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭',
      'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇',
      '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'
    };
    const italicMap: Record<string, string> = {
      'A':'𝘈','B':'𝘉','C':'𝘊','D':'𝘋','E':'𝘌','F':'𝘍','G':'𝘎','H':'𝘏','I':'𝘐','J':'𝘑','K':'𝘒','L':'𝘓','M':'𝘔','N':'𝘕','O':'𝘖','P':'𝘗','Q':'𝘘','R':'𝘙','S':'𝘚','T':'𝘛','U':'𝘜','V':'𝘝','W':'𝘞','X':'𝘟','Y':'𝘠','Z':'𝘡',
      'a':'𝘢','b':'𝘣','c':'𝘤','d':'𝘥','e':'𝘦','f':'𝘧','g':'𝘨','h':'𝘩','i':'𝘪','j':'𝘫','k':'𝘬','l':'𝘭','m':'𝘮','n':'𝘯','o':'𝘰','p':'𝘱','q':'𝘲','r':'𝘳','s':'𝘴','t':'𝘵','u':'𝘶','v':'𝘷','w':'𝘸','x':'𝘹','y':'𝘺','z':'𝘻'
    };
    let formatted = text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
      return p1.split('').map((c: string) => boldMap[c] || c).join('');
    });
    formatted = formatted.replace(/\*(.*?)\*/g, (match, p1) => {
      return p1.split('').map((c: string) => italicMap[c] || c).join('');
    });
    return formatted;
  };

  const handleCopy = (text: string, id: string, platform?: string) => {
    let textToCopy = formatSocialText(text);
    
    // LinkedIn and Instagram collapse blank lines when pasting.
    // Insert a zero-width space on each blank line to preserve paragraph gaps.
    const richTextPlatforms = ['linkedin', 'in', 'instagram', 'ig'];
    if (platform && richTextPlatforms.includes(platform)) {
      textToCopy = textToCopy.replace(/\r?\n\r?\n/g, '\n\u200B\n');
    }
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleImageUpload = async (versionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingStates((prev) => ({ ...prev, [versionId]: true }));
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          setEditValues((prev) => ({ ...prev, [`${versionId}_imageUrl`]: data.url }));
        }
      } else {
        console.error("Upload failed");
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setUploadingStates((prev) => ({ ...prev, [versionId]: false }));
    }
  };

  const handleSaveEdit = async (version: any) => {
    const newContent = editValues[version.id];
    const newImagePrompt = editValues[`${version.id}_imagePrompt`];
    const newImageUrl = editValues[`${version.id}_imageUrl`];
    
    setSavingStates((prev) => ({ ...prev, [version.id]: true }));
    const loadingToast = toast.loading("Saving changes...");
    
    try {
      const res = await fetch(`/api/posts/${postId}/versions/${version.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, imagePrompt: newImagePrompt, imageUrl: newImageUrl })
      });
      if (res.ok) {
        setEditingStates((prev) => ({ ...prev, [version.id]: false }));
        await fetchPost();
        toast.success("Changes saved successfully!", { id: loadingToast });
      } else {
        toast.error("Failed to save changes", { id: loadingToast });
      }
    } catch (err) {
      console.error("Failed to save edit", err);
      toast.error("An error occurred while saving", { id: loadingToast });
    } finally {
      setSavingStates((prev) => ({ ...prev, [version.id]: false }));
    }
  };

  const startEditing = (version: any) => {
    setEditValues((prev) => ({ 
      ...prev, 
      [version.id]: version.content,
      [`${version.id}_imagePrompt`]: version.imagePrompt || "",
      [`${version.id}_imageUrl`]: version.imageUrl || ""
    }));
    setEditingStates((prev) => ({ ...prev, [version.id]: true }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Post not found
      </div>
    );
  }

  const activeVersion = post.versions.find((v: any) => v.socialId === activeTab);

  // Render Realistic Previews
  const renderPreview = (version: any) => {
    const isEditing = editingStates[version.id];
    const platform = version.socialId.toLowerCase();
    const limit = platformLimits[platform];
    const status = version.status;
    const isGenerating = generatingPlatforms[platform];

    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-emerald-400 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium animate-pulse">Adapting content for {platform}...</p>
        </div>
      );
    }

    if (status === "pending" || status === "failed") {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-4">
          <AlertCircle className={`w-10 h-10 ${status === 'failed' ? 'text-red-400' : 'text-slate-600'}`} />
          <p>{status === "failed" ? "Generation failed." : "Waiting to be generated."}</p>
          <button 
            onClick={() => handleGeneratePlatform(platform)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {status === "failed" ? "Retry Generation" : "Generate Now"}
          </button>
        </div>
      );
    }

    // Twitter / X Thread
    if (platform === "x" || platform === "twitter") {
      let thread = Array.isArray(version.content) ? version.content : [version.content];
      if (isEditing) {
        thread = Array.isArray(editValues[version.id]) ? editValues[version.id] : [editValues[version.id]];
      }

      return (
        <div className="space-y-0 bg-black text-white p-4 rounded-xl border border-slate-800">
          {thread.map((tweet: string, idx: number) => {
            const isOverLimit = limit && tweet.length > limit;
            return (
              <div key={idx} className="relative flex gap-3 pb-4">
                {idx !== thread.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-800" />
                )}
                {post.creator?.creatorImage ? (
                  <img src={post.creator?.creatorImage} alt="" className="w-12 h-12 rounded-full shrink-0 mt-1 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{post.creator?.creator || "Creator Name"}</span>
                    <span className="text-slate-500">{post.creator?.creatorHandle || "@creator"}</span>
                  </div>
                  
                  {isEditing ? (
                    <textarea
                      value={tweet}
                      onChange={(e) => {
                        const newThread = [...thread];
                        newThread[idx] = e.target.value;
                        setEditValues((prev) => ({ ...prev, [version.id]: newThread }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                      rows={4}
                    />
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap mb-3 text-[15px]">{formatSocialText(tweet)}</div>
                      {idx === 0 && version.imageUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-slate-800">
                          <img src={version.imageUrl} alt="Post Attachment" className="w-full h-auto object-cover max-h-96" />
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 text-slate-500">
                    <div className="flex gap-6">
                      <MessageSquare className="w-4 h-4" />
                      <Repeat2 className="w-4 h-4" />
                      <Heart className="w-4 h-4" />
                      <Bookmark className="w-4 h-4" />
                      <Share className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${isOverLimit ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                        {tweet.length} / {limit}
                      </span>
                      <button 
                        onClick={() => handleCopy(tweet, `tweet-${idx}`)}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300"
                      >
                        {copiedStates[`tweet-${idx}`] ? "Copied!" : `Copy Tweet ${idx + 1}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Instagram Preview
    if (platform === "instagram" || platform === "ig") {
      const rawContent = isEditing ? editValues[version.id] : version.content;
      const contentStr = Array.isArray(rawContent) ? rawContent.join('\n\n') : String(rawContent);
      const isOverLimit = limit && contentStr.length > limit;

      return (
        <div className="max-w-md mx-auto bg-black text-white border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 flex items-center gap-3 border-b border-slate-900">
            {post.creator?.creatorImage ? (
              <img src={post.creator?.creatorImage} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800" />
            )}
            <span className="font-bold text-sm">{post.creator?.creatorHandle?.replace('@', '') || "creator_username"}</span>
          </div>
          <div className="aspect-square bg-slate-900 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-slate-700" />
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-4">
              <Heart className="w-6 h-6" />
              <MessageSquare className="w-6 h-6" />
              <Share className="w-6 h-6" />
            </div>
            
            {isEditing ? (
              <textarea
                value={contentStr}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [version.id]: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                rows={8}
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap"><span className="font-bold mr-2">{post.creator?.creatorHandle?.replace('@', '') || "creator_username"}</span>{formatSocialText(contentStr)}</div>
            )}
            
            <div className="flex items-center justify-between mt-2">
               <span className={`text-xs ${isOverLimit ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                  {contentStr.length} / {limit}
               </span>
               <button 
                  onClick={() => handleCopy(contentStr, 'ig-copy', platform)}
                  className="text-xs font-bold text-blue-400"
               >
                  {copiedStates['ig-copy'] ? "Copied!" : "Copy Caption"}
               </button>
            </div>
          </div>
        </div>
      );
    }

    // LinkedIn Preview
    if (platform === "linkedin" || platform === "in") {
      const rawContent = isEditing ? editValues[version.id] : version.content;
      const contentStr = Array.isArray(rawContent) ? rawContent.join('\n\n') : String(rawContent);
      const isOverLimit = limit && contentStr.length > limit;
      const displayContent = isEditing ? contentStr : (contentStr.length > 250 ? contentStr.substring(0, 250) + "... see more" : contentStr);

      return (
        <div className="bg-white text-slate-900 rounded-xl border border-slate-300 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            {post.creator?.creatorImage ? (
              <img src={post.creator?.creatorImage} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200" />
            )}
            <div>
              <div className="font-bold text-sm">{post.creator?.creator || "Creator Name"}</div>
              <div className="text-xs text-slate-500">Expert in Social Media • 1h</div>
            </div>
          </div>

          {isEditing ? (
             <textarea
               value={contentStr}
               onChange={(e) => setEditValues((prev) => ({ ...prev, [version.id]: e.target.value }))}
               className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
               rows={8}
             />
          ) : (
             <>
               <div className="text-sm whitespace-pre-wrap leading-relaxed">
                 {contentStr.length > 250 && !expandedPrompt ? (
                   <>
                     {formatSocialText(contentStr.substring(0, 250))}...
                     <button onClick={() => setExpandedPrompt(true)} className="text-slate-500 hover:text-blue-600 font-semibold ml-1 cursor-pointer hover:underline focus:outline-none">see more</button>
                   </>
                 ) : (
                   <>
                     {formatSocialText(contentStr)}
                     {contentStr.length > 250 && (
                       <button onClick={() => setExpandedPrompt(false)} className="text-slate-500 hover:text-blue-600 font-semibold ml-1 mt-2 block cursor-pointer hover:underline focus:outline-none">see less</button>
                     )}
                   </>
                 )}
               </div>
               {version.imageUrl && (
                 <div className="mt-3 rounded overflow-hidden border border-slate-200">
                   <img src={version.imageUrl} alt="Post Attachment" className="w-full h-auto object-cover max-h-96" />
                 </div>
               )}
             </>
          )}

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="flex gap-4 text-slate-500 text-sm font-medium">
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4"/> Like</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4"/> Comment</span>
              <span className="flex items-center gap-1"><Repeat2 className="w-4 h-4"/> Repost</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between bg-slate-50 p-2 rounded">
             <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                {contentStr.length} / {limit}
             </span>
             <button 
                onClick={() => handleCopy(contentStr, 'in-copy', platform)}
                className="text-xs font-bold text-blue-600"
             >
                {copiedStates['in-copy'] ? "Copied!" : "Copy Post"}
             </button>
          </div>
        </div>
      );
    }

    // YouTube Preview
    if (platform === "youtube") {
      const isContentObject = version.content && typeof version.content === 'object' && !Array.isArray(version.content);
      const defaultYtData = isContentObject ? version.content : { script: String(version.content || "") };
      const ytData = isEditing && editValues[version.id] ? editValues[version.id] : defaultYtData;
      
      const renderSection = (title: string, value: string, fieldKey: string, copyKey: string) => (
        <div className="bg-black border border-slate-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-slate-300">{title}</h4>
            {!isEditing && value && (
              <button onClick={() => handleCopy(value, copyKey, platform)} className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                {copiedStates[copyKey] ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={value || ""}
              onChange={(e) => setEditValues((prev) => ({ 
                ...prev, 
                [version.id]: { ...(prev[version.id] || defaultYtData), [fieldKey]: e.target.value } 
              }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 text-sm"
              rows={6}
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap text-slate-400 leading-relaxed">{formatSocialText(value) || <span className="italic">Not generated</span>}</div>
          )}
        </div>
      );

      return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          {renderSection("Script / Storyline", ytData.script, "script", "yt-script")}
          {renderSection("Scene Breakdown", ytData.sceneBreakdown, "sceneBreakdown", "yt-scene")}
          {renderSection("Voice Prompt", ytData.voicePrompt, "voicePrompt", "yt-voice")}
          {renderSection("Video Prompt", ytData.videoPrompt, "videoPrompt", "yt-video")}
        </div>
      );
    }

    // Default Preview
    const contentStr = isEditing ? editValues[version.id] : (Array.isArray(version.content) ? version.content.join('\n\n') : version.content);
    const isOverLimit = limit && contentStr.length > limit;

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {isEditing ? (
          <textarea
            value={contentStr}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [version.id]: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:outline-none focus:border-emerald-500"
            rows={10}
          />
        ) : (
          <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed">{formatSocialText(contentStr)}</div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
           {limit ? (
             <span className={`text-sm ${isOverLimit ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                {contentStr.length} / {limit} chars
             </span>
           ) : (
             <span className="text-sm text-slate-500">{contentStr.length} chars</span>
           )}
           <button 
              onClick={() => handleCopy(contentStr, 'def-copy')}
              className="px-4 py-2 bg-blue-500/10 text-blue-400 font-bold rounded-lg hover:bg-blue-500/20 transition-colors"
           >
              {copiedStates['def-copy'] ? "Copied!" : "Copy All"}
           </button>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      {isYtGenerating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] pointer-events-none" />
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              YouTube Data Processing
            </h3>
            <div className="space-y-4 relative z-10">
              {ytSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-slate-700 shrink-0" />}
                  {step.status === 'processing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
                  {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {step.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                  
                  <span className={`text-sm font-bold ${
                    step.status === 'processing' ? 'text-blue-400' :
                    step.status === 'done' ? 'text-emerald-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-6 text-center font-medium italic">
              Sending requests sequentially to prevent rate limits...
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.push(`/admin/creators/${id}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Command Center
          </button>
          
          <button 
            onClick={() => handleGeneratePlatform()}
            disabled={isGeneratingAll}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Missing Platforms
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Original Post */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg capitalize">
                Source: {post.sourceSocialId}
              </span>
              <div className="flex justify-between items-start mb-4 mt-2">
                <h3 className="text-lg font-bold text-white">Original Post</h3>
                <button 
                  onClick={() => handleCopy(post.originalContent, 'original-post')}
                  className="text-slate-400 hover:text-white transition-colors" title="Copy Original Post">
                  {copiedStates['original-post'] ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {formatSocialText(post.originalContent)}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Platform Previews */}
          <div className="lg:col-span-8 flex flex-col min-h-[600px]">
            <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-px mb-6 hide-scrollbar">
              {availableSocials.map((socialId: string) => {
                const version = post.versions.find((v: any) => v.socialId === socialId);
                return (
                  <button
                    key={socialId}
                    onClick={() => setActiveTab(socialId)}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap capitalize flex items-center gap-2 ${
                      activeTab === socialId 
                        ? 'border-emerald-500 text-white bg-slate-800/30 rounded-t-xl' 
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/10 rounded-t-xl'
                    }`}
                  >
                    {socialId}
                    {version?.status === "failed" && <AlertCircle className="w-3 h-3 text-red-400" />}
                    {version?.status === "pending" && <Loader2 className="w-3 h-3 text-slate-500" />}
                  </button>
                );
              })}
            </div>

            {activeTab && (
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
                
                {!activeVersion ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-4 relative z-10 min-h-[300px]">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <MessageSquare className="w-8 h-8 text-slate-600" />
                    </div>
                    <p>No content generated for {activeTab} yet.</p>
                    <button 
                      onClick={() => handleGeneratePlatform(activeTab)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors mt-4"
                    >
                      {generatingPlatforms[activeTab] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {generatingPlatforms[activeTab] ? "Generating..." : "Generate Now"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                          activeVersion.status === 'ready' 
                            ? activeVersion.isEdited ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : activeVersion.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {activeVersion.status === 'ready' ? (activeVersion.isEdited ? 'Edited' : 'Generated') : activeVersion.status}
                        </span>
                      </div>

                      {activeVersion.status === 'ready' && (
                        <div className="flex gap-2">
                          {editingStates[activeVersion.id] ? (
                            <>
                              <button 
                                onClick={() => setEditingStates((prev) => ({ ...prev, [activeVersion.id]: false }))}
                                className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleSaveEdit(activeVersion)}
                                disabled={savingStates[activeVersion.id]}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-colors"
                              >
                                {savingStates[activeVersion.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                {savingStates[activeVersion.id] ? "Saving..." : "Save Edit"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEditing(activeVersion)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-slate-700"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button 
                                onClick={() => handleGeneratePlatform(activeVersion.socialId)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-slate-700"
                              >
                                <RefreshCw className="w-3 h-3" /> Regenerate
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 w-full max-w-3xl mx-auto space-y-6">
                      {renderPreview(activeVersion)}
                      
                      {/* PLATFORM-SPECIFIC IMAGE PROMPT */}
                      <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-6 shadow-xl relative overflow-hidden mt-6">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" /> Image Prompt
                          </h3>
                          {activeVersion.status === 'ready' && !editingStates[activeVersion.id] && (
                            <div className="flex gap-2">
                              <button onClick={() => handleRegenerateImagePrompt(activeVersion.socialId)} disabled={generatingPlatforms[`${activeVersion.socialId}-image`]} className="text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-50" title="Regenerate Prompt">
                                <RefreshCw className={`w-4 h-4 ${generatingPlatforms[`${activeVersion.socialId}-image`] ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {activeVersion.imagePrompt || editingStates[activeVersion.id] ? (
                          <div className="relative z-10">
                            {editingStates[activeVersion.id] ? (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-bold text-indigo-300 mb-1">Image Prompt</label>
                                  <textarea
                                    value={editValues[`${activeVersion.id}_imagePrompt`] || ""}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, [`${activeVersion.id}_imagePrompt`]: e.target.value }))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-indigo-200/80 text-sm focus:outline-none focus:border-indigo-500"
                                    rows={6}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-indigo-300 mb-1">Image URL (to display in preview)</label>
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={editValues[`${activeVersion.id}_imageUrl`] || ""}
                                      onChange={(e) => setEditValues((prev) => ({ ...prev, [`${activeVersion.id}_imageUrl`]: e.target.value }))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-indigo-200/80 text-sm focus:outline-none focus:border-indigo-500"
                                      placeholder="Paste link or upload..."
                                    />
                                    <div className="relative shrink-0">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => handleImageUpload(activeVersion.id, e)}
                                        disabled={uploadingStates[activeVersion.id]}
                                      />
                                      <button disabled={uploadingStates[activeVersion.id]} className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 px-4 py-3 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2 transition-colors">
                                        {uploadingStates[activeVersion.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                        Upload
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-indigo-200/80 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{activeVersion.imagePrompt}</p>
                            )}
                            {!editingStates[activeVersion.id] && (
                              <button 
                                onClick={() => handleCopy(activeVersion.imagePrompt, `img-prompt-${activeVersion.id}`)}
                                className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold rounded-xl transition-colors text-sm"
                              >
                                {copiedStates[`img-prompt-${activeVersion.id}`] ? "Copied!" : "Copy Prompt"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-sm italic">Image prompt not generated yet.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Resources & Attachments Area - Only for YouTube */}
        {activeTab === 'youtube' && (
          <div className="mt-12 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                Project Resources & Attachments
              </h3>
              <div className="flex gap-3">
                <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                  New Folder
                </button>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  Upload File
                </button>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 relative z-10 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <h4 className="text-white font-semibold mb-1">No attachments yet</h4>
              <p className="text-sm max-w-sm text-center">Add videos, audio, images, and other resources regarding this particular post. You can arrange them in folders.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
