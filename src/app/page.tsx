import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Skills } from "@/components/sections/Skills";
import { Services } from "@/components/sections/Services";
import { Projects } from "@/components/sections/Projects";
import { Experience } from "@/components/sections/Experience";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { client } from "@/sanity/lib/client";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default async function Home() {
  let heroData = null;
  let aboutData = null;
  let skillsData = null;
  let servicesData = null;
  let experienceData = null;

  try {
    if (client) {
      const [hero, about, skills, services, experience] = await Promise.all([
        client.fetch(`*[_type == "hero"][0]`),
        client.fetch(`*[_type == "about"][0]`),
        client.fetch(`*[_type == "skills"][0]`),
        client.fetch(`*[_type == "service"] | order(order asc)`),
        client.fetch(`*[_type == "experience"] | order(order asc)`)
      ]);
      heroData = hero;
      aboutData = about;
      skillsData = skills;
      servicesData = services;
      experienceData = experience;
    }
  } catch (e) {
    console.error("Failed to fetch data:", e);
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display overflow-x-hidden flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col items-center w-full">
        <ScrollReveal className="w-full" direction="none">
          <Hero data={heroData || undefined} />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <About data={aboutData || undefined} />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <Skills data={skillsData || undefined} />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <Services data={servicesData || undefined} />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <Projects />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <Experience data={experienceData || undefined} />
        </ScrollReveal>
        
        <ScrollReveal className="w-full">
          <ContactCTA />
        </ScrollReveal>
      </main>
    </div>
  );
}
