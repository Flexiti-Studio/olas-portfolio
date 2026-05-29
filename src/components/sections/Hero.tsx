"use client";

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeroData {
  availability?: string;
  greeting?: string;
  headline?: string;
  description?: string;
  tags?: string[];
}

export function Hero({ data }: { data?: HeroData }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Manually force play on mount to bypass strict browser autoplay blocking
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((e) => console.log("Autoplay prevented:", e));
    }
  }, []);

  return (
    <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden bg-black border-b border-[#e5e7eb] dark:border-[#222f49]">
      {/* Video Background */}
      <video
        ref={videoRef}
        src="/video/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        poster="/images/hero-image.png"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent dark:from-[#0a0f1e]/95 dark:via-[#0a0f1e]/80 dark:to-transparent backdrop-blur-[2px]" />

      <div className="relative z-10 w-full px-4 md:px-10 max-w-[1280px] mx-auto py-20 lg:py-32">
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="flex flex-col gap-4 text-left">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/20 dark:bg-primary/30 px-3 py-1 text-xs font-bold text-primary dark:text-blue-300 uppercase tracking-wide backdrop-blur-md border border-primary/20">
              <span className="size-2 rounded-full bg-green-500 animate-pulse"></span> {data?.availability || 'Available for work'}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#111418] dark:text-white drop-shadow-sm">
              {data?.greeting || "Hi, I'm Ola Olasunkanmi."}
            </h2>
            <h1 className="text-[#111418] dark:text-white text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight drop-shadow-lg">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">{data?.headline || "Building scalable SaaS & AI systems."}</span>
            </h1>
            <h2 className="text-[#334155] dark:text-[#cbd5e1] text-lg sm:text-xl font-medium leading-relaxed max-w-2xl drop-shadow-md whitespace-pre-line">
              {data?.description || "I’m a full-stack developer based in Lagos, Nigeria. I specialize in building MVPs, SaaS platforms, and AI-powered systems using modern technologies like Next.js, Node.js, and React Native.\n\nI help startups, businesses, and educational organizations transform ideas into scalable digital products."}
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-6">
            <Link className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 transition-all duration-300" href="#projects">
              View Projects
            </Link>
            <Link className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 bg-white/80 dark:bg-[#1a2332]/80 backdrop-blur-md border border-[#e5e7eb] dark:border-[#2f3e5e] text-[#111418] dark:text-white text-lg font-bold leading-normal tracking-[0.015em] hover:bg-white dark:hover:bg-[#2f3e5e] transition-all shadow-lg hover:-translate-y-1" href="#contact">
              Hire Me
            </Link>
            <Link className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-8 border-2 border-primary/30 text-primary dark:text-blue-400 text-lg font-bold leading-normal tracking-[0.015em] hover:border-primary/80 transition-all backdrop-blur-sm shadow-lg hover:-translate-y-1" href="#contact">
              Book a Consultation
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-8 opacity-90 drop-shadow-md">
            {(data?.tags || ['Full-Stack Developer', 'SaaS Builder', 'Mobile Developer', 'AI Systems Enthusiast']).map((tag, index, array) => (
              <div key={tag} className="flex items-center gap-x-6 gap-y-3">
                <span className="text-sm font-bold text-[#111418] dark:text-white">{tag}</span>
                {index < array.length - 1 && (
                  <span className="size-1.5 rounded-full bg-primary"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-[#151c2b] to-transparent pointer-events-none z-10" />
    </section>
  );
}
