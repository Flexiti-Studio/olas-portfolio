export function Testimonials() {
  const testimonials = [
    { quote: "Ola combines technical skill with creative problem solving.", name: "Client Partner" },
    { quote: "Great at transforming ideas into functional systems.", name: "Project Manager" },
    { quote: "Highly dedicated and detail-oriented developer.", name: "Startup Founder" }
  ];

  return (
    <section className="w-full px-4 md:px-10 py-20 max-w-[1280px] mx-auto" id="testimonials">
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] mb-4">What People Say</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="bg-white dark:bg-[#151c2b] p-8 rounded-2xl border border-[#e5e7eb] dark:border-[#222f49] shadow-sm flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-4xl text-primary/40 mb-4 block">format_quote</span>
              <p className="text-lg text-[#111418] dark:text-white font-medium italic mb-6">"{testimonial.quote}"</p>
            </div>
            <div>
              <div className="h-px w-12 bg-primary mb-4"></div>
              <p className="text-[#637588] dark:text-[#90a4cb] font-bold">{testimonial.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
