import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CANDIDATE_BACKGROUND = `Software Developer and AI Automation Engineer with experience in full-stack development (Next.js, Node.js, TypeScript, Python), AI automation (LangChain, CrewAI, n8n), mobile apps (React Native), and LMS platform management. Based in Lagos, Nigeria. Open to remote roles.`;

async function webSearch(query: string): Promise<string> {
  // Use OpenAI's built-in web search via the responses API
  try {
    const response = await (openai as any).responses.create({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input: query,
    });
    const output = response.output as any[];
    const textItems = output?.filter((o: any) => o.type === 'message');
    if (textItems?.length) {
      return textItems.map((t: any) => t.content?.map((c: any) => c.text || '').join('') || '').join('\n');
    }
    return '';
  } catch {
    // Fallback: ask the model to reason from training knowledge
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Research query (answer from your knowledge): ${query}` }],
      max_tokens: 600,
    });
    return res.choices[0]?.message?.content || '';
  }
}

export async function POST(req: NextRequest) {
  const { company, role, depth } = await req.json();
  if (!company) return NextResponse.json({ error: 'Company is required' }, { status: 400 });

  const year = new Date().getFullYear();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const searchResults: Record<string, string> = {};

        send({ step: 1, label: 'Searching company overview...' });
        searchResults.overview = await webSearch(`${company} company overview funding headquarters size employees tech stack ${year}`);

        send({ step: 2, label: 'Analysing culture & employee sentiment...' });
        searchResults.culture = await webSearch(`${company} glassdoor culture review employee experience work environment ${year}`);

        send({ step: 3, label: 'Fetching latest news...' });
        searchResults.news = await webSearch(`${company} news ${year} funding product launch leadership`);

        if (depth !== 'quick') {
          send({ step: 4, label: 'Gathering interview intelligence...' });
          searchResults.interviews = await webSearch(`${company} interview process questions experience ${role || 'software developer'} ${year}`);
        }

        send({ step: 5, label: 'Synthesising research brief...' });

        const systemPrompt = `You are a career research analyst. Synthesise the provided research data into a clean, structured, actionable company brief for a job applicant. Be specific and factual — do not pad with generic advice. Every insight must be grounded in the data provided. Where data is missing or unclear, say so honestly rather than inventing details. Return ONLY valid JSON, no markdown, no backticks, no explanation.`;

        const userPrompt = `COMPANY: ${company}
ROLE APPLYING FOR: ${role || 'not specified'}

CANDIDATE BACKGROUND:
${CANDIDATE_BACKGROUND}

RESEARCH DATA:
${Object.entries(searchResults).map(([k, v]) => `=== ${k.toUpperCase()} ===\n${v}`).join('\n\n')}

Return this exact JSON structure (fill every field, use empty string or empty array if unknown):
{
  "snapshot": { "founded": "", "hq": "", "size": "", "industry": "", "stage": "", "description": "", "website": "", "linkedin": "", "funding": "" },
  "techStack": { "products": [], "languages": [], "frameworks": [], "infrastructure": [], "engineeringBlog": "", "openSource": [] },
  "culture": { "values": [], "workStyle": "", "remotePolicy": "", "sentiment": "", "dei": "" },
  "news": [{ "title": "", "date": "", "summary": "", "url": "" }],
  "interviewIntelligence": { "process": "", "stages": [], "commonQuestions": [], "whatTheyValue": [], "redFlags": [] },
  "talkingPoints": { "thingsToMention": [], "howToFrameExperience": "", "questionsToAsk": [] },
  "competitors": [{ "name": "", "differentiation": "" }],
  "sources": [{ "label": "", "url": "" }]
}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        let parsed: any = {};
        try { parsed = JSON.parse(raw); } catch { parsed = {}; }

        send({ step: 6, label: 'Complete!', result: parsed, rawSearchData: searchResults });
        controller.close();
      } catch (err: any) {
        send({ error: err.message || 'Research pipeline failed' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
