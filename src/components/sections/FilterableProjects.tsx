'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Category {
  title: string;
  slug: string;
}

interface Project {
  title: string;
  slug: string;
  type?: string;
  description?: string;
  tags?: string[];
  image?: string;
  categories?: Category[];
}

interface FilterableProjectsProps {
  projects: Project[];
  categories: Category[];
}

function getCategoryIcon(slug: string): string {
  switch (slug) {
    case 'web-app':
    case 'web':
      return 'public';
    case 'mobile':
    case 'mobile-app':
      return 'smartphone';
    case 'open-source':
      return 'terminal';
    case 'design':
      return 'palette';
    case 'ai':
    case 'ai-ml':
      return 'smart_toy';
    default:
      return 'label';
  }
}

export function FilterableProjects({ projects, categories }: FilterableProjectsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Filter projects based on selected category
  const filteredProjects = activeCategory === 'all'
    ? projects
    : projects.filter(project => 
        project.categories?.some(cat => cat.slug === activeCategory)
      );

  const displayedProjects = filteredProjects.slice(0, visibleCount);

  return (
    <div className="space-y-12">
      {/* Dynamic Filters */}
      <div className="flex flex-wrap gap-3 py-4 border-b border-[#e5e7eb] dark:border-[#222f49]">
        <button
          onClick={() => {
            setActiveCategory('all');
            setVisibleCount(6);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-primary text-white shadow-[0_0_15px_rgba(13,89,242,0.2)]'
              : 'bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] border border-[#e5e7eb] dark:border-[#222f49] text-[#637588] dark:text-[#90a4cb] hover:text-[#111418] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">apps</span>
          All Projects
        </button>

        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => {
              setActiveCategory(category.slug);
              setVisibleCount(6);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all group cursor-pointer ${
              activeCategory === category.slug
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(13,89,242,0.2)]'
                : 'bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] border border-[#e5e7eb] dark:border-[#222f49] text-[#637588] dark:text-[#90a4cb] hover:text-[#111418] dark:hover:text-white'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] transition-colors ${
                activeCategory === category.slug
                  ? 'text-white'
                  : 'group-hover:text-primary'
              }`}
            >
              {getCategoryIcon(category.slug)}
            </span>
            {category.title}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {displayedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedProjects.map((project, index) => (
            <article
              key={index}
              className="group relative flex flex-col bg-white dark:bg-[#182234] border border-[#e5e7eb] dark:border-[#222f49] rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(13,89,242,0.2)] hover:-translate-y-1"
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#182234] via-transparent to-transparent opacity-60 z-10 pointer-events-none"></div>
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${project.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop'}')` }}
                ></div>
                {/* Floating Category Pills */}
                {project.categories && project.categories.length > 0 ? (
                  <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-1.5 max-w-[80%]">
                    {project.categories.map((cat) => (
                      <span
                        key={cat.slug}
                        className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white shadow-lg"
                      >
                        {cat.title}
                      </span>
                    ))}
                  </div>
                ) : project.type ? (
                  <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-1.5">
                    <span className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white shadow-lg">
                      {project.type}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col flex-grow p-6 gap-4 z-20">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-[#111418] dark:text-white group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <span className="material-symbols-outlined text-[#637588] dark:text-[#90a4cb] group-hover:text-primary transition-transform group-hover:rotate-45">
                      arrow_outward
                    </span>
                  </div>
                  <p className="text-[#637588] dark:text-[#90a4cb] text-sm leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-[#e5e7eb] dark:border-[#222f49] flex flex-wrap gap-2">
                  {project.tags?.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/projects/${project.slug || project.title.toLowerCase().replace(/\s+/g, '-')}`}
                aria-label={`View ${project.title}`}
                className="absolute inset-0 z-30"
              ></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-[#637588] dark:text-[#90a4cb] mb-4">
            folder_off
          </span>
          <h3 className="text-xl font-bold text-[#111418] dark:text-white">
            No Projects Found
          </h3>
          <p className="text-[#637588] dark:text-[#90a4cb] mt-2 max-w-md">
            There are no projects currently assigned to the "{categories.find(c => c.slug === activeCategory)?.title}" category.
          </p>
        </div>
      )}

      {/* View More Button */}
      {filteredProjects.length > visibleCount && (
        <div className="flex justify-center pt-10">
          <button
            onClick={() => setVisibleCount(prev => prev + 3)}
            className="group flex items-center gap-3 px-8 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#182234] hover:bg-gray-50 dark:hover:bg-[#1e2b42] transition-all hover:border-primary/50 shadow-sm cursor-pointer"
          >
            <span className="text-sm font-bold text-[#111418] dark:text-white">
              Load More Projects
            </span>
            <span className="material-symbols-outlined text-primary group-hover:translate-y-1 transition-transform">
              expand_more
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
