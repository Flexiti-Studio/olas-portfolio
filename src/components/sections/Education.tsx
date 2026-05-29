export function Education() {
  return (
    <section className="w-full px-4 md:px-10 py-20 max-w-[1280px]" id="education">
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] mb-4">Education</h2>
      </div>
      
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#151c2b] p-8 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mx-auto md:mx-0">
          <span className="material-symbols-outlined text-4xl">school</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[#111418] dark:text-white">University of Lagos</h3>
          <p className="text-lg text-[#637588] dark:text-[#90a4cb] mt-1">B.Sc. Building</p>
          <div className="mt-4 inline-flex items-center rounded-lg bg-green-500/10 px-3 py-1 text-sm font-bold text-green-600 dark:text-green-400">
            CGPA: 3.12
          </div>
        </div>
      </div>
    </section>
  );
}
