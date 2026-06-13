import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { urlForImage } from "@/sanity/lib/image";
import { notFound } from "next/navigation";
import { ProjectGallery } from "@/components/sections/ProjectGallery";

export const dynamic = 'force-dynamic';

// Optional: you can define fallback data for predefined routes if Sanity is empty
const fallbackProjects: Record<string, any> = {
  "qefas-hub": {
    title: "Qefas Hub Dashboard",
    description: "A full-stack educational management system designed for scalability, real-time tracking, and high-performance data visualization.",
    type: "SaaS",
    role: "Full Stack Developer",
    timeline: "3 Months (Aug - Oct 2023)",
    team: "Lead Developer",
    challenge: "Managing tasks across multiple staff members is often fragmented and error-prone. The school needed a centralized dashboard that could handle daily tasks, provide real-time tracking, and generate AI-powered course materials without latency.",
    solution: "I built a custom Single Page Application (SPA) using React and Next.js for server-side rendering to ensure fast load times. The backend utilizes a scalable Node.js architecture with MongoDB to handle high-frequency data requests.",
    result: "The platform successfully centralized task management, resulting in a 40% increase in staff productivity, over 500 AI-generated course materials produced, and zero database latency during peak usage.",
    tags: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js', 'MongoDB', 'OpenAI API'],
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_ZzGJTkBSxF-0BGCgqFa_O37EgqoFkxL5JT2dThGoy89TcU5xMDpSJrFuNQH_Eam9GuwRB-4ucRCyl-18XHkZf2d8xhYJf0R19XN7ZmIrPQdqPrKtS-B941GbKONJLqwPCrIxz-PXfP3_wpQCh0LZMx75-5MT8ebOKnpCU5gVHHkSGTwIuUPdJRGSsyFB0SmNNKBQjaQrn1MgqJT4t0-egqadcwzG1YhKjoxmjpAPtYt0IVAKnLCAMcm7i2HITbmPeUfka-ad08bH",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_ZzGJTkBSxF-0BGCgqFa_O37EgqoFkxL5JT2dThGoy89TcU5xMDpSJrFuNQH_Eam9GuwRB-4ucRCyl-18XHkZf2d8xhYJf0R19XN7ZmIrPQdqPrKtS-B941GbKONJLqwPCrIxz-PXfP3_wpQCh0LZMx75-5MT8ebOKnpCU5gVHHkSGTwIuUPdJRGSsyFB0SmNNKBQjaQrn1MgqJT4t0-egqadcwzG1YhKjoxmjpAPtYt0IVAKnLCAMcm7i2HITbmPeUfka-ad08bH",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
    ]
  },
  "fintrack-saas": {
    title: "FinTrack SaaS",
    description: "A comprehensive financial tracking tool built for small businesses with real-time data visualization and automated reporting.",
    role: "Frontend Engineer",
    timeline: "2 Months",
    team: "Solo",
    challenge: "Users needed a fast, reliable way to view financial charts on the go.",
    solution: "Implemented highly optimized chart components and a robust offline-first architecture.",
    result: "Successfully improved user engagement by 25% and reduced load times by 50% for mobile clients using the offline-first dashboard.",
    tags: ["React", "Node.js", "PostgreSQL"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop"
    ]
  }
};

function formatInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-extrabold text-[#111418] dark:text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderFormattedText(text: string) {
  if (!text) {
    return (
      <p className="text-[#637588] dark:text-[#90a4cb] leading-relaxed text-lg font-medium">
        Information currently unavailable.
      </p>
    );
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let keyCounter = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${keyCounter++}`} className="list-disc pl-6 my-4 space-y-2 text-[#637588] dark:text-[#90a4cb] text-lg font-medium">
            {currentList}
          </ul>
        );
      } else if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${keyCounter++}`} className="list-decimal pl-6 my-4 space-y-2 text-[#637588] dark:text-[#90a4cb] text-lg font-medium">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for bullet list item: starts with -, *, or •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    // Check for numbered list item: starts with numbers like 1., 2.
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(<li key={`li-${keyCounter++}`} className="leading-relaxed">{formatInlineText(bulletMatch[1])}</li>);
    } else if (numberMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(<li key={`li-${keyCounter++}`} className="leading-relaxed">{formatInlineText(numberMatch[2])}</li>);
    } else {
      flushList();
      if (trimmed === '') {
        // Empty line acts as a paragraph break or spacing
        elements.push(<div key={`br-${keyCounter++}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${keyCounter++}`} className="text-[#637588] dark:text-[#90a4cb] leading-relaxed text-lg font-medium my-2">
            {formatInlineText(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return elements;
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let project = fallbackProjects[slug];

  try {
    if (client) {
      const sanityProject = await client.fetch(
        `*[_type == "project" && slug.current == $slug][0] {
          ...,
          categories[]->{
            title,
            "slug": slug.current
          }
        }`,
        { slug }
      );
      if (sanityProject) {
        project = {
          ...sanityProject,
          image: sanityProject.image ? urlForImage(sanityProject.image)?.url() : null,
          images: sanityProject.images && Array.isArray(sanityProject.images)
            ? sanityProject.images.map((img: any) => urlForImage(img)?.url()).filter(Boolean)
            : []
        };
      }
    }
  } catch (error) {
    console.error("Failed to fetch project from Sanity:", error);
  }

  if (!project) {
    // If not found in Sanity and not in fallbacks
    project = {
      title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: "Detailed case study for this project is currently being updated.",
      tags: ["Web", "Design"],
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
      images: [],
      challenge: "Details coming soon.",
      solution: "Details coming soon.",
      result: "Details coming soon.",
      role: "Developer",
      timeline: "2024",
      team: "Solo"
    };
  }

  return (
    <div className="bg-background-light dark:bg-[#101623] text-[#111418] dark:text-white font-display flex flex-col min-h-screen transition-colors duration-300">
      <Header />
      
      <main className="flex-grow flex flex-col items-center w-full py-8 md:py-12">
        <div className="w-full max-w-[1280px] px-4 md:px-10 flex flex-col gap-12">
          
          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm font-bold text-[#637588] dark:text-[#90a4cb]">
            <Link className="hover:text-primary transition-colors flex items-center gap-1" href="/projects">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Projects
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#111418] dark:text-white">{project.title}</span>
          </nav>

          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              <div className="space-y-4">
                {project.categories && project.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.categories.map((cat: any) => (
                      <span key={cat.slug} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                        {cat.title}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-[#111418] dark:text-white drop-shadow-sm">
                  {project.title}
                </h1>
                <p className="text-lg md:text-xl text-[#637588] dark:text-[#90a4cb] max-w-lg leading-relaxed font-medium">
                  {project.description}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-2">
                {project.liveUrl ? (
                  <a className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-base transition-all shadow-[0_0_20px_rgba(13,89,242,0.4)] hover:shadow-[0_0_30px_rgba(13,89,242,0.6)] hover:-translate-y-1 group" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined mr-2 text-[20px] group-hover:-translate-y-0.5 transition-transform">rocket_launch</span>
                    View Live
                  </a>
                ) : (
                  <button className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-primary text-white font-bold text-base shadow-[0_0_20px_rgba(13,89,242,0.4)] group">
                    <span className="material-symbols-outlined mr-2 text-[20px]">rocket_launch</span>
                    View Live
                  </button>
                )}
                {project.githubUrl && (
                  <a className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-white dark:bg-[#1a2333] hover:bg-gray-50 dark:hover:bg-[#222f49] text-[#111418] dark:text-white font-bold text-base transition-all border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined mr-2 text-[20px]">code</span>
                    View Code
                  </a>
                )}
              </div>
            </div>
            
            <ProjectGallery 
              mainImage={project.image} 
              images={project.images || []} 
              title={project.title} 
            />
          </section>

          {/* Project Stats */}
          <section className="w-full p-6 md:p-10 rounded-[2rem] bg-white dark:bg-[#1a2333] border border-[#e5e7eb] dark:border-[#222f49] shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb] dark:divide-[#222f49]">
              <div className="flex flex-col gap-1 pt-4 md:pt-0 md:pl-4 first:pl-0 first:pt-0">
                <span className="text-sm font-bold text-[#637588] dark:text-[#90a4cb] uppercase tracking-wider">Role</span>
                <span className="text-lg font-black text-[#111418] dark:text-white">{project.role || "Developer"}</span>
              </div>
              <div className="flex flex-col gap-1 pt-4 md:pt-0 md:pl-10">
                <span className="text-sm font-bold text-[#637588] dark:text-[#90a4cb] uppercase tracking-wider">Timeline</span>
                <span className="text-lg font-black text-[#111418] dark:text-white">{project.timeline || "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1 pt-4 md:pt-0 md:pl-10">
                <span className="text-sm font-bold text-[#637588] dark:text-[#90a4cb] uppercase tracking-wider">Team</span>
                <span className="text-lg font-black text-[#111418] dark:text-white">{project.team || "Independent"}</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 mt-4">
            {/* Left Column: Content */}
            <div className="flex flex-col gap-12">
              
              {/* Overview */}
              <div className="space-y-6">
                {project.challenge && (
                  <>
                    <h3 className="text-2xl font-black text-[#111418] dark:text-white border-l-4 border-primary pl-4 tracking-tight">The Challenge</h3>
                    <div className="space-y-2 mb-10">
                      {renderFormattedText(project.challenge)}
                    </div>
                  </>
                )}
                
                {project.solution && (
                  <>
                    <h3 className="text-2xl font-black text-[#111418] dark:text-white border-l-4 border-primary pl-4 tracking-tight">The Solution</h3>
                    <div className="space-y-2 mb-10">
                      {renderFormattedText(project.solution)}
                    </div>
                  </>
                )}

                {project.result && (
                  <>
                    <h3 className="text-2xl font-black text-[#111418] dark:text-white border-l-4 border-primary pl-4 tracking-tight">The Result</h3>
                    <div className="space-y-2">
                      {renderFormattedText(project.result)}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Right Column: Tech Stack & Sidebar Info */}
            <div className="flex flex-col gap-8">
              <div className="sticky top-24 space-y-8">
                
                {/* Tech Stack Card */}
                {project.tags && project.tags.length > 0 && (
                  <div className="p-8 rounded-2xl bg-white dark:bg-[#1a2333] border border-[#e5e7eb] dark:border-[#222f49] shadow-lg">
                    <h3 className="text-lg font-black mb-6 text-[#111418] dark:text-white uppercase tracking-wider">Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tech: string) => (
                        <span key={tech} className="px-3 py-1.5 rounded-lg bg-[#f5f6f8] dark:bg-[#101623] text-[#111418] dark:text-[#d1d5db] text-sm font-bold border border-[#e5e7eb] dark:border-[#222f49]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Links Card */}
                {(project.liveUrl || project.githubUrl) && (
                  <div className="p-8 rounded-2xl bg-white dark:bg-[#1a2333] border border-[#e5e7eb] dark:border-[#222f49] shadow-lg">
                    <h3 className="text-lg font-black mb-6 text-[#111418] dark:text-white uppercase tracking-wider">Resources</h3>
                    <ul className="space-y-4">
                      {project.liveUrl && (
                        <li>
                          <a className="flex items-center gap-3 text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-bold" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                            <span className="material-symbols-outlined text-[24px]">link</span>
                            Live Demonstration
                          </a>
                        </li>
                      )}
                      {project.githubUrl && (
                        <li>
                          <a className="flex items-center gap-3 text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-bold" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                            <span className="material-symbols-outlined text-[24px]">code_blocks</span>
                            GitHub Repository
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Navigation Footer */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-12 border-t border-[#e5e7eb] dark:border-[#222f49]">
            <Link className="group relative p-8 rounded-3xl bg-[#f5f6f8] dark:bg-[#1a2333] border border-[#e5e7eb] dark:border-[#222f49] hover:border-primary/50 transition-all overflow-hidden flex flex-col items-start text-left shadow-sm hover:shadow-md" href="/projects">
              <span className="text-xs font-black text-[#637588] dark:text-[#90a4cb] mb-2 uppercase tracking-widest">Back</span>
              <h4 className="text-xl md:text-2xl font-black text-[#111418] dark:text-white group-hover:text-primary transition-colors">Return to Projects</h4>
              <span className="mt-6 flex items-center text-sm font-bold text-[#637588] group-hover:translate-x-[-4px] transition-transform">
                <span className="material-symbols-outlined mr-2 text-[20px]">arrow_back</span>
                View All
              </span>
            </Link>
          </section>

        </div>
      </main>
    </div>
  );
}
