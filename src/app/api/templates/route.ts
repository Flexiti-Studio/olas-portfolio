import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import openai from '@/lib/openai';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, getBucketName, getPublicUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    let templates = await prisma.template.findMany({
      orderBy: { created_at: 'desc' }
    });
    
    // Auto-seed if empty
    if (!templates || templates.length === 0) {
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
      
      const newTemplate = await prisma.template.create({
        data: defaultTemplateData as any
      });
        
      templates = [newTemplate];
    }
    
    // Map snake_case to camelCase for frontend compatibility if needed
    const formattedTemplates = templates.map((t: any) => ({
      ...t,
      rawText: t.raw_text,
      pdfUrl: t.pdf_url,
      isDefault: t.is_default,
      createdAt: t.created_at
    }));
    
    return NextResponse.json(formattedTemplates);
  } catch (error: any) {
    console.error("GET /api/templates ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const file = formData.get('file') as Blob;
    
    if (!name || !file) {
      return NextResponse.json({ error: 'Name and file are required' }, { status: 400 });
    }

    let rawText = '';
    let pdfUrl = '';

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF using unpdf (modern, server-safe PDF text extractor)
    try {
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(buffer));
      // result.text may be a string or array of page strings
      rawText = Array.isArray(result.text) ? result.text.join('\n') : String(result.text || '');
    } catch (err: any) {
      console.error("PDF-PARSE ERROR:", err);
      return NextResponse.json({ error: 'Failed to parse PDF file.', details: err.message }, { status: 400 });
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'PDF appears to be empty or unreadable.' }, { status: 400 });
    }

    // Upload to Cloudflare R2
    try {
      const key = `templates/${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      const bucket = getBucketName();
      
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
        })
      );
      
      pdfUrl = getPublicUrl(key);
    } catch (r2Error) {
      console.error("R2 Upload error:", r2Error);
    }

    // Call OpenAI to parse the template
    const systemPrompt = `Parse this CV text into this exact JSON structure:
{
  "profile": "string",
  "experience": [{ "title": "string", "company": "string", "period": "string", "bullets": ["string"] }],
  "skills": {
    "frontend": ["string"],
    "backend": ["string"],
    "aiAutomation": ["string"],
    "tools": ["string"]
  },
  "education": [{ "degree": "string", "institution": "string", "period": "string" }]
}
Return ONLY valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `RAW CV TEXT:\n${rawText}` }
      ],
      response_format: { type: "json_object" }
    });

    const parsedJson = JSON.parse(response.choices[0].message.content || '{}');

    const newTemplateData = {
      name,
      raw_text: rawText,
      pdf_url: pdfUrl,
      sections: parsedJson,
      is_default: false
    };

    const newTemplate = await prisma.template.create({
      data: newTemplateData as any
    });
    
    const formattedTemplate = {
      ...newTemplate,
      rawText: newTemplate.raw_text,
      pdfUrl: newTemplate.pdf_url,
      isDefault: newTemplate.is_default,
      createdAt: newTemplate.created_at
    };

    return NextResponse.json(formattedTemplate, { status: 201 });
  } catch (error: any) {
    console.error("PDF Parsing/API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
