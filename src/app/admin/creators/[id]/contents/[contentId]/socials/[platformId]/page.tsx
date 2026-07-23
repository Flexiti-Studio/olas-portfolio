"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, MessageSquare, Download, CheckCircle, Upload, Eye, ThumbsUp, ThumbsDown, Heart, MessageCircle, Share, Bookmark, MoreHorizontal, MoreVertical, Repeat, Globe, Send, Search, Loader2, Plus, X, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const platformConfig: Record<string, { name: string; color: string; format: string }> = {
  ig: { name: "Instagram Reel", color: "from-yellow-500 via-pink-500 to-purple-500", format: "9:16 Vertical" },
  ig_image: { name: "Instagram Image Post", color: "from-yellow-400 via-red-500 to-purple-600", format: "1:1 Square Image" },
  tk: { name: "TikTok Hook", color: "from-gray-900 to-black", format: "9:16 Vertical" },
  yt: { name: "YouTube Shorts", color: "from-red-600 to-red-700", format: "9:16 Vertical" },
  yt_video: { name: "YouTube Main Video", color: "from-red-650 to-red-850", format: "16:9 Landscape Video" },
  x: { name: "Twitter Thread", color: "from-slate-800 to-slate-900", format: "Text & Image" },
  in: { name: "LinkedIn Post", color: "from-blue-600 to-blue-800", format: "Text & Image" },
  fb: { name: "Facebook Watch", color: "from-blue-500 to-blue-700", format: "1:1 Square / 16:9" },
};

