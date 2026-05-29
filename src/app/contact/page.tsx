import { Header } from "@/components/layout/Header";

export default function ContactPage() {
  return (
    <div className="bg-background-light dark:bg-[#101623] text-[#111418] dark:text-white font-display overflow-x-hidden flex flex-col min-h-screen transition-colors duration-300">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-center w-full px-4 md:px-10 lg:px-40 py-12 md:py-20">
        <div className="max-w-[1280px] w-full flex flex-col gap-12">
          
          {/* Header Section */}
          <div className="text-center md:text-left max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em] mb-4 text-[#111418] dark:text-white">
              Let's Build Something <span className="text-primary">Together</span>
            </h1>
            <p className="text-[#637588] dark:text-[#90a4cb] text-lg font-medium leading-relaxed">
              Have a project in mind or just want to say hi? I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 w-full">
            
            {/* Contact Information (Left Column) */}
            <div className="lg:col-span-5 flex flex-col gap-8 order-2 lg:order-1">
              
              {/* Contact Cards */}
              <div className="flex flex-col gap-4">
                
                {/* Email */}
                <div className="group flex items-start gap-4 p-5 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#1a2333] hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-[24px]">mail</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111418] dark:text-white text-lg mb-1">Email</h3>
                    <a className="text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-medium" href="mailto:hello@flexiti.studio">hello@flexiti.studio</a>
                  </div>
                </div>

                {/* Phone */}
                <div className="group flex items-start gap-4 p-5 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#1a2333] hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-[24px]">call</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111418] dark:text-white text-lg mb-1">Phone</h3>
                    <a className="text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-medium" href="tel:+2340000000000">+234 (0) 000 000 0000</a>
                  </div>
                </div>

                {/* Location */}
                <div className="group flex items-start gap-4 p-5 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#1a2333] hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-[24px]">location_on</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111418] dark:text-white text-lg mb-1">Location</h3>
                    <p className="text-[#637588] dark:text-[#90a4cb] font-medium">Lagos, Nigeria<br/><span className="text-sm opacity-80">(Open to Remote)</span></p>
                  </div>
                </div>

              </div>

              {/* Social Proof / Links */}
              <div className="mt-4">
                <h3 className="font-bold text-[#111418] dark:text-white text-lg mb-4">Connect with me</h3>
                <div className="flex gap-4">
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://github.com">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                  </a>
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://linkedin.com">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                  </a>
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://twitter.com">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form (Right Column) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1a2333] rounded-3xl p-6 md:p-10 border border-[#e5e7eb] dark:border-[#222f49] shadow-md order-1 lg:order-2">
              <form className="flex flex-col gap-6">
                
                {/* Name & Email Row */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="name">Your Name</label>
                    <div className="relative">
                      <input className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" id="name" placeholder="John Doe" type="text"/>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="email">Your Email</label>
                    <div className="relative">
                      <input className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" id="email" placeholder="john@example.com" type="email"/>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="subject">Subject</label>
                  <div className="relative">
                    <input className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" id="subject" placeholder="Project Inquiry" type="text"/>
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="message">Message</label>
                  <textarea className="w-full p-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] resize-y min-h-[160px] dark:text-white font-medium" id="message" placeholder="Tell me about your project..." rows={5}></textarea>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button className="w-full md:w-auto min-w-[200px] h-14 bg-primary hover:bg-blue-600 text-white font-bold text-base rounded-xl transition-all shadow-[0_0_20px_rgba(13,89,242,0.3)] hover:shadow-[0_0_30px_rgba(13,89,242,0.5)] flex items-center justify-center gap-2 group hover:-translate-y-1" type="submit">
                    <span>Send Message</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">send</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}
