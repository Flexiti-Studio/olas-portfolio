import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const defaultTemplateData = {
  name: "Ola Olasunkanmi — Default",
  sections: {
    profile: "I'm a passionate Software Developer dedicated to building solutions that help businesses scale efficiently. With a strong problem-solving mindset and expertise in data-driven decision making, I focus on creating technology that delivers measurable business impact.",
    experience: [
      {
        title: "ICT Administrator & Software Developer",
        company: "Qefas Educational Services",
        period: "Current",
        bullets: []
      },
      {
        title: "LMS Developer & ICT Support Specialist",
        company: "Compass Group",
        period: "2022",
        bullets: []
      },
      {
        title: "Volunteer Frontend Developer",
        company: "College Match",
        period: "2022–Present",
        bullets: []
      }
    ],
    skills: {
      frontend: ["HTML", "CSS", "JavaScript", "React.js", "Next.js", "React Native", "Bootstrap", "Tailwind"],
      backend: ["Node.js", "Express.js", "Python", "TypeScript", "PostgreSQL", "Supabase", "Prisma", "REST APIs"],
      aiAutomation: ["LangChain", "CrewAI", "n8n", "RAG Systems", "Pinecone", "Groq"],
      tools: ["AWS S3", "Figma", "Adobe XD", "Sanity CMS", "Git", "GitHub"]
    },
    education: [
      {
        degree: "B.Sc. Building",
        institution: "University of Lagos",
        period: "2017–2023"
      }
    ]
  },
  raw_text: "Default template",
  is_default: true
};

export async function POST(req: NextRequest) {
  try {
    // Check if default already exists
    const { data: existing, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('is_default', true)
      .single();
      
    if (existing) {
      return NextResponse.json({ message: 'Default template already exists', template: existing });
    }

    const { data: newTemplate, error: insertError } = await supabase
      .from('templates')
      .insert([defaultTemplateData])
      .select()
      .single();
      
    if (insertError) throw insertError;
    
    return NextResponse.json({ message: 'Seeded default template', template: newTemplate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
