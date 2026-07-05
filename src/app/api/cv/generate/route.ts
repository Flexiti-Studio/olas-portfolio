import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { templateId, jobDescription, instructions, tone } = await req.json();

    if (!templateId || !jobDescription) {
      return NextResponse.json({ error: 'Template ID and Job Description are required' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const templateContent = JSON.stringify(template.sections, null, 2);

    const systemPrompt = `You are an expert CV writer. Tailor the candidate's CV to match the job description.
Do not invent experience that does not exist in the base CV.
Use strong action verbs. Reorder and rewrite bullets to lead with what is most relevant to this specific role.`;

    const userPrompt = `BASE CV:
${templateContent}

JOB DESCRIPTION:
${jobDescription}

INSTRUCTIONS:
${instructions || 'None'}

TONE: ${tone || 'Professional'}

Return ONLY valid JSON, no markdown, no backticks:
{
  "jobTitle": "extracted job title",
  "company": "extracted company name",  
  "profile": "rewritten profile",
  "experience": [{ "title": "", "company": "", "period": "", "bullets": [] }],
  "skillsHighlight": "skills summary for this role",
  "matchedKeywords": [],
  "missingKeywords": [],
  "atsScore": 0,
  "atsSuggestions": ["suggestion 1", "suggestion 2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsedResponse = JSON.parse(response.choices[0].message.content || '{}');

    return NextResponse.json(parsedResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
