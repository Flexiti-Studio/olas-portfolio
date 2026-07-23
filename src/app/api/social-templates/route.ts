import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATES = [
  {
    platform: "youtube",
    name: "YouTube Description SEO Structure",
    description: "Perfect for indexing keywords and engaging viewers in description box.",
    body: "🚀 [Hook summary of video]\n\n👇 SUBSCRIBE for more content:\n[Link]\n\n⏱️ TIMESTAMPS:\n0:00 - Intro\n1:30 - [Point 1]\n4:00 - [Point 2]\n\n💬 CONNECT WITH ME:\n- Twitter: [Link]\n- LinkedIn: [Link]",
    placeholders: ["hook", "point1", "point2"]
  },
  {
    platform: "tiktok",
    name: "Viral 3-Act Script Structure",
    description: "Hook visual followed by context, explanation, and unexpected twist cta.",
    body: "👀 VISUAL HOOK (0-3s):\n[Describe shocking starting frame/action]\n🗣️ AUDIO HOOK:\n\"[Insert verbal hook]\"\n\n📈 ACT 1 (3-15s):\n[Deliver background context quickly]\n\n💡 ACT 2 (15-45s):\n[Main lesson/value point]\n\n🎁 ACT 3 (45-60s):\n[Unexpected twist / humor beat]\n\n👉 CALL TO ACTION:\n[Comment request / follow]",
    placeholders: ["visualHook", "verbalHook", "context", "lesson", "twist", "cta"]
  },
  {
    platform: "instagram",
    name: "High Engagement Carousel Blueprint",
    description: "Slide-by-slide layout for carousel text posts.",
    body: "Slide 1 (Cover): [Intriguing main question or bold claim]\nSlide 2 (The Hook): [Why they should care / pain point]\nSlide 3-5 (The Value): [Step-by-step tutorial or stats]\nSlide 6 (Summary): [Recap of points]\nSlide 7 (Action): [CTA - Save, Share, or Comment]",
    placeholders: ["cover", "hook", "value", "cta"]
  },
  {
    platform: "twitter",
    name: "Viral Twitter Thread Template",
    description: "Maximizes click-throughs and retweets.",
    body: "Tweet 1 (Hook):\n[Bold assertion or shock statistic] 👇\n\nTweet 2-5:\n[Detailed breakdowns with bullet points]\n\nTweet 6:\n[Link to full resource or final takeaway]",
    placeholders: ["hook", "detail", "takeaway"]
  },
  {
    platform: "linkedin",
    name: "Professional Growth Narrative",
    description: "Perfect for sharing industry lessons and personal career growth.",
    body: "HOOK:\n[A contrarian statement or raw admission]\n\nTHE STORY:\n[Context: what went wrong/right]\n\nTHE SHIFT:\n[The pivotal lesson or moment of growth]\n\nTHE TAKEAWAY:\n[3 actionable bullet points]\n\n👉 What are your thoughts on this? Let's discuss in the comments.",
    placeholders: ["hook", "story", "shift", "bullets"]
  }
];

export async function GET() {
  try {
    let templates = await prisma.socialTemplate.findMany({
      orderBy: { createdAt: "desc" }
    });

    if (templates.length === 0) {
      // Auto seed database templates
      await Promise.all(
        DEFAULT_TEMPLATES.map(t =>
          prisma.socialTemplate.create({
            data: {
              platform: t.platform,
              name: t.name,
              description: t.description,
              body: t.body,
              placeholders: t.placeholders
            }
          })
        )
      );

      templates = await prisma.socialTemplate.findMany({
        orderBy: { createdAt: "desc" }
      });
    }

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, name, description, body: templateBody, placeholders } = body;

    if (!platform || !name || !templateBody) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const template = await prisma.socialTemplate.create({
      data: {
        platform,
        name,
        description,
        body: templateBody,
        placeholders: placeholders || []
      }
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
