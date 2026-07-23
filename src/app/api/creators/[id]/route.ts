import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    let project = await prisma.creatorProject.findUnique({
      where: { id }
    });
    
    // Seed/upsert default dummy data for this specific project ID if not present in DB
    if (!project && id === "cmrhm3ey6000076n566mv8qgq") {
      project = await prisma.creatorProject.create({
        data: {
          id: "cmrhm3ey6000076n566mv8qgq",
          name: "Metaverse Survival Campaign",
          client: "Vibe Tech Inc.",
          creator: "Olas (Developer / Creator)",
          status: "In Progress",
          budget: "$12,500",
          timeline: [
            { "id": 1, "title": "Initial Briefing & Contract", "date": "Day 1", "completed": true, "description": "Review and sign the initial contract. Finalize the creative brief." },
            { "id": 2, "title": "Product Shipment", "date": "Day 3", "completed": true, "description": "Shipped specialized hardware mockups to creator's studio." },
            { "id": 3, "title": "Concept Brainstorming", "date": "Day 5", "completed": false, "description": "Review initial hook ideas and thumbnail mockups." },
            { "id": 4, "title": "Script Approval", "date": "Day 7", "completed": false, "description": "Review and approve the video script before production begins." },
            { "id": 5, "title": "Production (Filming)", "date": "Day 10", "completed": false, "description": "Complete shooting in studio and on-site challenge scenes." },
            { "id": 6, "title": "Initial Edit", "date": "Day 12", "completed": false, "description": "Deliver rough cut version 1 for initial review." },
            { "id": 7, "title": "Internal Review", "date": "Day 14", "completed": false, "description": "Collate internal feedback and review hook engagement metrics." },
            { "id": 8, "title": "Creator Revisions", "date": "Day 16", "completed": false, "description": "Apply pacing corrections and sound effects revisions." },
            { "id": 9, "title": "Final Polish", "date": "Day 18", "completed": false, "description": "Complete color grading and master audio polish." },
            { "id": 10, "title": "Content Upload", "date": "Day 20", "completed": false, "description": "Upload schedules and assets onto publishing server." },
            { "id": 11, "title": "Content Go-Live", "date": "Day 21", "completed": false, "description": "Publish schedule for YouTube and TikTok distribution." }
          ],
          titles: [
            { "id": 1, "text": "I Survived 50 Hours in the Metaverse", "type": "High retention hook" },
            { "id": 2, "text": "Testing the World's Most Expensive Setup", "type": "Tech / Gadget focus" },
            { "id": 3, "text": "How I Built a $100k Business in 30 Days", "type": "Finance / Business" },
            { "id": 4, "text": "Why You're Using Your iPhone Wrong", "type": "Tutorial / Tech" },
            { "id": 5, "text": "The Secret to Viral Videos Revealed", "type": "Educational" },
            { "id": 6, "text": "I Tried Elon Musk's Daily Routine", "type": "Lifestyle Challenge" },
            { "id": 7, "text": "Don't Buy This Laptop Until You Watch This", "type": "Review Warning" },
            { "id": 8, "text": "My 5 AM Morning Routine for Productivity", "type": "Lifestyle" },
            { "id": 9, "text": "Exposing the Biggest Tech Scam of 2026", "type": "Investigative" },
            { "id": 10, "text": "Building a Custom PC for a Celebrity", "type": "Build / VLOG" },
            { "id": 11, "text": "I Ate Only Pizza for 7 Days", "type": "Challenge" },
            { "id": 12, "text": "React vs Next.js in 2026", "type": "Programming" },
            { "id": 13, "text": "How to Make Cinematic Videos on Phone", "type": "Tutorial" },
            { "id": 14, "text": "Behind the Scenes of my Studio", "type": "Vlog", "hook": "Come see where the magic happens.", "script": "Welcome to my new studio..." }
          ],
          contents: [
            { "id": 1, "title": "I Survived 50 Hours in the Metaverse", "type": "Video", "status": "Published", "views": "1.2M", "date": "Aug 12, 2026" },
            { "id": 2, "title": "Testing the World's Most Expensive Setup", "type": "Short", "status": "In Review", "views": "-", "date": "Aug 15, 2026" },
            { "id": 3, "title": "My 5 AM Morning Routine", "type": "Video", "status": "Draft", "views": "-", "date": "Aug 18, 2026" },
            { "id": 4, "title": "Behind the Scenes Vlog", "type": "Video", "status": "Filming", "views": "-", "date": "Aug 22, 2026" },
            { "id": 5, "title": "Why You're Using Your iPhone Wrong", "type": "Short", "status": "Editing", "views": "-", "date": "Aug 25, 2026" }
          ],
          videos: []
        }
      });
    }
    
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Error fetching creator project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { name, client, creator, status, budget, timeline, titles, contents, videos } = body;

    const updated = await prisma.creatorProject.update({
      where: { id },
      data: {
        name,
        client,
        creator,
        status,
        budget,
        timeline: timeline || [],
        titles: titles || [],
        contents: contents || [],
        videos: videos || []
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating creator project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