export default function SocialDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const contentId = params.contentId as string;
  const platformId = params.platformId as string;

  const [activeTab, setActiveTab] = useState("draft");
  const [copiedData, setCopiedData] = useState<string | null>(null);

  const [primaryCaption, setPrimaryCaption] = useState("The moment we realized the VR headset was actually draining MORE battery than it was saving... 🤯🔋\n\nFull 50-hour survival video dropping tomorrow on the main channel!");
  const [primaryMedia, setPrimaryMedia] = useState<'video' | 'image' | null>('video');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % uploadedImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + uploadedImages.length) % uploadedImages.length);
  };

  const [threadTweets, setThreadTweets] = useState([
    { id: 1, text: "The moment we realized the VR headset was actually draining MORE battery than it was saving... 🤯🔋\n\nA thread on surviving 50 hours in the metaverse. 🧵👇", media: "video" },
    { id: 2, text: "1/ We started by hot-wiring 3 external battery packs. The Quest 3 only lasts 2 hours on a charge, but we needed it to run continuously for 50 hours without taking it off.", media: null },
    { id: 3, text: "2/ Full video reveals the psychological toll of not seeing the real world for 2 days. Link below to watch it before we get banned! 👇🎥", media: "link" }
  ]);

  const addTweet = () => {
    setThreadTweets([...threadTweets, { id: Date.now(), text: "", media: null }]);
  };

  const updateTweet = (id: number, field: string, value: any) => {
    setThreadTweets(threadTweets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleCopy = (type: string) => {
    setCopiedData(type);
    setTimeout(() => setCopiedData(null), 2500);
  };

  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetch(`/api/creators/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data.project);
        const contentItem = data.project?.contents?.find((c: any) => String(c.id) === String(contentId));
        if (contentItem && contentItem.socials && contentItem.socials[platformId]) {
          const text = contentItem.socials[platformId];
          setPrimaryCaption(text);
          
          if (platformId === "x") {
            const tweets = text.split("\n\n").filter((t: string) => t.trim().length > 0);
            setThreadTweets(tweets.map((tweetText: string, index: number) => ({
              id: index + 1,
              text: tweetText,
              media: index === 0 ? "video" : null
            })));
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id, contentId, platformId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const config = platformConfig[platformId] || { name: "Social Post", color: "from-slate-700 to-slate-800", format: "Standard" };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`w-12 h-12 bg-gradient-to-tr ${config.color} text-white flex items-center justify-center rounded-xl shadow-lg shrink-0`}>
             <span className="font-bold text-sm uppercase">{platformId}</span>
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{config.name} Draft</h1>
              <span className="w-fit px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold uppercase tracking-wider">
                Pending Edit
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">Format: {config.format} • Target Duration: 60s</p>
          </div>
          <div className="ml-auto hidden md:flex gap-3">
             <button className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
               Request Revisions
             </button>
             <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20">
               <CheckCircle className="w-4 h-4" /> Approve Draft
             </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex gap-2 border-b border-slate-800 mb-6 overflow-x-auto">
          {['draft', 'copy & tags', 'feedback'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-blue-500 text-white bg-slate-800/50 rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded-t-xl'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Media Preview (NATIVE MOCKUP) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2 self-start">
                <Eye className="w-5 h-5 text-blue-400" /> Platform Preview
              </h3>
              
              {/* Instagram Reel Mockup */}
              {platformId === 'ig' && (
                <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-[2.5rem] border-[8px] border-slate-800 relative overflow-hidden shadow-2xl flex flex-col justify-end pb-6 text-white">
                   <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between px-6 pt-4">
                      <span className="font-bold">Reels</span>
                      <div className="w-6 h-6 rounded border-2 border-white flex items-center justify-center"><Play className="w-3 h-3 fill-white" /></div>
                   </div>
                   {/* Video/Image Placeholder */}
                   {primaryMedia === 'video' && (
                     <div className="absolute inset-0 bg-slate-900 z-0 flex items-center justify-center">
                       <Play className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {primaryMedia === 'image' && (
                     <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 z-0 flex items-center justify-center">
                       <Eye className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {/* Right Action Bar */}
                   <div className="absolute right-4 bottom-20 z-20 flex flex-col items-center gap-6">
                     <div className="flex flex-col items-center gap-1"><Heart className="w-7 h-7" /><span className="text-xs font-medium">12K</span></div>
                     <div className="flex flex-col items-center gap-1"><MessageCircle className="w-7 h-7" /><span className="text-xs font-medium">450</span></div>
                     <div className="flex flex-col items-center gap-1"><Share className="w-7 h-7" /><span className="text-xs font-medium">1.2K</span></div>
                     <MoreHorizontal className="w-6 h-6 mt-2" />
                   </div>
                   {/* Bottom Details */}
                   <div className="z-20 px-4 w-[85%]">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 p-[2px]"><div className="w-full h-full bg-slate-800 rounded-full"></div></div>
                       <span className="font-bold text-sm text-white">@flexitistudio</span>
                       <button className="px-2 py-0.5 rounded border border-white text-xs font-bold ml-1">Follow</button>
                     </div>
                     <p className="text-sm font-medium line-clamp-2 shadow-black drop-shadow-md whitespace-pre-wrap">{primaryCaption || "..."}</p>
                     <div className="flex items-center gap-2 mt-2 bg-white/20 px-2 py-1 rounded-full w-fit backdrop-blur-sm">
                        <Play className="w-3 h-3 fill-white" /> <span className="text-xs font-bold">Original Audio</span>
                     </div>
                   </div>
                </div>
              )}

              {/* Instagram Image Post Mockup */}
              {platformId === 'ig_image' && (
                <div className="w-full max-w-[340px] bg-black rounded-3xl border-8 border-slate-800 relative overflow-hidden shadow-2xl flex flex-col text-white font-sans">
                  {/* IG Post Header */}
                  <div className="p-3 flex items-center justify-between border-b border-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 p-[2px] shrink-0">
                        <div className="w-full h-full bg-slate-800 rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white hover:underline cursor-pointer">@flexitistudio</p>
                        <p className="text-[10px] text-slate-500">Original Audio</p>
                      </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
                  </div>

                  {/* Square Image Area (1:1 Aspect Ratio) */}
                  <div className="w-full aspect-square bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 relative">
                    {uploadedImages.length > 0 ? (
                      <div className="w-full h-full relative group">
                        <img src={uploadedImages[currentImageIndex]} alt="Post" className="w-full h-full object-cover transition-all" />
                        {uploadedImages.length > 1 && (
                          <>
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold text-white z-20">
                              {currentImageIndex + 1}/{uploadedImages.length}
                            </div>
                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {/* Dots */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                              {uploadedImages.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImageIndex ? 'bg-blue-500' : 'bg-white/50'}`} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <Eye className="w-12 h-12 text-white/10" />
                        <span className="text-xs text-white/30 font-bold uppercase tracking-widest mt-2">1:1 Square Image</span>
                      </>
                    )}
                  </div>

                  {/* IG Actions Bar */}
                  <div className="p-3 flex justify-between items-center text-slate-200">
                    <div className="flex gap-4">
                      <Heart className="w-6 h-6 hover:text-pink-500 cursor-pointer" />
                      <MessageCircle className="w-6 h-6 hover:text-slate-400 cursor-pointer" />
                      <Send className="w-6 h-6 hover:text-blue-400 cursor-pointer" />
                    </div>
                    <Bookmark className="w-6 h-6 hover:text-yellow-500 cursor-pointer" />
                  </div>

                  {/* Caption Text Area */}
                  <div className="px-3 pb-4 space-y-1">
                    <p className="text-xs text-white"><span className="font-bold mr-1.5">@flexitistudio</span>{primaryCaption || "..."}</p>
                    <p className="text-[10px] text-slate-550 mt-2 uppercase font-semibold">2 hours ago</p>
                  </div>
                </div>
              )}

              {/* TikTok Mockup */}
              {platformId === 'tk' && (
                <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-[2.5rem] border-[8px] border-slate-800 relative overflow-hidden shadow-2xl flex flex-col justify-end pb-4 text-white">
                   <div className="absolute top-0 w-full flex justify-center gap-4 pt-6 z-10 drop-shadow-md font-bold text-slate-300 text-sm">
                      <span>Following</span><span className="text-white border-b-2 border-white pb-1">For You</span>
                   </div>
                   {primaryMedia === 'video' && (
                     <div className="absolute inset-0 bg-slate-900 z-0 flex items-center justify-center">
                       <Play className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {primaryMedia === 'image' && (
                     <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 z-0 flex items-center justify-center">
                       <Eye className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {/* Right Action Bar */}
                   <div className="absolute right-4 bottom-16 z-20 flex flex-col items-center gap-5">
                     <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-800 mb-2 relative">
                       <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px]">+</div>
                     </div>
                     <div className="flex flex-col items-center gap-1"><Heart className="w-8 h-8 fill-white" /><span className="text-xs font-medium">34.5K</span></div>
                     <div className="flex flex-col items-center gap-1"><MessageSquare className="w-8 h-8 fill-white" /><span className="text-xs font-medium">892</span></div>
                     <div className="flex flex-col items-center gap-1"><Bookmark className="w-8 h-8 fill-white" /><span className="text-xs font-medium">12K</span></div>
                     <div className="flex flex-col items-center gap-1"><Share className="w-8 h-8 fill-white" /><span className="text-xs font-medium">4.2K</span></div>
                     <div className="w-10 h-10 rounded-full bg-slate-800 border-[8px] border-zinc-900 animate-spin mt-4"></div>
                   </div>
                   {/* Bottom Details */}
                   <div className="z-20 px-4 w-[85%]">
                     <span className="font-bold text-base text-white">@flexitistudio</span>
                     <p className="text-sm font-medium mt-1 drop-shadow-md whitespace-pre-wrap line-clamp-3">{primaryCaption || "..."}</p>
                     <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm font-bold">♫ flexitistudio - Original Sound</span>
                     </div>
                   </div>
                </div>
              )}

              {/* Twitter / X Thread Mockup */}
              {platformId === 'x' && (
                <div className="w-full bg-black rounded-2xl border border-slate-800 p-4 pb-2 text-white shadow-xl flex flex-col relative font-sans">
                  
                  {threadTweets.map((tweet, i) => (
                  <div key={tweet.id} className="flex gap-3 relative z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 flex items-center justify-center overflow-hidden"><div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-500 opacity-80"></div></div>
                      {i !== threadTweets.length - 1 && (
                        <div className="w-[2px] flex-grow bg-slate-800 my-1"></div>
                      )}
                    </div>
                    <div className={`w-full ${i !== threadTweets.length - 1 ? 'pb-4' : 'pb-2'}`}>
                       <div className="flex items-center gap-1">
                         <span className="font-bold text-[15px]">Flexiti Studio</span>
                         <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400" />
                         <span className="text-slate-500 text-sm">@flexitistudio • 2h</span>
                       </div>
                       <p className="text-[15px] mt-1 mb-3 leading-normal whitespace-pre-wrap">{tweet.text || "..."}</p>
                       
                       {tweet.media === 'video' && (
                         <div className="w-full aspect-video bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden mb-3">
                           <Play className="w-10 h-10 text-white/50" />
                         </div>
                       )}

                       {tweet.media === 'image' && (
                         <div className="w-full aspect-video bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden mb-3 bg-gradient-to-tr from-slate-800 to-slate-700">
                           <Eye className="w-10 h-10 text-white/20" />
                         </div>
                       )}

                       {tweet.media === 'link' && (
                         <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-2 mb-3">
                             <div className="h-24 bg-slate-800 flex items-center justify-center"><Play className="w-6 h-6 text-white/30" /></div>
                             <div className="p-3">
                                <p className="text-sm text-slate-400">youtube.com</p>
                                <p className="text-sm text-white font-medium">Link Preview Title</p>
                             </div>
                         </div>
                       )}

                       <div className="flex justify-between items-center text-slate-500 mt-1 max-w-md">
                         <div className="flex items-center gap-2 hover:text-blue-400 group cursor-pointer"><MessageCircle className="w-4 h-4" /><span className="text-xs group-hover:text-blue-400">12</span></div>
                         <div className="flex items-center gap-2 hover:text-green-400 group cursor-pointer"><Repeat className="w-4 h-4" /><span className="text-xs group-hover:text-green-400">45</span></div>
                         <div className="flex items-center gap-2 hover:text-pink-500 group cursor-pointer"><Heart className="w-4 h-4" /><span className="text-xs group-hover:text-pink-500">302</span></div>
                         <div className="flex items-center gap-2 hover:text-blue-400 group cursor-pointer"><Share className="w-4 h-4" /></div>
                       </div>
                    </div>
                  </div>
                  ))}

                </div>
              )}

              {/* LinkedIn Mockup */}
              {platformId === 'in' && (
                <div className="w-full bg-white rounded-xl border border-slate-300 pb-2 text-slate-900 shadow-xl overflow-hidden font-sans">
                  {/* LinkedIn Header */}
                  <div className="p-4 flex gap-3">
                     <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                       <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-80"></div>
                     </div>
                     <div className="flex flex-col justify-center">
                       <span className="font-bold text-sm leading-tight hover:text-blue-600 hover:underline cursor-pointer">Flexiti Studio</span>
                       <span className="text-xs text-slate-500 leading-tight line-clamp-1 mt-0.5">Creative Agency • Digital Production</span>
                       <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">2h • <Globe className="w-3 h-3"/></span>
                     </div>
                  </div>
                  
                  {/* Text Content */}
                  <div className="px-4 pb-3 text-[14px] whitespace-pre-wrap leading-relaxed text-slate-800">
                     {primaryCaption || "..."}
                  </div>

                  {/* Media */}
                  {primaryMedia === 'video' && (
                    <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                      <Play className="w-12 h-12 text-white/80" />
                    </div>
                  )}
                  {primaryMedia === 'image' && (
                    <div className="w-full aspect-video bg-slate-200 flex items-center justify-center overflow-hidden">
                      <Eye className="w-12 h-12 text-slate-400" />
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="px-4 py-2 border-b border-slate-200 flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-white z-20"><ThumbsUp className="w-2 h-2 text-white fill-white"/></div>
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-white z-10"><Heart className="w-2 h-2 text-white fill-white"/></div>
                      </div>
                      <span className="ml-1 hover:text-blue-600 hover:underline cursor-pointer">1,245</span>
                    </div>
                    <div className="hover:text-blue-600 hover:underline cursor-pointer">
                      124 comments • 45 reposts
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-2 pt-1 flex justify-between items-center text-slate-600 font-semibold text-sm">
                    <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><ThumbsUp className="w-5 h-5"/> Like</button>
                    <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><MessageSquare className="w-5 h-5"/> Comment</button>
                    <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><Repeat className="w-5 h-5"/> Repost</button>
                    <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><Send className="w-5 h-5"/> Send</button>
                  </div>
                </div>
              )}

              {/* YouTube Shorts Mockup */}
              {platformId === 'yt' && (
                <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-[2.5rem] border-[8px] border-slate-800 relative overflow-hidden shadow-2xl flex flex-col justify-end pb-4 text-white">
                   <div className="absolute top-0 w-full flex justify-between items-center px-6 pt-6 z-10 drop-shadow-md">
                      <span className="font-bold text-white text-lg">Shorts</span>
                      <div className="flex gap-4">
                        <Search className="w-6 h-6" />
                        <MoreVertical className="w-6 h-6" />
                      </div>
                   </div>
                   {primaryMedia === 'video' && (
                     <div className="absolute inset-0 bg-slate-900 z-0 flex items-center justify-center">
                       <Play className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {primaryMedia === 'image' && (
                     <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-800 z-0 flex items-center justify-center">
                       <Eye className="w-12 h-12 text-white/20" />
                     </div>
                   )}
                   {/* Right Action Bar */}
                   <div className="absolute right-4 bottom-16 z-20 flex flex-col items-center gap-5">
                     <div className="flex flex-col items-center gap-1"><ThumbsUp className="w-7 h-7 fill-white" /><span className="text-xs font-medium">1.2M</span></div>
                     <div className="flex flex-col items-center gap-1"><ThumbsDown className="w-7 h-7" /><span className="text-xs font-medium">Dislike</span></div>
                     <div className="flex flex-col items-center gap-1"><MessageSquare className="w-7 h-7 fill-white" /><span className="text-xs font-medium">4,582</span></div>
                     <div className="flex flex-col items-center gap-1"><Share className="w-7 h-7 fill-white" /><span className="text-xs font-medium">Share</span></div>
                     <div className="flex flex-col items-center gap-1"><Repeat className="w-7 h-7 fill-white" /><span className="text-xs font-medium">Remix</span></div>
                     <div className="w-10 h-10 rounded-lg bg-slate-800 mt-2 border-2 border-white/20 overflow-hidden">
                       <div className="w-full h-full bg-gradient-to-tr from-red-500 to-orange-500"></div>
                     </div>
                   </div>
                   {/* Bottom Details */}
                   <div className="z-20 px-4 w-[85%]">
                     <div className="flex items-center gap-2 mb-2">
                       <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden"><div className="w-full h-full bg-gradient-to-tr from-red-500 to-orange-500"></div></div>
                       <span className="font-bold text-sm text-white">@flexitistudio</span>
                       <button className="px-3 py-1 bg-white text-black rounded-full text-xs font-bold ml-1">Subscribe</button>
                     </div>
                     <p className="text-sm font-medium mt-1 drop-shadow-md whitespace-pre-wrap line-clamp-2 mb-2">{primaryCaption || "..."}</p>
                     <div className="flex items-center gap-2">
                        <Play className="w-3 h-3 fill-white" /> <span className="text-sm font-medium">flexitistudio • Original audio</span>
                     </div>
                   </div>
                </div>
              )}

              {/* YouTube Main Video Mockup */}
              {platformId === 'yt_video' && (
                <div className="w-full bg-zinc-950 rounded-2xl border border-zinc-900 p-4 text-white shadow-xl flex flex-col font-sans max-w-[500px]">
                  {/* Large 16:9 Landscape Video screen */}
                  <div className="w-full aspect-video bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden relative shadow-inner group">
                    <Play className="w-14 h-14 text-white/80 group-hover:scale-110 transition-transform cursor-pointer" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-white/60 bg-black/45 px-2.5 py-1 rounded backdrop-blur-sm pointer-events-none">
                      <span>0:00 / 12:45</span>
                      <span>1080p HD</span>
                    </div>
                  </div>

                  {/* Video details */}
                  <div className="mt-4 space-y-2">
                    <h2 className="font-bold text-base leading-snug text-white line-clamp-2">{project?.name || "Main Video Draft"}</h2>
                    
                    <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-900 pb-3">
                      <span>1.2K views • 2 hours ago</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer"><ThumbsUp className="w-4 h-4"/> 456</span>
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer"><ThumbsDown className="w-4 h-4"/> Dislike</span>
                        <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Share className="w-4 h-4"/> Share</span>
                      </div>
                    </div>

                    {/* Channel line */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 shrink-0"></div>
                        <div>
                          <p className="text-xs font-bold text-white hover:text-red-400 cursor-pointer">Flexiti Studio</p>
                          <p className="text-[10px] text-zinc-500">1.4M subscribers</p>
                        </div>
                      </div>
                      <button className="bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer">Subscribe</button>
                    </div>

                    {/* Video Description Box */}
                    <div className="bg-zinc-905 hover:bg-zinc-900 border border-zinc-900 p-3.5 rounded-xl text-xs text-zinc-350 leading-relaxed font-mono whitespace-pre-wrap mt-2 select-all cursor-text max-h-[140px] overflow-y-auto">
                      {primaryCaption || "No description generated."}
                    </div>
                  </div>
                </div>
              )}

              {/* Facebook Mockup */}
              {platformId === 'fb' && (
                <div className="w-full bg-white rounded-xl border border-slate-300 pb-2 text-slate-900 shadow-xl overflow-hidden font-sans max-w-[500px]">
                  {/* Header */}
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-80"></div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[15px] hover:underline cursor-pointer">Flexiti Studio</span>
                          <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500" />
                        </div>
                        <div className="flex items-center gap-1 text-[13px] text-slate-500">
                          <span>2 h</span>
                          <span>·</span>
                          <Globe className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-slate-500">
                      <MoreHorizontal className="w-5 h-5 cursor-pointer hover:bg-slate-100 rounded-full" />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 cursor-pointer hover:bg-slate-100 rounded-full p-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                  </div>
                  
                  {/* Text Content */}
                  <div className="px-4 pb-3 text-[15px] whitespace-pre-wrap leading-normal text-slate-900">
                     {primaryCaption || "..."}
                  </div>

                  {/* Media */}
                  {primaryMedia === 'video' && (
                    <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                      <Play className="w-16 h-16 text-white/80" />
                    </div>
                  )}
                  {primaryMedia === 'image' && (
                    <div className="w-full aspect-video bg-slate-200 flex items-center justify-center overflow-hidden relative">
                      {uploadedImages.length > 0 ? (
                        <div className="w-full h-full relative group">
                          <img src={uploadedImages[currentImageIndex]} alt="Post" className="w-full h-full object-cover transition-all" />
                          {uploadedImages.length > 1 && (
                            <>
                              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Eye className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="px-4 py-2.5 flex justify-between items-center text-[13px] text-slate-500 border-b border-slate-200 mx-4">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center border border-white z-20"><ThumbsUp className="w-2.5 h-2.5 text-white fill-white"/></div>
                        <div className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center border border-white z-10"><Heart className="w-2.5 h-2.5 text-white fill-white"/></div>
                      </div>
                      <span className="hover:underline cursor-pointer">1.2K</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="hover:underline cursor-pointer">45 comments</span>
                      <span className="hover:underline cursor-pointer">12 shares</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-2 pt-1 flex justify-between items-center text-slate-500 font-semibold text-[14px]">
                    <button className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><ThumbsUp className="w-5 h-5"/> Like</button>
                    <button className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><MessageSquare className="w-5 h-5"/> Comment</button>
                    <button className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><Send className="w-5 h-5"/> Send</button>
                    <button className="flex-1 py-2 flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"><Share className="w-5 h-5"/> Share</button>
                  </div>
                </div>
              )}

              {/* Generic Mockup */}
              {(!['ig', 'ig_image', 'tk', 'x', 'in', 'yt', 'yt_video', 'fb'].includes(platformId)) && (
                <div className="w-full bg-slate-950 rounded-2xl border border-slate-800 p-4 text-white shadow-xl">
                  <div className="flex gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0"></div>
                     <div>
                       <div className="flex items-center gap-1">
                         <span className="font-bold">Flexiti Studio</span>
                         <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400" />
                         <span className="text-slate-500 text-sm">@flexitistudio • 2h</span>
                       </div>
                       <p className="text-sm mt-1 mb-3 whitespace-pre-wrap">{primaryCaption || "..."}</p>
                       
                       {primaryMedia === 'video' && (
                         <div className="w-full aspect-video bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
                           <Play className="w-10 h-10 text-white/50" />
                         </div>
                       )}
                       
                       {primaryMedia === 'image' && (
                         <div className="w-full aspect-video bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 relative">
                            {uploadedImages.length > 0 ? (
                              <div className="w-full h-full relative group">
                                <img src={uploadedImages[currentImageIndex]} alt="Post" className="w-full h-full object-cover transition-all" />
                                {uploadedImages.length > 1 && (
                                  <>
                                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <Eye className="w-10 h-10 text-white/20" />
                            )}
                         </div>
                       )}
                       <div className="flex justify-between items-center text-slate-500 mt-3 px-2">
                         <MessageCircle className="w-4 h-4 hover:text-blue-400" />
                         <Repeat className="w-4 h-4 hover:text-green-400" />
                         <Heart className="w-4 h-4 hover:text-pink-500" />
                         <Share className="w-4 h-4 hover:text-blue-400" />
                       </div>
                     </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  handleCopy('Video Media');
                  alert("Original media is downloading...");
                }}
                className="w-full mt-6 bg-slate-950 border border-slate-800 hover:border-blue-500 hover:text-blue-400 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Original Media
              </button>
            </div>
          </div>

          {/* Right Column - Publishing Toolkit */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                   <h3 className="font-bold text-white text-xl flex items-center gap-2">
                     <CheckCircle className="w-6 h-6 text-emerald-400" /> Publishing Toolkit
                   </h3>
                   <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase">Ready to Post</span>
                </div>

                <div className="space-y-6">
                  {/* Caption / Thread */}
                  {platformId === 'x' ? (
                     <div className="space-y-4">
                        {threadTweets.map((tweet, i) => (
                           <div key={tweet.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative group transition-colors">
                             <div className="flex justify-between items-center mb-2">
                               <label className="text-xs font-bold text-slate-500 uppercase">Tweet {i + 1} ({tweet.text.length}/280)</label>
                               <button onClick={() => { handleCopy(tweet.id.toString()); navigator.clipboard.writeText(tweet.text); }} className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors cursor-pointer bg-blue-500/10 px-3 py-1.5 rounded flex items-center gap-1.5">
                                 <Copy className="w-3 h-3" />
                                 {copiedData === tweet.id.toString() ? 'Copied!' : 'Copy Text'}
                               </button>
                             </div>
                             <textarea 
                               value={tweet.text}
                               onChange={(e) => updateTweet(tweet.id, 'text', e.target.value)}
                               className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                               rows={3}
                               placeholder="What's happening?"
                             />
                             <div className="flex gap-2 mt-3">
                                <button 
                                  onClick={() => updateTweet(tweet.id, 'media', tweet.media === 'image' ? null : 'image')} 
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${tweet.media === 'image' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                >
                                  + Image
                                </button>
                                <button 
                                  onClick={() => updateTweet(tweet.id, 'media', tweet.media === 'video' ? null : 'video')} 
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${tweet.media === 'video' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                >
                                  + Video
                                </button>
                                <button 
                                  onClick={() => updateTweet(tweet.id, 'media', tweet.media === 'link' ? null : 'link')} 
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${tweet.media === 'link' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                >
                                  + Link
                                </button>
                             </div>
                           </div>
                        ))}
                        <button 
                          onClick={addTweet}
                          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
                        >
                          + Add Tweet to Thread
                        </button>
                     </div>
                  ) : (
                     <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative group transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Primary Caption</label>
                          <button onClick={() => { handleCopy(primaryCaption); navigator.clipboard.writeText(primaryCaption); }} className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors cursor-pointer bg-blue-500/10 px-3 py-1.5 rounded flex items-center gap-1.5">
                            <Copy className="w-3 h-3" />
                            {copiedData === primaryCaption ? 'Copied!' : 'Copy Text'}
                          </button>
                        </div>
                        <textarea 
                          value={primaryCaption}
                          onChange={(e) => setPrimaryCaption(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none min-h-[120px]"
                          placeholder="What's your caption?"
                        />
                        <div className="flex gap-2 mt-3">
                           <button 
                             onClick={() => setPrimaryMedia(primaryMedia === 'image' ? null : 'image')} 
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${primaryMedia === 'image' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                           >
                             + Image
                           </button>
                           <button 
                             onClick={() => setPrimaryMedia(primaryMedia === 'video' ? null : 'video')} 
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${primaryMedia === 'video' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                           >
                             + Video
                           </button>
                        </div>

                        {/* Multiple Images Uploader */}
                        <div className="mt-5 border-t border-slate-800 pt-4">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Attached Media (Photos & Thumbnails)</label>
                          <div className="flex flex-wrap gap-3">
                            {uploadedImages.map((img, idx) => (
                               <div key={idx} className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative group">
                                 <img src={img} alt="uploaded media" className="w-full h-full object-cover" />
                                 <button onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md">
                                   <X className="w-3 h-3" />
                                 </button>
                               </div>
                            ))}
                            <button onClick={() => setUploadedImages(prev => [...prev, "https://picsum.photos/300/300?random=" + Math.random()])} className="w-16 h-16 bg-slate-900 border border-slate-700 border-dashed rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500 transition-colors cursor-pointer">
                               <Plus className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                     </div>
                  )}

                  {/* Tags / Hashtags */}
                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold text-slate-500 uppercase">Hashtags & Mentions</label>
                       <button onClick={() => handleCopy('Tags')} className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors cursor-pointer bg-blue-500/10 px-2 py-1 rounded">
                         {copiedData === 'Tags' ? 'Copied!' : 'Copy Tags'}
                       </button>
                     </div>
                     <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-2 hover:border-slate-700 transition-colors">
                        {['#VRChallenge', '#TechSurvival', '#VisionPro', '#BehindTheScenes', '@SponsorBrand'].map(tag => (
                           <span key={tag} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-300">{tag}</span>
                        ))}
                     </div>
                  </div>

                  {/* Audio / Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Trending Audio Link</label>
                       <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl hover:border-slate-700 transition-colors">
                          <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0"><Play className="w-4 h-4" /></div>
                          <input type="text" readOnly value="https://audio.link/trend/123" className="bg-transparent border-none outline-none text-xs text-slate-400 w-full" />
                          <button onClick={() => handleCopy('Audio Link')} className="px-3 py-1.5 bg-slate-800 rounded text-xs font-bold text-white shrink-0 hover:bg-slate-700 transition-colors cursor-pointer">
                            {copiedData === 'Audio Link' ? 'Copied!' : 'Copy'}
                          </button>
                       </div>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Link in Bio / Call to Action</label>
                       <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl hover:border-slate-700 transition-colors">
                          <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4" /></div>
                          <input type="text" readOnly value="https://flexiti.link/vr-vid" className="bg-transparent border-none outline-none text-xs text-slate-400 w-full" />
                          <button onClick={() => handleCopy('Bio Link')} className="px-3 py-1.5 bg-slate-800 rounded text-xs font-bold text-white shrink-0 hover:bg-slate-700 transition-colors cursor-pointer">
                            {copiedData === 'Bio Link' ? 'Copied!' : 'Copy'}
                          </button>
                       </div>
                     </div>
                  </div>

                  <button className={`w-full mt-8 bg-gradient-to-r ${config.color} hover:opacity-90 text-white font-bold py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-900/20 text-lg flex items-center justify-center gap-2`}>
                    <Upload className="w-5 h-5" /> Proceed to Publish on {config.name}
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {copiedData && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border border-emerald-500 font-sans"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm">{copiedData} Copied Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
