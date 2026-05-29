export function Experience({ data }: { data?: any[] }) {
  const defaultExperiences = [
    {
      title: 'ICT Administrator & Developer',
      organization: 'QEFAS Prep School',
      dateRange: 'Current',
      type: 'work',
      description: 'Managing ICT infrastructure, teaching software development, researching AI solutions, and developing internal software systems for educational technology.',
      badges: []
    },
    {
      title: 'B.Sc. Building',
      organization: 'University of Lagos',
      dateRange: 'Education',
      type: 'education',
      description: 'Combining technical problem-solving with design thinking and system architecture from a solid background in building construction.',
      badges: ['CGPA: Above 3.0']
    }
  ];

  const experiences = data && data.length > 0 ? data : defaultExperiences;

  return (
    <section className="w-full px-4 md:px-10 py-20 bg-[#f5f6f8] dark:bg-[#101622] border-y border-[#e5e7eb] dark:border-[#222f49]" id="experience">
      <div className="max-w-[1280px] mx-auto w-full">
        
        <div className="flex flex-col gap-2 mb-12 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold text-[#111418] dark:text-white tracking-[-0.015em]">My Journey</h2>
          <p className="text-[#637588] dark:text-[#90a4cb] text-lg">A timeline of my professional career and educational milestones.</p>
        </div>

        <div className="relative pl-8 md:pl-0 mt-8">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-[#e5e7eb] dark:bg-[#222f49] md:-translate-x-1/2 hidden md:block"></div>
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary to-[#222f49] md:hidden"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary to-[#222f49] -translate-x-1/2 hidden md:block opacity-50"></div>

          {experiences.map((exp, index) => {
            const isEven = index % 2 === 0; // true -> Right on desktop (Item 1), false -> Left on desktop (Item 2)
            
            return (
              <div key={index} className={`relative flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center justify-between ${index !== experiences.length - 1 ? 'mb-16' : ''} group w-full`}>
                {/* Dot */}
                <div className={`absolute left-[-2rem] md:left-1/2 top-0 h-5 w-5 -translate-x-[5px] md:-translate-x-1/2 rounded-full border-4 ${isEven ? 'border-primary shadow-[0_0_15px_rgba(13,89,242,0.6)] group-hover:scale-125' : 'border-[#cbd5e1] dark:border-[#222f49] group-hover:border-primary group-hover:scale-125'} bg-white dark:bg-[#101622] z-10 transition-all duration-300`}></div>
                
                {/* Date */}
                <div className={`hidden md:block w-1/2 ${isEven ? 'pr-16 text-right' : 'pl-16 text-left'}`}>
                  <span className={`${isEven ? 'text-primary font-bold text-xl' : 'text-[#637588] dark:text-[#90a4cb] font-bold text-xl group-hover:text-[#111418] dark:group-hover:text-white transition-colors'}`}>{exp.dateRange}</span>
                </div>
                
                {/* Content */}
                <div className={`w-full md:w-1/2 ${isEven ? 'md:pl-16 pl-6' : 'md:pr-16 pl-6'}`}>
                  <span className={`md:hidden ${isEven ? 'text-primary' : 'text-[#637588] dark:text-[#90a4cb]'} font-bold text-sm mb-2 block`}>{exp.dateRange}</span>
                  <div className="rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#1a2333] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                    <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-1">{exp.title}</h3>
                    <p className="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">{exp.organization}</p>
                    
                    {exp.badges && exp.badges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {exp.badges.map((badge: string, i: number) => (
                          <div key={i} className="inline-flex items-center rounded-lg bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                            {badge}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-[#637588] dark:text-[#90a4cb] text-base leading-relaxed">
                      {exp.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
