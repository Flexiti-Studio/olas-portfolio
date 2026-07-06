import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { data: history, error } = await supabase
      .from('TaskApplication')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

