import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let query = supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (stage) {
      query = query.eq("stage", stage);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }
    if (search) {
      query = query.or(`company.ilike.%${search}%,job_title.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const tagsList = Array.isArray(body.tags) ? [...body.tags] : [];
    if (body.job_type && !tagsList.includes(body.job_type)) {
      tagsList.push(body.job_type);
    }

    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          job_title: body.jobTitle || body.job_title || "Software Developer",
          company: body.company || "Unknown Company",
          stage: body.stage || "Applied",
          source: body.source || "Speed Apply",
          tags: tagsList,
          job_description: body.job_description || null,
          job_url: body.job_url || null,
          cover_letter_url: body.cover_letter_url || null,
          linked_cv_id: body.linked_cv_id || null,
          linked_cv_slug: body.linked_cv_slug || null,
          created_at: body.created_at
            ? new Date(body.created_at).toISOString()
            : new Date().toISOString(),
          timeline: [
            {
              event: "Application Created",
              date: new Date().toISOString(),
              auto: true,
            },
          ],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert application error:", error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in POST /api/applications:", error);
    return NextResponse.json({ error: error.message || "Failed to create application" }, { status: 500 });
  }
}
