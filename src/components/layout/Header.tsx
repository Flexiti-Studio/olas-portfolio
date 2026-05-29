import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background-light/80 dark:bg-[#101623]/80 border-b border-solid border-b-[#e5e7eb] dark:border-b-[#222f49] transition-all duration-300">
      <div className="px-4 md:px-10 py-3 flex items-center justify-between max-w-[1280px] mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 md:gap-4 text-[#111418] dark:text-white hover:opacity-80 transition-opacity">
          <div className="size-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="material-symbols-outlined">code</span>
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
        <div className="flex items-center gap-4">
          <Link href="/contact" className="hidden md:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
            <span className="truncate">Hire Me</span>
          </Link>
          <button className="lg:hidden text-[#637588] dark:text-white p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
