'use client';

import { useState } from 'react';
import { Header } from "@/components/layout/Header";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: 'bdba0bdb-0b3d-49f2-94c4-b748186bd38d',
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        })
      });

      const result = await response.json();
      if (response.status === 200 || result.success) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

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
                    <a className="text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-medium" href="mailto:olasunkanmiola531@gmail.com">olasunkanmiola531@gmail.com</a>
                  </div>
                </div>

                {/* Phone */}
                <div className="group flex items-start gap-4 p-5 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] bg-white dark:bg-[#1a2333] hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-[24px]">call</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111418] dark:text-white text-lg mb-1">Phone</h3>
                    <a className="text-[#637588] dark:text-[#90a4cb] hover:text-primary dark:hover:text-primary transition-colors font-medium" href="tel:+2349130165535">+234 9130165535</a>
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
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://www.instagram.com/nicx_ola/" target="_blank" rel="noopener noreferrer">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path></svg>
                  </a>
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://www.linkedin.com/in/ola-olasunkanmi/" target="_blank" rel="noopener noreferrer">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                  </a>
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://github.com/nicxd531" target="_blank" rel="noopener noreferrer">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                  </a>
                  <a className="h-14 w-14 rounded-2xl bg-[#f5f6f8] dark:bg-[#1a2333] flex items-center justify-center text-[#637588] dark:text-[#90a4cb] hover:bg-primary hover:text-white transition-all duration-300 border border-[#e5e7eb] dark:border-[#222f49] shadow-sm hover:-translate-y-1" href="https://x.com/nicx_ola_" target="_blank" rel="noopener noreferrer">
                    <svg aria-hidden="true" className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form (Right Column) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1a2333] rounded-3xl p-6 md:p-10 border border-[#e5e7eb] dark:border-[#222f49] shadow-md order-1 lg:order-2">
              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">Message Sent Successfully!</h3>
                  <p className="text-[#637588] dark:text-[#90a4cb] max-w-md mb-6">
                    Thank you for reaching out! I have received your message and will get back to you as soon as possible.
                  </p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="h-12 px-6 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  
                  {/* Name & Email Row */}
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="name">Your Name</label>
                      <div className="relative">
                        <input 
                          className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" 
                          id="name" 
                          placeholder="John Doe" 
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="email">Your Email</label>
                      <div className="relative">
                        <input 
                          className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" 
                          id="email" 
                          placeholder="john@example.com" 
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="subject">Subject</label>
                    <div className="relative">
                      <input 
                        className="w-full h-14 px-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] dark:text-white font-medium" 
                        id="subject" 
                        placeholder="Project Inquiry" 
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-[#111418] dark:text-white" htmlFor="message">Message</label>
                    <textarea 
                      className="w-full p-4 rounded-xl bg-[#f5f6f8] dark:bg-[#101623] border border-[#e5e7eb] dark:border-[#222f49] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#637588] dark:placeholder:text-[#637588] resize-y min-h-[160px] dark:text-white font-medium" 
                      id="message" 
                      placeholder="Tell me about your project..." 
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  {status === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium">
                      Something went wrong. Please try again or email me directly at olasunkanmiola531@gmail.com.
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button 
                      className="w-full md:w-auto min-w-[200px] h-14 bg-primary hover:bg-blue-600 text-white font-bold text-base rounded-xl transition-all shadow-[0_0_20px_rgba(13,89,242,0.3)] hover:shadow-[0_0_30px_rgba(13,89,242,0.5)] flex items-center justify-center gap-2 group hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0" 
                      type="submit"
                      disabled={status === 'submitting'}
                    >
                      {status === 'submitting' ? (
                        <>
                          <span>Sending...</span>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">send</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}
