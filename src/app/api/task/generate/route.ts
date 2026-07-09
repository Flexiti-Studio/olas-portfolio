import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, prompt, baseProfileText } = await req.json();

    // Upsert the base profile so DB always reflects the latest default data
    const profileData = {
      personal_info: {
        name: "James Gao",
        title: "Salesforce Engineer | Cloud Solutions Specialist",
        location: "San Francisco, CA 94108",
        email: "jamesgao.success.upwork.pro@gmail.com",
        phone: "+1 (339) 399-0519",
        github: "https://github.com/svendev888",
        linkedin: "https://www.linkedin.com/in/jamessmgao/"
      },
      skills: [
        { category: "Salesforce Platform", items: ["Apex", "Lightning Web Components (LWC)", "Salesforce Flow", "Process Builder", "SOQL", "SOSL", "Salesforce DX", "Visualforce", "Sales Cloud", "Service Cloud", "Experience Cloud"] },
        { category: "Integration & Middleware", items: ["MuleSoft", "REST APIs", "SOAP APIs", "API integration patterns", "Event-Driven Architecture", "Platform Events", "Change Data Capture", "Webhook integrations"] },
        { category: "Frontend Development", items: ["HTML5", "CSS3", "JavaScript (ES6+)", "TypeScript", "React.js", "Vue.js", "Redux", "Responsive Design"] },
        { category: "Backend Development", items: ["Java", "Python", "Node.js", "RESTful APIs", "Microservices", "SQL", "NoSQL"] },
        { category: "Cloud & DevOps", items: ["AWS", "Heroku", "GitHub", "Salesforce DX", "Copado", "CI/CD Pipelines", "Containerized Deployments", "Production Support"] },
        { category: "Data & Databases", items: ["PostgreSQL", "MongoDB", "MySQL", "Data Modeling", "Query Optimization", "Salesforce Data Loader"] },
        { category: "Agile & Tools", items: ["JIRA", "Confluence", "Agile/Scrum", "Code Reviews", "Incident Response", "Stakeholder Collaboration", "Technical Design"] }
      ],
      experience: [
        {
          company: "Salesforce",
          title: "Software Engineer",
          location: "San Francisco Bay Area",
          date: "Feb 2024 – Present",
          project: "",
          bullets: [
            "Designed, developed, and maintained scalable <b>Salesforce solutions</b>, including <b>Apex, Lightning Web Components (LWC)</b>, and declarative configurations to support enterprise-grade workflows.",
            "Built and supported integration between <b>Salesforce</b> and enterprise systems using <b>APIs, middleware</b>, and <b>event-driven architectures</b>, enabling seamless data flow across distributed platforms.",
            "Enhanced <b>Salesforce Sales Cloud and Service Cloud</b> capabilities to support onboarding workflows, automation, and core business processes, improving operational efficiency by <b>30%</b>.",
            "Collaborated with business analysts and stakeholders to gather requirements and translate them into <b>scalable technical designs</b>, ensuring production-ready delivery within Agile sprint cycles.",
            "Extended and optimized <b>Salesforce data models</b>, automations, and workflows using <b>Flow Builder</b> and <b>Apex triggers</b> to meet evolving business needs.",
            "Developed and executed test strategies, including unit testing (<b>Apex</b>), integration testing, and regression suites, maintaining high code coverage across production systems.",
            "Mentored and supported team members by sharing <b>Salesforce architecture</b> and development best practices, fostering a culture of engineering excellence."
          ],
          technologies: "Apex, LWC, Flow Builder, SOQL, Salesforce DX, REST APIs, JIRA, Agile"
        },
        {
          company: "Akuna Capital",
          title: "Software Engineer Intern",
          location: "Remote",
          date: "Dec 2022 – Jan 2023",
          project: "",
          bullets: [
            "Developed front-end interfaces using <b>React.js</b> that improved user interface speed by <b>20%</b>, contributing to a smoother and more responsive user experience across trading dashboards.",
            "Integrated <b>blockchain wallets</b> and enhanced security protocols, reducing transaction errors by <b>10%</b> through rigorous testing and code hardening.",
            "Assisted in the implementation of <b>Redux</b> for efficient state management, improving data flow consistency and reducing load times by <b>15%</b>.",
            "Participated in <b>Agile sprints</b>, contributing to planning, retrospective meetings, and daily standups to enhance team collaboration and delivery cadence."
          ],
          technologies: "React.js, Redux, Blockchain, JavaScript, REST APIs, Agile"
        },
        {
          company: "Nexxen",
          title: "Software Engineer Intern",
          location: "Remote",
          date: "Jul 2022 – Aug 2022",
          project: "",
          bullets: [
            "Contributed to the development of web applications using <b>React.js</b>, improving load times by <b>10%</b> and enhancing user satisfaction through responsive UI improvements.",
            "Participated in comprehensive testing and code reviews, ensuring adherence to best practices and reducing bugs by <b>15%</b> across production deployments.",
            "Collaborated with cross-functional teams to deliver projects on time, improving project delivery rates by <b>20%</b> through effective communication and Agile practices.",
            "Engaged in continuous learning sessions, staying updated with the latest industry trends and technologies to contribute meaningfully to team velocity."
          ],
          technologies: "React.js, JavaScript, HTML5, CSS3, REST APIs, Agile"
        }
      ],
      education: [
        {
          institution: "University of California, Berkeley",
          degree: "Bachelor of Arts – BA, Computer Science",
          location: "Berkeley, CA",
          date: "2019 – 2023"
        }
      ],
      certifications: [
        "Salesforce Platform Developer I/II",
        "Salesforce Administrator"
      ]
    };

    const profile = await prisma.taskProfile.upsert({
      where: { id: "task-profile" },
      update: profileData,
      create: { id: "task-profile", ...profileData }
    });

    const sysPrompt = `
    You are an expert ATS CV Tailor and Cover Letter writer specializing in Salesforce engineering roles.
    I will provide a base profile, a Job Description, and an optional custom user prompt.
    You must return a JSON object containing THREE keys: "cv", "coverLetter", and "companyName".

    === TAILORING INSTRUCTIONS ===
    1. Make the resume 98–100% fit for the provided Job Description.
    2. Keep all bullet points human-written and natural — avoid obvious AI-style wording.
    3. Keep everything ATS-friendly with high keyword density naturally woven in.
    4. Apply strategic <b>bold</b> formatting to:
       - Technologies and tools (e.g., <b>Apex</b>, <b>LWC</b>, <b>MuleSoft</b>)
       - Architecture terms (e.g., <b>event-driven architecture</b>, <b>microservices</b>)
       - Cloud tools and platforms (e.g., <b>AWS</b>, <b>Heroku</b>, <b>Salesforce DX</b>)
       - Business-impact keywords (e.g., <b>operational efficiency</b>, <b>scalability</b>)
       - JD-matching terminology (mirror the exact language from the job description)
    5. Keep summaries concise but powerful — 4–6 sentences maximum.
    6. Add realistic, achievement-oriented wording with 1–2 believable metrics maximum per role.
    7. Strengthen these themes across bullet points:
       - Ownership and accountability
       - Scalability and production systems
       - Cloud infrastructure and deployment
       - Distributed systems and integration
       - Incident response and reliability
       - Architecture design and technical leadership
       - Cross-functional collaboration
    8. Inside project/experience sections, use strong wording without sounding fake.
    9. Preserve resume consistency and realistic experience alignment — never fabricate unrelated skills.
    10. Keep formatting systemized and recruiter-friendly.

    === ATS OPTIMIZATION ===
    Intentionally include across the document:
    - Exact JD terminology and alternate keyword variations
    - Salesforce-specific keywords: Apex, LWC, Flow, SOQL, Salesforce DX, Sales Cloud, Service Cloud, Experience Cloud
    - Integration keywords: MuleSoft, REST APIs, SOAP APIs, middleware, event-driven, Platform Events
    - Cloud/platform names: AWS, Heroku, Copado, GitHub Actions, CI/CD
    - Operational terms: production support, incident response, system reliability, observability
    - Engineering process terms: Agile, Scrum, sprint, code review, technical design, scalable architecture
    - Security/reliability keywords: secure coding, data integrity, access control, auditability
    - Enterprise-scale vocabulary: enterprise systems, distributed platforms, cross-functional, stakeholder collaboration

    === OUTPUT FORMAT ===
    1. "cv": An object tailored to the job description with this structure:
       - personal_info: { name, title, location, email, phone, github, linkedin }
       - summary_bullets: array of strings with <b> tags on key skills (4-6 bullets)
       - key_outcomes: string summarizing major achievements with <b> tags
       - skills: array of { category, items[] }
       - languages: array of strings or null
       - experience: array of { company, title, location, date, project, bullets[], technologies }
       - education: array of { institution, degree, location, date, coursework[] }
       - certifications: array of strings
       - work_authorization: string (default: "Authorized to work in the United States (no sponsorship required)")

    2. "coverLetter": A personalized Cover Letter in HTML using <p> and <br/> tags. Highlight the candidate's strengths from the CV matched to the job description. Address the specific company.

    3. "companyName": Extract the hiring company's name from the Job Description. If not found, use "Unknown Company".

    Candidate Base Information:
    ${baseProfileText ? "Base Profile Text (USE THIS FOR CANDIDATE EXPERIENCE/INFO):\n" + baseProfileText : "Default Base Profile JSON:\n" + JSON.stringify(profile, null, 2)}
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
