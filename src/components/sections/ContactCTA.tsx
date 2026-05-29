import Link from 'next/link';

export function ContactCTA() {
  return (
    <section className="w-full mt-10 bg-[#f5f6f8] dark:bg-[#0c1018] py-20 px-4 md:px-10 border-t border-[#e5e7eb] dark:border-[#222f49]" id="contact">
      <div className="max-w-[800px] mx-auto text-center flex flex-col items-center gap-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <span className="material-symbols-outlined text-3xl">mail</span>
        </div>
        <h2 className="text-[#111418] dark:text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
          Have an idea, startup, or business problem? Let’s build something impactful together.
        </h2>
        
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 text-lg text-[#637588] dark:text-[#90a4cb] mt-4 font-medium">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">location_on</span>
            Lagos, Nigeria
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">phone_iphone</span>
            +234 9130165535
          </div>
        </div>

        <Link className="inline-flex items-center gap-3 text-2xl md:text-3xl font-bold text-primary hover:text-blue-400 transition-colors border-b-2 border-primary/30 hover:border-primary pb-1" href="mailto:admin@flexitistudio.com">
          admin@flexitistudio.com
        </Link>
        <div className="flex items-center gap-6 mt-4">
          <Link className="p-3 rounded-full bg-white dark:bg-[#1a2332] text-[#111418] dark:text-white hover:scale-110 hover:text-primary transition-all shadow-md" href="https://instagram.com/flexitistudio">
            <span className="material-symbols-outlined">photo_camera</span> 
          </Link>
          <Link className="p-3 rounded-full bg-white dark:bg-[#1a2332] text-[#111418] dark:text-white hover:scale-110 hover:text-primary transition-all shadow-md" href="#">
            <span className="material-symbols-outlined">work</span> 
          </Link>
          <Link className="p-3 rounded-full bg-white dark:bg-[#1a2332] text-[#111418] dark:text-white hover:scale-110 hover:text-primary transition-all shadow-md" href="#">
            <span className="material-symbols-outlined">code</span> 
          </Link>
        </div>
        <p className="text-[#637588] dark:text-[#58647a] text-sm mt-12">
          © 2026 Ola Olasunkanmi. All rights reserved. Built with Next.js & Tailwind CSS.
        </p>
      </div>
    </section>
  );
}
