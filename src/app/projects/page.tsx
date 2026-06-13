import { Header } from "@/components/layout/Header";
import { FilterableProjects } from "@/components/sections/FilterableProjects";

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

const fallbackCategories = [
  { title: "Web App", slug: "web-app" },
  { title: "Mobile", slug: "mobile" },
  { title: "Open Source", slug: "open-source" }
];

const fallbackProjectsWithCategories = fallbackProjects.map(p => {
  let cats: { title: string; slug: string }[] = [];
  if (p.type === "SaaS" || p.type === "Backend" || p.type === "Healthcare" || p.type === "Web3" || p.type === "AI/ML") {
    cats.push({ title: "Web App", slug: "web-app" });
  } else if (p.type === "Mobile") {
    cats.push({ title: "Mobile", slug: "mobile" });
  }
  if (p.type === "AI/ML" || p.type === "Web3") {
    cats.push({ title: "Open Source", slug: "open-source" });
  }
  return {
    ...p,
    categories: cats
  };
});

export default async function ProjectsPage() {
  let allProjects = fallbackProjectsWithCategories;
  let allCategories = fallbackCategories;

  try {
    if (client) {
      const [sanityProjects, sanityCategories] = await Promise.all([
        client.fetch(`*[_type == "project"] | order(_createdAt desc) {
          title,
          "slug": slug.current,
          type,
          categories[]->{
            title,
            "slug": slug.current
          },
          description,
          tags,
          image
        }`),
        client.fetch(`*[_type == "category"] | order(title asc) {
          title,
          "slug": slug.current
        }`)
      ]);
      
      if (sanityProjects && sanityProjects.length > 0) {
        allProjects = sanityProjects.map((p: any) => ({
          ...p,
          image: p.image ? urlForImage(p.image)?.url() : 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop'
        }));
      }

      if (sanityCategories && sanityCategories.length > 0) {
        allCategories = sanityCategories;
      }
    }
  } catch (error) {
    console.error("Failed to fetch data from Sanity, using dummy data:", error);
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

          <FilterableProjects projects={allProjects} categories={allCategories} />
        </div>
      </main>
    </div>
  );
}
