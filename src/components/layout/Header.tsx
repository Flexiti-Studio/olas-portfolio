"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains('dark');
    setTheme(hasDarkClass ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background-light/80 dark:bg-[#101623]/80 border-b border-solid border-b-[#e5e7eb] dark:border-b-[#222f49] transition-all duration-300">
      <div className="px-4 md:px-10 py-3 flex flex-col max-w-[1280px] mx-auto w-full">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2 md:gap-4 text-[#111418] dark:text-white hover:opacity-80 transition-opacity">
            <div className="size-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined select-none">code</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold leading-tight tracking-[-0.015em]">Ola's Portfolio</h2>
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/#about">About</Link>
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/#skills">Skills</Link>
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/#services">Services</Link>
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/#projects">Projects</Link>
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/#experience">Experience</Link>
            <Link className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-sm font-medium transition-colors" href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              aria-label="Toggle Theme"
            >
              <span className="material-symbols-outlined select-none text-[20px] sm:text-[22px]">
                {mounted && theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            <Link href="/contact" className="hidden md:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
              <span className="truncate">Hire Me</span>
            </Link>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="lg:hidden text-[#637588] dark:text-white p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              <span className="material-symbols-outlined select-none">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="lg:hidden border-t border-[#e5e7eb] dark:border-[#222f49] bg-background-light/95 dark:bg-[#101623]/95 backdrop-blur-lg overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2 border-b border-black/5 dark:border-white/5"
                href="/#about"
              >
                About
              </Link>
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2 border-b border-black/5 dark:border-white/5"
                href="/#skills"
              >
                Skills
              </Link>
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2 border-b border-black/5 dark:border-white/5"
                href="/#services"
              >
                Services
              </Link>
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2 border-b border-black/5 dark:border-white/5"
                href="/#projects"
              >
                Projects
              </Link>
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2 border-b border-black/5 dark:border-white/5"
                href="/#experience"
              >
                Experience
              </Link>
              <Link 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#637588] dark:text-[#d1d5db] hover:text-primary dark:hover:text-white text-base font-semibold transition-colors py-2"
                href="/contact"
              >
                Contact
              </Link>

              <div className="pt-4 flex flex-col gap-3">
                <Link 
                  onClick={() => setIsMobileMenuOpen(false)}
                  href="/contact" 
                  className="flex w-full cursor-pointer items-center justify-center rounded-xl h-12 bg-primary text-white text-base font-bold transition-all shadow-lg hover:shadow-primary/30"
                >
                  Hire Me
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
