import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Global cache to persist mock data across page reloads if DB is offline
const mockDbCache: Record<string, any> = {};

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    let project = null;
    try {
      project = await prisma.creatorProject.findUnique({
        where: { id }
      });
    } catch (dbError) {
      console.warn("Database unavailable, falling back to dummy data for GET", dbError);
    }
    
    // Seed/upsert default dummy data if not present in DB or DB is offline
    if (!project) {
      const defaultData = {
          id: id,
          name: "New Campaign",
          client: "",
          creator: "",
          status: "In Progress",
          budget: "",
          timeline: [],
          titles: [],
          contents: [],
          videos: [],
          images: []
      };

      try {
        project = await prisma.creatorProject.create({
          data: defaultData
        });
      } catch (createError) {
        console.warn("Could not create in DB, using memory object:", createError);
        // Serve from cache if available, otherwise use default
        project = mockDbCache[id] ? mockDbCache[id] : defaultData;
        mockDbCache[id] = project;
      }
    } else {
      // If project was found or handled, update our cache just in case
      mockDbCache[id] = project;
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
    const { name, client, creator, status, budget, timeline, titles, contents, videos, images } = body;

    const updateData = {
        name,
        client,
        creator,
        status,
        budget,
        timeline: timeline || [],
        titles: titles || [],
        contents: contents || [],
        videos: videos || [],
        images: images || []
    };

    let updated = null;
    try {
      updated = await prisma.creatorProject.update({
        where: { id },
        data: updateData
      });
      mockDbCache[id] = updated;
    } catch (dbError) {
      console.warn("Database unavailable, mocking PUT response:", dbError);
      
      // Merge with existing cache if available
      const existing = mockDbCache[id] || {};
      updated = { ...existing, id, ...updateData };
      mockDbCache[id] = updated;
    }

    return NextResponse.json({ project: updated });
  } catch (error: any) {
    console.error("Error updating creator project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
