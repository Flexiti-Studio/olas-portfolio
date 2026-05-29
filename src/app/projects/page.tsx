import { Header } from "@/components/layout/Header";
import Link from "next/link";

import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

const fallbackProjects = [
  {
    title: "FinTrack SaaS",
    type: "SaaS",
    description: "A comprehensive financial tracking tool built for small businesses with real-time data visualization and automated reporting.",
    tags: ["React", "Node.js", "PostgreSQL"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    slug: "fintrack-saas"
  },
  {
    title: "E-Commerce API",
    type: "Backend",
    description: "Scalable backend architecture for high-volume online retail platforms handling thousands of transactions per second.",
    tags: ["Python", "Django", "Redis"],
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
    slug: "e-commerce-api"
  },
  {
    title: "Nexus AI Chat",
    type: "AI/ML",
    description: "A modern conversational interface powered by LLMs, featuring streaming responses and markdown rendering.",
    tags: ["Next.js", "OpenAI", "Tailwind"],
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1932&auto=format&fit=crop",
    slug: "nexus-ai-chat"
  },
  {
    title: "TaskMaster App",
    type: "Mobile",
    description: "Cross-platform productivity application designed for remote teams with offline synchronization capabilities.",
    tags: ["React Native", "Firebase", "Redux"],
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop",
    slug: "taskmaster-app"
  },
  {
    title: "HealthDash",
    type: "Healthcare",
    description: "Secure patient management portal for clinics, complying with HIPAA regulations and featuring appointment scheduling.",
    tags: ["Vue.js", "Laravel", "MySQL"],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop",
    slug: "healthdash"
  },
  {
    title: "Crypto Watch",
    type: "Web3",
    description: "Real-time cryptocurrency tracker utilizing WebSocket connections for live price updates and alerts.",
    tags: ["Svelte", "WebSockets", "Go"],
    image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1969&auto=format&fit=crop",
    slug: "crypto-watch"
  }
];

export default async function ProjectsPage() {
  let allProjects = fallbackProjects;

  try {
    if (client) {
      const sanityProjects = await client.fetch(`*[_type == "project"] | order(_createdAt desc) {
        title,
        "slug": slug.current,
        type,
        description,
        tags,
        image
      }`);
      
      if (sanityProjects && sanityProjects.length > 0) {
        allProjects = sanityProjects.map((p: any) => ({
          ...p,
          image: p.image ? urlForImage(p.image)?.url() : 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop'
        }));
      }
    }
  } catch (error) {
    console.error("Failed to fetch all projects from Sanity, using dummy data:", error);
  }

  return (
    <div className="bg-background-light dark:bg-[#101623] text-[#111418] dark:text-white font-display overflow-x-hidden flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-12 pb-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto space-y-12">
          {/* Page Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Selected <span className="text-primary">Works</span>
              </h1>
              <p className="text-[#637588] dark:text-[#90a4cb] text-lg md:text-xl font-light leading-relaxed max-w-xl">
                A curated collection of web applications, design systems, and technical experiments focused on scalability and user experience.
              </p>
            </div>
          </header>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 py-4 border-b border-[#e5e7eb] dark:border-[#222f49]">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-[0_0_15px_rgba(13,89,242,0.2)] transition-all">
              <span className="material-symbols-outlined text-[18px]">apps</span>
              All Projects
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] border border-[#e5e7eb] dark:border-[#222f49] text-[#637588] dark:text-[#90a4cb] hover:text-[#111418] dark:hover:text-white text-sm font-medium transition-all group">
              <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">public</span>
              Web App
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] border border-[#e5e7eb] dark:border-[#222f49] text-[#637588] dark:text-[#90a4cb] hover:text-[#111418] dark:hover:text-white text-sm font-medium transition-all group">
              <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">smartphone</span>
              Mobile
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] border border-[#e5e7eb] dark:border-[#222f49] text-[#637588] dark:text-[#90a4cb] hover:text-[#111418] dark:hover:text-white text-sm font-medium transition-all group">
              <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">terminal</span>
              Open Source
            </button>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allProjects.map((project, index) => (
              <article key={index} className="group relative flex flex-col bg-white dark:bg-[#182234] border border-[#e5e7eb] dark:border-[#222f49] rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(13,89,242,0.2)] hover:-translate-y-1">
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#182234] via-transparent to-transparent opacity-60 z-10 pointer-events-none"></div>
                  <div 
                    className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                    style={{ backgroundImage: `url('${project.image}')` }}
                  ></div>
                  {/* Floating Tech Pill */}
                  {project.type && (
                    <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-2">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-white shadow-lg">{project.type}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col flex-grow p-6 gap-4 z-20">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-[#111418] dark:text-white group-hover:text-primary transition-colors">{project.title}</h3>
                      <span className="material-symbols-outlined text-[#637588] dark:text-[#90a4cb] group-hover:text-primary transition-transform group-hover:rotate-45">arrow_outward</span>
                    </div>
                    <p className="text-[#637588] dark:text-[#90a4cb] text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-[#e5e7eb] dark:border-[#222f49] flex flex-wrap gap-2">
                    {project.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md font-mono">{tag}</span>
                    ))}
                  </div>
                </div>
                <Link href={`/projects/${project.slug || project.title.toLowerCase().replace(/\s+/g, '-')}`} aria-label={`View ${project.title}`} className="absolute inset-0 z-30"></Link>
              </article>
            ))}
          </div>

          {/* View More Button */}
          <div className="flex justify-center pt-10">
            <button className="group flex items-center gap-3 px-8 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] transition-all hover:border-primary/50 shadow-sm">
              <span className="text-sm font-bold text-[#111418] dark:text-white">Load More Projects</span>
              <span className="material-symbols-outlined text-primary group-hover:translate-y-1 transition-transform">expand_more</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
