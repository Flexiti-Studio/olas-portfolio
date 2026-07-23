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
Contact: olasunkanmiola531@gmail.com | +234 808 629 8113 | Lagos, Nigeria | https://ola.flexitistudio.com | https://www.linkedin.com/in/ola-olasunkanmi/ | https://github.com/nicxd531

Profile:
I'm a passionate Software Developer dedicated to building solutions that help businesses scale efficiently. With a strong problem-solving mindset and expertise in data-driven decision making, I focus on creating technology that delivers measurable business impact. My main goal is to streamline processes that slow down growth and make team success difficult, by creating and providing software solutions that simplify challenges and drive efficiency. I also help businesses deliver their products - whether digital or physical - to clients in ways that boost revenue and enhance customer satisfaction, ensuring both company growth and lasting client trust.

Technical Skills:
- Frontend: HTML, CSS, JavaScript, React.js, Next.js, React Native (Expo), Bootstrap, Tailwind CSS
- Backend: Node.js, Express.js, Python, TypeScript, PostgreSQL, Supabase, Prisma ORM, REST APIs
- AI & Automation: LangChain, CrewAI, n8n Workflow Automation, RAG Systems, Pinecone, Groq
- Tools & Platforms: AWS S3, Supabase Storage, Figma, Adobe XD, Sanity CMS, Git & GitHub

Experience:
- ICT Administrator & Software Developer | Qefas Educational Services (Current)
  Managed and resolved a wide range of technology challenges, ensuring seamless operational efficiency across the organization. Provided technical support, troubleshot issues, and implemented software solutions that enhanced team productivity. Tutored students in software development, covering both front-end and back-end technologies and modern programming practices. Led R&D on an AI-driven learning tool designed to offer students tailored insights and personalized learning experiences. Built and maintained full-stack web applications supporting the organization's internal operations. Developed automation systems and backend services to streamline administrative workflows.

- LMS Developer & ICT Support Specialist | Compass Group (2022)
  Diagnosed and resolved a simultaneous login conflict caused by a plugin clash, restoring access for all students. Restructured the entire course upload system and trained staff on correct content arrangement within the LMS. Built a custom PHP shortcode plugin for LearnDash that auto-processed video URLs and rendered them correctly - eliminating manual code copying. Conducted a site performance audit, identified bottlenecks, and produced a technical report that guided remediation. Delivered structured LMS training sessions to staff, covering media uploads, course sectioning, and content management. Debugged recurring system errors and implemented fixes, improving platform stability and reducing downtime. Acted as Developer Advocate - visiting schools, onboarding institutions, registering students, and setting up devices.

- Volunteer Frontend Developer | College Match (2022 - Present)
  Collaborated on a team to develop a front-end interface for a student-matching platform. Translated design concepts into user-friendly web pages using HTML, CSS, and JavaScript. Implemented interactive features, dynamic content loading, and cross-browser compatibility.

- Freelance Architectural Designer | Freelance (2022 - Present)
  Developed detailed 2D floor plans and 3D models for various architectural projects. Translated client briefs into innovative, functional design concepts with realistic renderings. Managed multiple concurrent projects while maintaining quality standards and meeting deadlines.

Education:
- B.Sc. Building, University of Lagos (2017 - 2023)

Languages: English, Yoruba
`;

    const sysPrompt = `
    You are an expert ATS CV Tailor and Cover Letter writer specializing in Full Stack, Mobile, and AI Engineering roles.
    I will provide a Job Description and an optional custom user prompt.
    You must return a JSON object containing FIVE keys: "cv", "coverLetter", "companyName", "jobTitle", and "jobType".

    === TAILORING INSTRUCTIONS ===
    1. Make the resume 98–100% fit for the provided Job Description based on the candidate's base profile.
    2. Keep all bullet points human-written and natural — avoid obvious AI-style wording.
    3. Keep everything ATS-friendly with high keyword density naturally woven in.
    4. Apply strategic <b>bold</b> formatting to important technologies, tools, and JD-matching terminology.
    5. Keep summaries concise but powerful — 4–6 sentences maximum.
    6. Add realistic, achievement-oriented wording.
    7. Preserve resume consistency and realistic experience alignment — do not fabricate unrelated skills.

    === OUTPUT FORMAT ===
    1. "cv": An object tailored to the job description with this structure:
       - personal_info: { name, title, location, email, phone, github, linkedin, portfolio }
       - summary_bullets: array of strings with <b> tags on key skills (4-6 bullets)
       - key_outcomes: string summarizing major achievements with <b> tags
       - skills: array of { category, items[] }
       - languages: array of strings or null
       - experience: array of { company, title, location, date, project, bullets[], technologies }
       - education: array of { institution, degree, location, date, coursework[] }
       - certifications: array of strings
       - work_authorization: string

    2. "coverLetter": A personalized Cover Letter in HTML using <p> and <br/> tags. Highlight the candidate's strengths from the CV matched to the job description. Address the specific company.

    3. "companyName": Extract the hiring company's name from the Job Description. If not found, use "Unknown Company".
    
    4. "jobTitle": Extract the exact Job Title from the Job Description. If not found, use a reasonable guess based on the description.

    5. "jobType": Extract the work arrangement from the Job Description. Return "remote" for Remote/WFH, "hybrid" for Hybrid, or "in-person" for Onsite/In-office. If unclear, default to "remote".

    Candidate Base Information:
    ${baseProfileText}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: `Job Description:\n${jobDescription}\n\nCustom AI Prompt:\n${prompt}` }
      ],
    });
    
    const responseText = response.choices[0].message.content || "{}";
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch(e) {
      return NextResponse.json({ error: "Failed to parse JSON from AI" }, { status: 500 });
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
