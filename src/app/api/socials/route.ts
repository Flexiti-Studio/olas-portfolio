import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templates = await prisma.socialTemplate.findMany({
      select: {
        platform: true,
      },
      distinct: ['platform']
    });

    // Provide default fallback if db is empty
    const defaultSocials = ["youtube", "tiktok", "instagram", "twitter", "linkedin", "threads"];
    const dbSocials = templates.map(t => t.platform);
    
    const combined = Array.from(new Set([...defaultSocials, ...dbSocials]));

    return NextResponse.json({ socials: combined });
  } catch (error: any) {
    console.error("Error fetching socials:", error);
    // Return defaults on error
    return NextResponse.json({ socials: ["youtube", "tiktok", "instagram", "twitter", "linkedin", "threads"] });
  }
}
