import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const defaultTemplates = [
  {
    name: "Explainer",
    description: "A standard structure for breaking down complex topics into simple terms.",
    isDefault: true,
    data: {
      format: "16:9",
      targetSeconds: 60,
      structure: [
        { id: "beat-1", name: "Hook", purpose: "Grab attention immediately", mood: "Energetic", share: 0.15, media: "video" },
        { id: "beat-2", name: "Problem", purpose: "State the pain point", mood: "Serious", share: 0.25, media: "either" },
        { id: "beat-3", name: "Solution", purpose: "Introduce the fix", mood: "Optimistic", share: 0.35, media: "either" },
        { id: "beat-4", name: "Call to Action", purpose: "Tell them what to do next", mood: "Direct", share: 0.25, media: "video" }
      ],
      voice: { persona: "Expert", voiceId: "nova", language: "en", tone: "authoritative", pace: "normal", avoid: ["jargon", "complex words"] },
      image: { style: "Minimalist flat illustration", model: "dall-e-3", references: [], negative: "photorealistic, cluttered" },
      video: { cameraMoves: ["pan", "zoom in"], motion: "moderate", shotVariety: true, clipSeconds: { min: 2, max: 5 }, chainFrames: false, model: "sora" },
      rules: { wordsPerScene: 15, minScenes: 4, maxScenes: 8, keepOriginalWording: true }
    }
  },
  {
    name: "Short-form hook",
    description: "Fast-paced, highly engaging format for TikTok/Reels.",
    isDefault: false,
    data: {
      format: "9:16",
      targetSeconds: 30,
      structure: [
        { id: "beat-1", name: "Pattern Interrupt", purpose: "Stop the scroll", mood: "Surprising", share: 0.2, media: "video" },
        { id: "beat-2", name: "Value Prop", purpose: "Deliver the core message fast", mood: "Exciting", share: 0.6, media: "either" },
        { id: "beat-3", name: "Loop", purpose: "Encourage a rewatch", mood: "Intriguing", share: 0.2, media: "video" }
      ],
      voice: { persona: "Creator", voiceId: "alloy", language: "en", tone: "conversational", pace: "fast", avoid: ["formal"] },
      image: { style: "Vibrant pop-art", model: "dall-e-3", references: [], negative: "dull, dark" },
      video: { cameraMoves: ["whip pan", "dutch angle"], motion: "dynamic", shotVariety: true, clipSeconds: { min: 1, max: 3 }, chainFrames: false, model: "sora" },
      rules: { wordsPerScene: 8, minScenes: 3, maxScenes: 6, keepOriginalWording: false }
    }
  },
  {
    name: "Cinematic story",
    description: "Slow, atmospheric pacing for emotional storytelling.",
    isDefault: false,
    data: {
      format: "16:9",
      targetSeconds: 120,
      structure: [
        { id: "beat-1", name: "Setting the scene", purpose: "Establish the world", mood: "Atmospheric", share: 0.3, media: "video" },
        { id: "beat-2", name: "Rising action", purpose: "Build the tension", mood: "Tense", share: 0.4, media: "video" },
        { id: "beat-3", name: "Climax & Resolution", purpose: "Deliver the emotional payoff", mood: "Cathartic", share: 0.3, media: "video" }
      ],
      voice: { persona: "Narrator", voiceId: "echo", language: "en", tone: "dramatic", pace: "slow", avoid: ["rushed", "excited"] },
      image: { style: "Moody cinematic photography", model: "dall-e-3", references: [], negative: "cartoon, bright, flat" },
      video: { cameraMoves: ["slow push in", "static"], motion: "subtle", shotVariety: false, clipSeconds: { min: 4, max: 10 }, chainFrames: true, model: "sora" },
      rules: { wordsPerScene: 20, minScenes: 3, maxScenes: 10, keepOriginalWording: true }
    }
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Fetch templates (global defaults + user specific)
    let templates = await prisma.videoTemplate.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: userId || undefined }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Seed if none exist
    if (templates.length === 0) {
      console.log("Seeding default templates...");
      const seeded = await Promise.all(defaultTemplates.map(t => 
        prisma.videoTemplate.create({
          data: {
            name: t.name,
            description: t.description,
            isDefault: t.isDefault,
            data: t.data,
            version: 1
          }
        })
      ));
      templates = seeded;
    }

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, data, userId, isDefault } = body;
    
    const newTemplate = await prisma.videoTemplate.create({
      data: {
        name,
        description,
        data,
        userId: userId || null,
        isDefault: isDefault || false,
        version: 1
      }
    });

    return NextResponse.json({ template: newTemplate });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
