import { CatalystType, Novelty, PrismaClient } from '@prisma/client';

export interface ClassificationResult {
  catalystType: CatalystType;
  summary: string;
  novelty: Novelty;
  sentiment: string | null;
}

const prisma = new PrismaClient();

export async function classifyHeadline(
  ticker: string,
  headline: string,
  sourceUrl: string
): Promise<ClassificationResult> {
  const defaultResult: ClassificationResult = {
    catalystType: CatalystType.MARKET_WIDE,
    summary: '',
    novelty: Novelty.NEW,
    sentiment: null
  };

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('GROQ_API_KEY not set. Using fallback classification.');
      return defaultResult;
    }

    // Query past 14 days of headlines for context
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const pastEvents = await prisma.newsEvent.findMany({
      where: {
        ticker,
        createdAt: { gte: fourteenDaysAgo }
      },
      select: { headline: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const pastHeadlinesText = pastEvents.length > 0 
      ? pastEvents.map(e => `- ${e.headline} (${e.createdAt.toISOString().split('T')[0]})`).join('\n')
      : 'No recent headlines found.';

    const prompt = `
You are a cryptocurrency market analyst. Analyze the following news headline for the asset ${ticker}.

Current Headline: "${headline}"

Recent headlines for ${ticker} (past 14 days):
${pastHeadlinesText}

Based on the current headline, output a JSON object strictly matching this schema:
{
  "catalystType": "PARTNERSHIP" | "PROTOCOL_UPGRADE" | "INSTITUTIONAL_ADOPTION" | "NETWORK_ACTIVITY" | "MARKET_WIDE" | "HACK_EXPLOIT" | "REGULATORY",
  "summary": "one plain-English sentence on what this headline means for the coin",
  "novelty": "NEW" | "RECYCLED",
  "sentiment": "POSITIVE" | "NEGATIVE" | "AMBIGUOUS"
}

Rules:
- "novelty" should be RECYCLED if the current headline is just reporting on the exact same event as one of the recent headlines. Otherwise, NEW.
- "catalystType" should be HACK_EXPLOIT for hacks, exploits, exchange failures, and rug pulls.
- "catalystType" should be REGULATORY for SEC actions, bans, approvals, and legal rulings.
- For HACK_EXPLOIT and REGULATORY events specifically, output a "sentiment" tag (e.g. SEC bans = NEGATIVE, SEC approves = POSITIVE). Otherwise, it can be AMBIGUOUS or whatever makes sense.
- Return ONLY valid JSON. No markdown formatting, no backticks, no explanations.
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.warn(`Groq API error: ${response.status} ${response.statusText}`);
      return defaultResult;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const validCatalysts = Object.values(CatalystType);
    const validNovelties = Object.values(Novelty);

    const catalystType = validCatalysts.includes(parsed.catalystType) ? parsed.catalystType : CatalystType.MARKET_WIDE;
    const novelty = validNovelties.includes(parsed.novelty) ? parsed.novelty : Novelty.NEW;
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const sentiment = typeof parsed.sentiment === 'string' ? parsed.sentiment : null;

    return { catalystType, summary, novelty, sentiment };

  } catch (error) {
    console.error('Error in classifyHeadline:', error);
    return defaultResult;
  }
}
