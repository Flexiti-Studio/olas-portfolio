export function Services({ data }: { data?: any[] }) {
  const defaultServices = [
    { title: 'MVP Development', description: 'Helping startups turn ideas into launch-ready products quickly.', icon: 'rocket_launch' },
    { title: 'SaaS Development', description: 'Building scalable business systems and subscription platforms.', icon: 'cloud' },
    { title: 'AI Integration', description: 'Creating AI-powered chatbots, assistants, automation tools, and intelligent systems.', icon: 'smart_toy' },
    { title: 'Mobile App Development', description: 'Cross-platform mobile apps using React Native and FlutterFlow.', icon: 'smartphone' },
    { title: 'Educational Platforms', description: 'Building LMS systems, online classrooms, productivity tools, and educational automation.', icon: 'school' },
    { title: 'Business Automation', description: 'Developing internal dashboards, inventory systems, and workflow management solutions.', icon: 'settings_suggest' },
  ];

  const services = data && data.length > 0 ? data : defaultServices;

  return (
    <section className="w-full px-4 md:px-10 py-20 bg-[#f5f6f8] dark:bg-[#101622] border-y border-[#e5e7eb] dark:border-[#222f49]" id="services">
      <div className="max-w-[1280px] mx-auto w-full">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] mb-4">My Services</h2>
          <p className="text-[#637588] dark:text-[#90a4cb] text-lg">Delivering end-to-end solutions tailored to your business needs.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div key={index} className="bg-white dark:bg-[#151c2b] p-8 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-3xl">{service.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-3">{service.title}</h3>
              <p className="text-[#637588] dark:text-[#90a4cb] leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
