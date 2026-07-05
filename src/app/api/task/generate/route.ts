import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, prompt, baseProfileText } = await req.json();

    // Fetch the base profile for the task
    let profile = await prisma.taskProfile.findUnique({ where: { id: "task-profile" } });
    // ... we still fetch the default profile as a fallback structure.

    if (!profile) {
      // Create a default one if it doesn't exist
      profile = await prisma.taskProfile.create({
        data: {
          id: "task-profile",
          personal_info: {
            name: "Emmanuel Adeleke",
            title: "Senior Full Stack Engineer",
            location: "Brooklyn, NY 11233",
            email: "emmanuel.success.work@gmail.com",
            phone: "+1 (339)-399-0519",
            github: "https://github.com/svendev888",
            linkedin: "https://www.linkedin.com/in/emmanuel-adeleke-success/"
          },
          skills: [
            { category: "Frontend Development", items: ["React", "Next.js", "TypeScript", "JavaScript", "Material UI (MUI)", "HTML5", "CSS3", "Responsive UI", "Accessibility Standards", "Component Architecture", "State Management"] },
            { category: "Backend Development", items: ["Java", "Spring Boot", "Node.js", "NestJS", "Python", "RESTful APIs", "GraphQL Services", "Microservices", "Service Communication Layers", "OOP", "Design Patterns"] },
            { category: "Testing", items: ["Jest", "React Testing Library", "Playwright", "Unit Testing", "Integration Testing", "Automated Testing Frameworks"] },
            { category: "Cloud & DevOps", items: ["AWS", "Azure", "Docker", "Kubernetes", "OpenShift", "GitHub Actions", "Jenkins", "CI/CD Pipelines", "Containerized Deployments"] },
            { category: "Observability & Reliability", items: ["Datadog", "Monitoring", "Logging", "Production Support", "Incident Response", "Performance Optimization", "System Reliability"] },
            { category: "Data & Messaging", items: ["PostgreSQL", "MongoDB", "MySQL", "SQL Server", "Query Optimization", "Kafka", "RabbitMQ", "Event-Driven Architecture"] },
            { category: "Tools & Process", items: ["Git", "GitHub", "PR-Based Development", "Jira", "Agile/Scrum", "Code Reviews", "Secure Coding", "Auditability", "Stakeholder Collaboration"] }
          ],
          experience: [
            {
              company: "I3INC",
              title: "Founding Software Developer",
              location: "Remote",
              date: "11/2025 - Present",
              project: "Shifts by Snagajob",
              bullets: [
                "Designed and delivered frontend-heavy full-stack applications utilizing <b>React, Next.js, TypeScript,</b> and <b>Material UI</b>, with robust backend support across <b>Java/Spring Boot, Node.js</b>, and <b>Python</b> services.",
                "Architected a <b>scalable and reusable React component architecture</b>, ensuring compliance with <b>responsive design</b> and accessibility standards to enhance user engagement.",
                "Translated Figma designs into <b>production-ready screens</b>, optimizing user workflows for both internal and customer-facing applications, resulting in <b>increase</b> in user satisfaction ratings.",
                "Developed and maintained <b>RESTful APIs</b> and <b>GraphQL</b> integrations, streamlining workflow automation and reporting functionalities.",
                "Implemented <b>frontend state management</b> patterns, improving maintainability and performance across complex user workflows, leading to a <b>70% reduction</b> in bug reports.",
                "Achieved a <b>significant reduction</b> in production issues through enhanced <b>monitoring</b> and incident response practices using <b>Datadog</b>.",
                "Contributed to the improvement of <b>CI/CD pipelines</b> using <b>GitHub Actions</b> and <b>Jenkins</b>, resulting in <b>faster deployment cycle</b>.",
                "Collaborated with cross-functional teams in <b>Agile</b> sprint environments, ensuring timely delivery of enterprise-grade features and fostering a culture of continuous improvement."
              ],
              technologies: "Figma, Design Systems, Responsive Design, Jira, Slack"
            },
            {
              company: "PEPSICO",
              title: "Senior Full Stack Engineer",
              location: "Remote",
              date: "01/2023 - 10/2025",
              project: "Hotelling",
              bullets: [
                "Developed and maintained <b>enterprise-scale applications</b> with a frontend focus using <b>React, Next.js, TypeScript</b>, and <b>Material UI</b>, enhancing user experience across the platform.",
                "Engineered <b>backend APIs</b> and integrations using <b>Java Spring Boot, .NET/C#</b>, and <b>Python</b>, optimizing performance through advanced query tuning and caching strategies, achieving a <b>20% increase</b> in API response times.",
                "Delivered <b>reusable UI components</b> and shared frontend patterns, significantly improving development efficiency and reducing redundancy across multiple projects.",
                "Integrated <b>frontend applications</b> with <b>REST APIs, GraphQL</b> service layers, and distributed backend systems to support unified enterprise workflows, facilitating a <b>rapid increase</b> in operational efficiency.",
                "Supported <b>AWS</b> and <b>Azure</b> cloud-hosted applications, contributing to <b>Docker-based deployment workflows</b> and <b>CI/CD pipeline enhancements</b>.",
                "Partnered with product managers and UX designers to translate complex business requirements into <b>production-ready features</b>, resulting in an <b>increase</b> in feature adoption rates."
              ],
              technologies: "Figma, Responsive UI Design, TypeScript"
            },
            {
              company: "RIGHTPOINT",
              title: "Senior Frontend Developer",
              location: "Remote",
              date: "02/2022 - 12/2022",
              project: "Facilities Management System",
              bullets: [
                "Developed responsive frontend applications using <b>React, Next.js, TypeScript</b>, and <b>Material UI</b>, significantly enhancing user interface consistency and performance.",
                "Built reusable UI components and frontend modules following scalable component architecture and modern state management practices, improving development speed.",
                "Converted design wireframes and <b>Figma prototypes</b> into accessible, production-ready interfaces, ensuring compliance with accessibility standards.",
                "Improved frontend rendering performance and navigation flow through strategic refactoring and optimization, resulting in <b>decrease</b> in load times.",
                "Integrated frontend applications with <b>REST APIs</b> and backend service layers to support real-time operational workflows, enhancing user experience and satisfaction."
              ],
              technologies: "HTML5, CSS3, JavaScript, Figma"
            }
          ],
          education: [
            {
              institution: "New York University",
              degree: "Master of Science in Computer Science",
              location: "New York, NY",
              date: "2019-2022"
            },
            {
              institution: "Sheridan College",
              degree: "Computer Software Engineering & Frontend Development",
              location: "Sheridan, WY",
              date: "2017-2019"
            }
          ],
          certifications: [
            "CompTIA A+ ce Certification",
            "IT Essentials"
          ]
        }
      });
    }

    const sysPrompt = `
    You are an expert ATS CV Tailor and Cover Letter writer.
    I will provide a base profile, a Job Description, and an optional custom user prompt.
    You must return a JSON object containing THREE keys: "cv", "coverLetter", and "companyName".
    
    1. "cv": An object that perfectly matches the base profile structure but TAILORED for the job description.
       - Use the custom user prompt to inject specific bullet points or technologies if provided! For example, if the prompt mentions Solidity or Smart Contracts, make sure to add it naturally into an experience bullet point or skills.
       - Keep the overall formatting ATS friendly, using <b> tags for important keywords in the bullets.
       - The 'cv' object must have: personal_info (name, title, location, email, phone, github, linkedin), summary (string with <b> tags), skills (array of {category, items[]}), languages (array of string, or null), experience (array of {company, title, location, date, project, bullets[], technologies}), education, certifications.
    
    2. "coverLetter": A beautifully written Cover Letter in HTML format (using <p>, <br/> tags). It should be personalized to the job description, highlight the candidate's strengths from the CV, and address the company.

    3. "companyName": Extract the name of the company hiring from the Job Description. If not found, use "Unknown Company".

    Candidate Base Information to use (If the user provided 'Base Profile Text', use that over the JSON default!):
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
