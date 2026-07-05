import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CONFIG_NAME = 'CONFIG_JOB_WEBSITES';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('name', CONFIG_NAME)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine for first load
      throw error;
    }
    
    // Return the stored sections (which we use to store the array of websites)
    const websites = data?.sections || [];
    return NextResponse.json(websites);
  } catch (error: any) {
    console.error("GET /api/job-websites ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const websites = await req.json();

    // Check if config exists
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('name', CONFIG_NAME)
      .single();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('templates')
        .update({ sections: websites })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert
      const { error } = await supabase
        .from('templates')
        .insert([{
          name: CONFIG_NAME,
          raw_text: "System Configuration for Job Websites. Do not delete.",
          pdf_url: "",
          is_default: true,
          sections: websites
        }]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/job-websites ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
