interface SkillCategory {
  title: string;
  icon: string;
  skills: string[];
}

interface SkillsData {
  title?: string;
  subtitle?: string;
  categories?: SkillCategory[];
}

export function Skills({ data }: { data?: SkillsData }) {
  const defaultCategories: SkillCategory[] = [
    {
      title: 'Frontend Development',
      icon: 'desktop_windows',
      skills: ['React.js', 'Next.js', 'Tailwind CSS', 'TypeScript', 'Material UI', 'Shadcn UI', 'HTML5', 'CSS3', 'JavaScript']
    },
    {
      title: 'Backend Development',
      icon: 'dns',
      skills: ['Node.js', 'Express.js', 'REST APIs', 'Authentication Systems', 'JWT', 'Redis', 'Server Architecture']
    },
    {
      title: 'Database & Storage',
      icon: 'database',
      skills: ['MongoDB', 'Firebase', 'Supabase', 'PostgreSQL', 'Cloud Storage', 'S3-Compatible Storage']
    },
    {
      title: 'Mobile Development',
      icon: 'smartphone',
      skills: ['React Native', 'FlutterFlow', 'Expo']
    },
    {
      title: 'AI & Automation',
      icon: 'smart_toy',
      skills: ['OpenAI APIs', 'AI Chatbot Systems', 'AI Workflow Automation', 'AI Course Generation', 'WhatsApp & Telegram AI Bots']
    },
    {
      title: 'Tools & Platforms',
      icon: 'build',
      skills: ['Git & GitHub', 'Vercel', 'Docker', 'Postman', 'Figma', 'Bunny.net', 'Resend', 'Hostinger / HostGator']
    }
  ];

  const skillCategories = data?.categories || defaultCategories;

  return (
    <section className="w-full px-4 md:px-10 py-20 max-w-[1280px]" id="skills">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em]">
            {data?.title || 'Technical Skills'}
          </h2>
          <p className="text-[#637588] dark:text-[#90a4cb] mt-2 max-w-lg">
            {data?.subtitle || 'My tech stack covers the entire spectrum of modern application development.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skillCategories.map((category, index) => (
          <div key={index} className="flex flex-col p-8 bg-[#f9fafb] dark:bg-[#1a2332] rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] hover:border-primary/50 dark:hover:border-primary/50 transition-all hover:shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">{category.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-[#111418] dark:text-white">{category.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {category.skills?.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 bg-white dark:bg-[#101622] text-[#637588] dark:text-[#90a4cb] text-sm font-medium rounded-full border border-[#e5e7eb] dark:border-[#222f49]">{skill}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
