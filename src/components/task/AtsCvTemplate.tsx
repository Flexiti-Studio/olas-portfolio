"use client";

import React from "react";

export default function AtsCvTemplate({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="w-full max-w-[850px] mx-auto bg-white text-black p-10 font-sans text-[13px] leading-relaxed shadow-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-black mb-1">{data.personal_info?.name || "Emmanuel Adeleke"}</h1>
        <div className="text-lg font-bold italic mb-1">{data.personal_info?.title || "Senior Full Stack Engineer"}</div>
        <div className="mb-1">{data.personal_info?.location || "Brooklyn, NY 11233"}</div>
        <div className="mb-1">
          {data.personal_info?.email || "emmanuel.success.work@gmail.com"} • {data.personal_info?.phone || "+1 (339)-399-0519"}
        </div>
        <div className="text-blue-600 underline">
          <a href={data.personal_info?.github || "#"}>{data.personal_info?.github || "https://github.com/svendev888"}</a>
          {" • "}
          <a href={data.personal_info?.linkedin || "#"}>{data.personal_info?.linkedin || "https://www.linkedin.com/in/emmanuel-adeleke-success/"}</a>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold uppercase mb-2">Summary</h2>
        <p className="text-justify" dangerouslySetInnerHTML={{ __html: data.summary || "Results-driven Senior Full Stack Software Engineer..." }} />
      </div>

      {/* Technical Skills */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold uppercase mb-2">Technical Skills</h2>
        <div className="space-y-1">
          {data.skills?.map((cat: any, i: number) => (
            <div key={i}>
              <span className="font-bold">{cat.category}:</span> {cat.items.join(", ")}
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      {data.languages && data.languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[14px] font-bold uppercase mb-2">Languages</h2>
          <div>
            <span className="font-bold">English:</span> Native
          </div>
        </div>
      )}

      {/* Professional Experience */}
      <div className="mb-6">
        <h2 className="text-[14px] font-bold uppercase mb-2">Professional Experience</h2>
        <div className="space-y-6">
          {data.experience?.map((exp: any, i: number) => (
            <div key={i}>
              {i > 0 && <hr className="border-gray-300 my-4" />}
              <div className="uppercase font-bold text-[14px] mb-1">{exp.company}</div>
              <div className="font-bold">{exp.title}</div>
              <div className="italic mb-2">{exp.location} | {exp.date}</div>
              
              {exp.project && (
                <div className="mb-2">
                  <span className="font-bold">Project:</span> {exp.project}
                </div>
              )}
              
              <ul className="list-disc pl-5 space-y-1 mb-2">
                {exp.bullets?.map((bullet: string, j: number) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: bullet }} />
                ))}
              </ul>
              
              {exp.technologies && (
                <div>
                  <span className="font-bold">Technologies:</span> {exp.technologies}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="mb-6">
        <hr className="border-gray-300 my-4" />
        <h2 className="text-[14px] font-bold uppercase mb-2">Education</h2>
        <div className="space-y-4">
          {data.education?.map((edu: any, i: number) => (
            <div key={i}>
              <div className="font-bold">{edu.institution}</div>
              <div>{edu.degree}</div>
              <div>{edu.location}</div>
              <div>{edu.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div>
          <hr className="border-gray-300 my-4" />
          <h2 className="text-[14px] font-bold uppercase mb-2">Certifications</h2>
          <ul className="list-disc pl-5 space-y-1">
            {data.certifications.map((cert: string, i: number) => (
              <li key={i}>{cert}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
