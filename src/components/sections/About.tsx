import { urlForImage } from "@/sanity/lib/image";

interface AboutData {
  headingStart?: string;
  headingHighlight?: string;
  headingEnd?: string;
  paragraph1?: string;
  paragraph2?: string;
  profileImage?: any;
  badgeTitle?: string;
  badgeSubtitle?: string;
  stats?: { value: string; label: string; icon: string }[];
}

export function About({ data }: { data?: AboutData }) {
  return (
    <section className="w-full border-y border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#151c2b] py-16 md:py-24 overflow-hidden" id="about">
      <div className="px-4 md:px-10 max-w-[1280px] mx-auto w-full">
        
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-12 items-center">
          
          {/* Left: Text Content & Skills */}
          <div className="flex flex-col flex-1 gap-8 max-w-3xl">
            <div className="flex flex-col gap-6 text-center lg:text-left">
              <div className="flex flex-col gap-2">
                <span className="text-primary font-bold tracking-wider uppercase text-sm">About Me</span>
                <h2 className="text-[#111418] dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
                  {data?.headingStart || 'Building digital'} <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">{data?.headingHighlight || 'experiences'}</span> {data?.headingEnd || 'with code.'}
                </h2>
              </div>
              <div className="text-[#637588] dark:text-[#90a4cb] space-y-4 text-lg leading-relaxed font-medium">
                <p>
                  {data?.paragraph1 || 'As a software developer and AI engineer, I combine technical problem-solving with design thinking and system architecture. My journey started in frontend development and has expanded into backend systems, mobile development, AI integrations, and full-scale SaaS architecture.'}
                </p>
                <p>
                  {data?.paragraph2 ? (
                    <span dangerouslySetInnerHTML={{ __html: data.paragraph2.replace(/Flexiti Studio/g, '<strong class="text-[#111418] dark:text-white">Flexiti Studio</strong>') }} />
                  ) : (
                    <>
                      Beyond coding, my long-term vision is to grow <strong className="text-[#111418] dark:text-white">Flexiti Studio</strong> into a leading software and AI solutions company, creating scalable products used globally.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Core Technologies Chips from HTML */}
            <div className="flex flex-col gap-3 mt-2">
              <span className="text-sm font-bold text-[#637588] dark:text-[#90a4cb] uppercase tracking-wider text-center lg:text-left">Core Technologies</span>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[18px]">code_blocks</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">React / Next.js</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-green-500 text-[18px]">terminal</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">Node.js</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">data_object</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">TypeScript</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-yellow-500 text-[18px]">logo_dev</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">Python</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-orange-500 text-[18px]">cloud</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">AWS / GCP</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] px-4 py-2 transition-colors hover:border-primary/50 shadow-sm">
                  <span className="material-symbols-outlined text-cyan-500 text-[18px]">smartphone</span>
                  <span className="text-sm font-bold text-[#111418] dark:text-white">React Native</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual Profile Image */}
          <div className="relative flex-1 flex justify-center lg:justify-end w-full mt-8 lg:mt-0">
            <div className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full"></div>
              
              {/* Image Container with rotation */}
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] border-4 border-white dark:border-[#222f49] bg-[#1a2333] shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500 group">
                <div className="absolute inset-0 bg-gradient-to-t from-[#151c2b]/80 via-transparent to-transparent z-10 pointer-events-none"></div>
                <div 
                  className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" 
                  style={{ backgroundImage: `url("${data?.profileImage ? urlForImage(data.profileImage)?.url() : '/images/ola.png'}")` }}
                ></div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 md:-left-10 z-20 flex items-center gap-4 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white/95 dark:bg-[#1a2333]/95 backdrop-blur-md p-4 shadow-xl hover:-translate-y-1 transition-transform">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500 shrink-0">
                  <span className="material-symbols-outlined text-[28px]">check_circle</span>
                </div>
                <div>
                  <p className="text-xs text-[#637588] dark:text-[#90a4cb] font-bold uppercase tracking-wider mb-0.5">{data?.badgeTitle || 'Available for Work'}</p>
                  <p className="text-base font-black text-[#111418] dark:text-white">{data?.badgeSubtitle || 'Open to Offers'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
          {(data?.stats || [
            { value: '10+', label: 'Projects Built', icon: 'rocket_launch' },
            { value: '3+', label: 'SaaS Products', icon: 'cloud' },
            { value: 'Full-Stack', label: '& AI Integrations', icon: 'psychology' }
          ]).map((stat, index) => (
            <div key={index} className="group flex flex-col gap-1 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-[#f5f6f8] dark:bg-[#1a2333] p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-4 w-fit rounded-xl bg-primary/10 p-3 text-primary">
                <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
              </div>
              <p className="text-4xl font-black text-[#111418] dark:text-white group-hover:text-primary transition-colors">{stat.value}</p>
              <p className="text-[#637588] dark:text-[#90a4cb] font-bold mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
