import Link from 'next/link';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

const dummyProjects = [
  {
    title: 'Qefas Hub',
    description: 'A staff productivity and educational management system for QEFAS. Features daily task management, video course uploads, AI-generated course materials, and staff productivity tracking.',
    tags: ['Next.js', 'Node.js', 'MongoDB', 'Bunny.net', 'AI APIs'],
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop',
    slug: 'qefas-hub',
    categories: [{ title: 'Web App', slug: 'web-app' }]
  },
  {
    title: 'FlexBZ',
    description: 'A SaaS platform helping businesses manage inventory and monitor sales trends. Includes barcode generation, product scanning, and analytics dashboard.',
    tags: ['React', 'Node.js', 'MongoDB', 'Camera APIs'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
    slug: 'flexbz',
    categories: [{ title: 'Web App', slug: 'web-app' }]
  },
  {
    title: 'Flexiti Studio',
    description: 'A digital agency focused on building MVPs, SaaS products, AI systems, web applications, and mobile apps.',
    tags: ['Startup product development', 'Product strategy', 'UI implementation'],
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    slug: 'flexiti-studio',
    categories: [{ title: 'Design', slug: 'design' }]
  },
  {
    title: 'AI Chatbot System',
    description: 'An AI assistant capable of website chat, WhatsApp integration, Telegram integration, and intelligent customer support with AI-generated responses.',
    tags: ['OpenAI', 'Node.js', 'APIs', 'Automation Workflows'],
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1932&auto=format&fit=crop',
    slug: 'ai-chatbot-system',
    categories: [{ title: 'Open Source', slug: 'open-source' }]
  }
];

export async function Projects() {
  let projects = dummyProjects;

  try {
    if (client) {
      const sanityProjects = await client.fetch(`*[_type == "project" && isFeatured == true][0...4] | order(_createdAt desc) {
        title,
        "slug": slug.current,
        description,
        tags,
        image,
        categories[]->{
          title,
          "slug": slug.current
        }
      }`);
      
      if (sanityProjects && sanityProjects.length > 0) {
        projects = sanityProjects.map((p: any) => ({
          ...p,
          image: p.image ? urlForImage(p.image)?.url() : null
        }));
      }
    }
  } catch (error) {
    console.error("Failed to fetch projects from Sanity, using dummy data:", error);
  }

  return (
    <section className="w-full px-4 md:px-10 py-20 max-w-[1280px] mx-auto" id="projects">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em]">Featured Projects</h2>
          <p className="text-[#637588] dark:text-[#90a4cb] mt-2 max-w-xl">A collection of systems, platforms, and SaaS products I've built.</p>
        </div>
        <Link href="https://github.com" className="flex items-center gap-2 text-primary font-bold hover:underline">
          View GitHub <span className="material-symbols-outlined text-sm">arrow_outward</span>
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {projects.map((project, index) => (
          <Link href={`/projects/${project.slug || project.title.toLowerCase().replace(/\s+/g, '-')}`} key={index} className="flex flex-col gap-6 group cursor-pointer bg-white dark:bg-[#151c2b] rounded-2xl p-4 border border-[#e5e7eb] dark:border-[#222f49] hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden relative shadow-sm border border-[#e5e7eb] dark:border-[#222f49]/50">
              <div 
                className="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-700 group-hover:scale-105" 
                style={{ backgroundImage: `url("${project.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop'}")` }}>
              </div>
              
              {/* Floating Category Pills */}
              {project.categories && project.categories.length > 0 && (
                <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-1.5 max-w-[80%]">
                  {project.categories.map((cat: any) => (
                    <span
                      key={cat.slug}
                      className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white shadow-lg"
                    >
                      {cat.title}
                    </span>
                  ))}
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <span className="bg-white text-black px-6 py-2 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform shadow-xl">View Details</span>
              </div>
            </div>
            <div className="px-2">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-[#111418] dark:text-white text-2xl font-bold leading-normal group-hover:text-primary transition-colors">{project.title}</h3>
              </div>
              <p className="text-[#637588] dark:text-[#90a4cb] text-base font-normal leading-relaxed mb-6 line-clamp-3">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tags?.map((tag: string) => (
                  <span key={tag} className="px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#1a2332] text-[#637588] dark:text-[#90a4cb] text-xs font-semibold rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-center pt-12">
        <Link href="/projects" className="group flex items-center gap-3 px-8 py-4 rounded-xl border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] hover:border-primary/50 transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
          <span className="text-base font-bold text-[#111418] dark:text-white group-hover:text-primary transition-colors">View All Projects</span>
          <span className="material-symbols-outlined text-[#637588] dark:text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
