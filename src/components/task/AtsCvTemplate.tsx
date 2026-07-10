"use client";

import React from "react";

export default function AtsCvTemplate({ data }: { data: any }) {
  if (!data) return null;

  const p = data.personal_info || {};

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-black font-sans text-[12.5px] leading-relaxed px-10 py-8">

      {/* ── HEADER ── */}
      <div className="text-center mb-3">
        <h1 className="text-[28px] font-bold text-black mb-0.5 tracking-wide">
          {p.name || "James Gao"}
        </h1>
        <div className="text-[13px] font-bold italic text-black mb-1">
          {p.title || "Salesforce Engineer | Cloud Solutions Specialist"}
        </div>
        <div className="flex items-center justify-center gap-4 text-[11.5px] text-black mb-1 flex-wrap">
          <span>✉ {p.email || "Jamesgao.success.pro@proton.me"}</span>
          <span>📞 {p.phone || "+1 (339) 399-0519"}</span>
          <span>📍 {p.location || "San Francisco, CA"}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-[11.5px] flex-wrap">
          {p.linkedin && (
            <a href={p.linkedin} className="text-blue-700 underline">{p.linkedin}</a>
          )}
          {p.linkedin && p.github && <span className="text-zinc-400">|</span>}
          {p.github && (
            <a href={p.github} className="text-blue-700 underline">{p.github}</a>
          )}
        </div>
      </div>

      {/* ── PROFESSIONAL SUMMARY ── */}
      <SectionHeader title="Professional Summary" />
      <div className="mb-4">
        {Array.isArray(data.summary_bullets) && data.summary_bullets.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-[12px]">
            {data.summary_bullets.map((b: string, i: number) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
            ))}
          </ul>
        ) : (
          <p className="text-justify text-[12px]" dangerouslySetInnerHTML={{ __html: data.summary || "" }} />
        )}
        {data.key_outcomes && (
          <p className="mt-2 text-[11.5px] text-zinc-700">
            <span className="font-bold">Key Outcomes: </span>
            <span dangerouslySetInnerHTML={{ __html: data.key_outcomes }} />
          </p>
        )}
      </div>

      {/* ── PROFESSIONAL EXPERIENCE ── */}
      <SectionHeader title="Professional Experience" />
      <div className="mb-4 space-y-5">
        {data.experience?.map((exp: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between items-baseline">
              <div>
                <span className="font-bold italic text-[12.5px]">{exp.title}</span>
                {" "}
                <span className="text-[12.5px]">|</span>
                {" "}
                <a className="text-blue-600 font-normal italic text-[12.5px]">{exp.company}</a>
              </div>
              <div className="text-[11.5px] text-zinc-600 shrink-0 ml-4">
                {exp.date}{exp.location ? ` | ${exp.location}` : ""}
              </div>
            </div>

            {exp.project && (
              <div className="text-[11.5px] text-zinc-500 italic mb-1">
                Project: {exp.project}
              </div>
            )}

            <ul className="list-disc pl-5 space-y-0.5 mt-1 text-[12px]">
              {exp.bullets?.map((bullet: string, j: number) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: bullet }} />
              ))}
            </ul>

            {exp.technologies && (
              <div className="text-[11.5px] mt-1">
                <span className="font-bold">Technologies: </span>{exp.technologies}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── EDUCATION ── */}
      <SectionHeader title="Education" />
      <div className="mb-4 space-y-3">
        {data.education?.map((edu: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-[12.5px]">{edu.degree}</span>
              <span className="text-[11.5px] text-zinc-600 italic shrink-0 ml-4">
                {edu.institution}{edu.location ? ` / ` : ""}{edu.date}
              </span>
            </div>
            {edu.coursework && Array.isArray(edu.coursework) && edu.coursework.length > 0 && (
              <div className="mt-1">
                <div className="font-bold text-[12px] mb-0.5">Relevant Coursework:</div>
                <ul className="list-disc pl-5 columns-2 text-[11.5px] space-y-0.5">
                  {edu.coursework.map((c: string, ci: number) => (
                    <li key={ci}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── SKILLS & EXPERTISE ── */}
      <SectionHeader title="Skills &amp; Expertise" />
      <div className="mb-4 space-y-1 text-[12px]">
        {data.skills?.map((cat: any, i: number) => (
          <div key={i}>
            <span className="font-bold">{cat.category}:</span>{" "}
            <span dangerouslySetInnerHTML={{ __html: cat.items.join(", ") }} />
          </div>
        ))}
      </div>

      {/* ── CERTIFICATIONS ── */}
      {data.certifications && data.certifications.length > 0 && (
        <>
          <SectionHeader title="Certifications" />
          <ul className="list-disc pl-5 space-y-0.5 mb-4 text-[12px]">
            {data.certifications.map((cert: string, i: number) => (
              <li key={i} className="font-bold">{cert}</li>
            ))}
          </ul>
        </>
      )}

      {/* ── WORK AUTHORIZATION ── */}
      <div className="mt-4 text-[11.5px]">
        <span className="font-bold">Work Authorization: </span>
        <span className="text-zinc-700">
          {data.work_authorization || "Authorized to work in the United States (no sponsorship required)"}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-2">
      <div className="border-t-2 border-[#1a3f7a] mb-0.5" />
      <h2
        className="text-[13px] font-bold text-center text-[#1a4fa0] uppercase tracking-widest py-0.5"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="border-b-2 border-[#1a3f7a] mt-0.5" />
    </div>
  );
}
