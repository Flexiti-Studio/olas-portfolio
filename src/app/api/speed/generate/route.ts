import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, prompt } = await req.json();

    const baseProfileText = `
Name: Ola Olasunkanmi
Contact: olasunkanmiola531@gmail.com | +234 808 629 8113 | Lagos, Nigeria
Portfolio: https://ola.flexitistudio.com
LinkedIn: https://www.linkedin.com/in/ola-olasunkanmi/
GitHub: https://github.com/nicxd531

PROFESSIONAL SUMMARY:
Passionate Full Stack, Mobile & AI Developer with 3+ years of hands-on experience designing, building, and deploying scalable web and mobile applications. Proven track record of reducing manual workflows by up to 60% through custom automation systems, improving platform stability, and delivering revenue-generating digital products. Combines deep technical expertise across the full JavaScript/TypeScript ecosystem with AI/ML integration skills (LangChain, RAG, CrewAI) to build intelligent, data-driven software solutions. Strong communicator with experience tutoring junior developers and leading cross-functional implementation projects.

TECHNICAL SKILLS:
- Frontend: HTML5, CSS3, JavaScript (ES6+), TypeScript, React.js, Next.js 14 (App Router), React Native (Expo), Bootstrap 5, Tailwind CSS, Framer Motion, Shadcn/UI
- Backend: Node.js, Express.js, Python, FastAPI, REST APIs, GraphQL, WebSockets, Prisma ORM, Drizzle ORM
- Databases: PostgreSQL, Supabase, MongoDB, Redis, Pinecone (vector DB)
- AI & Automation: LangChain, CrewAI, n8n Workflow Automation, RAG Systems, OpenAI API (GPT-4o), Groq, LLM prompt engineering, AI agent design
- Mobile: React Native with Expo, cross-platform iOS/Android development, Expo Router, push notifications
- Cloud & DevOps: AWS S3, Cloudflare R2, Vercel, Git & GitHub, CI/CD pipelines, Docker (basic)
- Design & CMS: Figma, Adobe XD, Sanity CMS, Strapi

PROFESSIONAL EXPERIENCE:

ICT Administrator & Software Developer | Qefas Educational Services | Lagos, Nigeria | Jan 2023 – Present
- Built and deployed a full-stack internal operations platform using Next.js 14, Node.js, and PostgreSQL, eliminating 8+ hours of weekly manual reporting tasks and cutting administrative overhead by 40%.
- Designed and implemented an AI-driven personalized learning tool using LangChain and RAG architecture with Pinecone vector store, enabling tailored student insights and reducing instructor Q&A load by 35%.
- Architected and shipped 3 production web applications supporting 200+ students and staff, maintaining 99.5% uptime across all deployments on Vercel.
- Developed automated backend workflows using n8n and custom Node.js scripts, reducing manual data entry time by 60% across the organization's administrative processes.
- Resolved recurring database performance bottlenecks by optimizing PostgreSQL queries and indexing strategies, resulting in a 3x improvement in API response times.
- Tutored 15+ students in modern full-stack development (React.js, Node.js, REST APIs), with 80% going on to complete capstone projects.
- Provided Tier 1–3 IT support across the organization, resolving 95% of hardware/software issues within 24 hours.

LMS Developer & ICT Support Specialist | Compass Group | Lagos, Nigeria | Jan 2022 – Dec 2022
- Diagnosed and resolved a critical simultaneous-login conflict caused by a LearnDash plugin clash, restoring uninterrupted access for 300+ enrolled students within 4 hours of escalation.
- Built a custom PHP shortcode plugin for LearnDash that auto-processed video URLs and rendered them correctly in the LMS, eliminating manual code-copying workflows for 10+ instructors.
- Restructured the entire course upload and content arrangement system, reducing new-course setup time from 3 hours to 45 minutes per course.
- Conducted a full site performance audit; identified 12 bottlenecks and produced a technical remediation report that reduced average page load time by 2.1 seconds.
- Delivered structured LMS training sessions to 20+ staff members covering media uploads, course sectioning, and content management best practices.
- Acted as Developer Advocate: onboarded 5 institutions, registered 200+ students, and configured lab devices across multiple campuses.

Volunteer Frontend Developer | College Match | Remote | Jan 2022 – Present
- Collaborated with a distributed team of 6 to build a student-matching platform frontend using React.js, HTML5, and CSS3, serving 1,000+ monthly active users.
- Implemented dynamic content loading, interactive filtering, and cross-browser compatibility across Chrome, Firefox, and Safari.
- Translated Figma design mockups into pixel-perfect, responsive UI components, reducing design-to-implementation gap by 30%.

KEY PROJECTS:

Ola's Portfolio & Admin Studio (Next.js 14, TypeScript, PostgreSQL, Prisma, Cloudflare R2, OpenAI API)
- Built a full production-grade personal brand platform with an integrated admin studio featuring: AI-powered Speed Apply (CV tailoring + cover letter generation), Application Tracker, Creator Project Manager, Knowledge Hub, Goals Tracker, and AI Content Generation pipelines.
- Integrated OpenAI GPT-4o for real-time CV generation and cover letter writing, achieving ATS-optimized output tailored to individual job descriptions.
- Engineered direct file uploads to Cloudflare R2 with streaming-capable presigned URL delivery, supporting video/image asset management at scale.

AI Workflow Automation System (n8n, LangChain, Python, OpenAI, PostgreSQL)
- Designed and deployed a multi-agent AI automation pipeline using CrewAI and LangChain to automate content research, outline generation, and draft creation workflows.
- Reduced content creation time by 70% by automating information retrieval via RAG (Retrieval-Augmented Generation) with Pinecone vector storage.

React Native Mobile App (React Native, Expo, Node.js, Supabase)
- Developed a cross-platform mobile application for iOS and Android using React Native (Expo), featuring real-time data sync via Supabase and Expo push notifications.
- Implemented Expo Router for deep-linked navigation, achieving a 4.5/5 average usability score in beta testing.

EDUCATION:
B.Sc. Building | University of Lagos | Lagos, Nigeria | 2017 – 2023
Relevant Coursework: Project Management, Structural Analysis, Technical Drawing & CAD, Research Methods

LANGUAGES: English (Fluent), Yoruba (Native)
WORK AUTHORIZATION: Authorized to work remotely for companies worldwide. Open to visa sponsorship.
`;

    const sysPrompt = `
You are a world-class ATS CV specialist and technical recruiter with 15+ years of experience helping software engineers pass Applicant Tracking Systems (ATS) with 90%+ match scores.

Your ONLY job is to take the candidate's base profile and the provided Job Description, then return a perfectly ATS-optimised application package as a JSON object.

════════════════════════════════════
  ABSOLUTE RULES — NEVER VIOLATE
════════════════════════════════════
1. MIRROR JD LANGUAGE VERBATIM: Copy exact phrases, keywords, tool names, and action verbs directly from the Job Description into the CV. ATS software scans for literal text matches. If the JD says "CI/CD pipelines", use "CI/CD pipelines" — not "deployment automation".

2. EVERY BULLET MUST HAVE A METRIC OR CONCRETE OUTCOME: Never write a vague bullet. Every experience bullet MUST contain at least one of: a %, a number, a time saved, a user count, a performance improvement, a dollar value, or a frequency. Example: "Reduced API response time by 3x" ✅ — "Improved API performance" ❌

3. STRONG ACTION VERBS ONLY: Start every bullet with a power verb in past tense. Allowed: Architected, Engineered, Deployed, Automated, Reduced, Increased, Delivered, Designed, Built, Implemented, Optimized, Migrated, Launched, Spearheaded, Led, Developed, Integrated, Streamlined, Established. BANNED: "Responsible for", "Worked on", "Helped with", "Assisted", "Participated in", "Involved in", "Was part of".

4. KEYWORD SATURATION WITHOUT STUFFING: Every key technology, methodology, and role-specific term from the JD must appear at least once naturally across summary_bullets, experience bullets, or skills. Do NOT stuff them unnaturally.

5. NEVER FABRICATE SKILLS: You may only use skills and technologies from the candidate's base profile. However, you MUST reframe existing skills using the JD's exact vocabulary where applicable (e.g. if they have "Next.js" and the JD says "React-based frameworks", use both naturally).

6. TAILOR, DON'T TEMPLATE: Every single bullet in the output must be written specifically for this job. Generic bullets that could apply to any job are FORBIDDEN.

7. QUANTIFY EVERYTHING IN THE SUMMARY: The summary_bullets must highlight the most impressive, role-relevant achievements with specific numbers. Aim to make the recruiter stop scrolling.

8. SKILLS SECTION = JD MIRROR: The skills array must put the most JD-relevant categories and items FIRST. Strip out skills irrelevant to this role. Add JD-specific buzzwords the candidate legitimately has.

9. ATS STRUCTURE COMPLIANCE: Use only the exact JSON structure defined below. Do not add nested objects, tables, or columns. Flat text only — ATS parsers cannot read complex structures.

════════════════════════════════════
  QUALITY CHECKLIST (apply before outputting)
════════════════════════════════════
✅ Does every bullet start with a past-tense power verb?
✅ Does every bullet include a metric/outcome?
✅ Are all JD keywords present in the output?
✅ Is the summary role-specific and compelling (not generic)?
✅ Are skills ordered by JD relevance?
✅ Is the work authorization field filled for international roles?
✅ Are the bold <b> tags applied to JD-matching keywords in bullets and summary?

════════════════════════════════════
  JSON OUTPUT FORMAT (STRICT)
════════════════════════════════════
Return EXACTLY this JSON structure — five top-level keys: "cv", "coverLetter", "companyName", "jobTitle", "jobType".

1. "cv": {
   personal_info: { name, title (tailored job title from JD), location, email, phone, github, linkedin, portfolio },
   summary_bullets: string[] — 5-6 punchy bullet strings, each with <b> tags on JD-matched keywords, each with a metric,
   key_outcomes: string — one powerful sentence summarising top 2-3 quantified career highlights with <b> tags,
   skills: [{ category: string, items: string[] }] — ordered by JD relevance, most important first,
   languages: string[] | null,
   experience: [{
     company: string,
     title: string — tailor the job title to mirror JD language where truthful,
     location: string,
     date: string,
     project: string | null — name of key project worked on (optional),
     bullets: string[] — 4-6 bullets each with action verb + metric + <b> on JD keywords,
     technologies: string — comma-separated list of JD-relevant tech from this role
   }],
   education: [{ institution, degree, location, date, coursework: string[] }],
   certifications: string[],
   work_authorization: string
}

2. "coverLetter": HTML string using <p> and <br/> tags only. 3 paragraphs:
   - Para 1: Hook — why this specific company/role excites the candidate. Name the company and role explicitly.
   - Para 2: Top 2-3 achievements from the CV that directly address the JD's core requirements.
   - Para 3: Closing — confident call to action.
   Address it to "Hiring Manager" if no name is available. Use the candidate's actual name to sign off.

3. "companyName": Extract the hiring company name from the JD. Return "Unknown Company" if not found.

4. "jobTitle": Extract the exact job title from the JD.

5. "jobType": "remote" | "hybrid" | "in-person" — detect from JD context.

════════════════════════════════════
  CANDIDATE BASE PROFILE
════════════════════════════════════
${baseProfileText}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: `Job Description:\n${jobDescription}\n\nCustom AI Prompt (incorporate naturally if provided):\n${prompt || "None provided."}`
        }
      ],
    });

    const responseText = response.choices[0].message.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse JSON from AI" }, { status: 500 });
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
