import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    let { data: dailyCounter, error } = await supabase
      .from('task_session_counters')
      .select('*')
      .eq('date', today)
      .single();

    if (!dailyCounter && error?.code === 'PGRST116') {
      // PGRST116 means no rows found, which is fine, we return a default object
      dailyCounter = {
        id: "",
        date: today,
        sessionCount: 1,
        linkCount: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
    } else if (error && error.code !== 'PGRST116') {
      throw error;
    }

    let sessionTarget = 20;
    const { data: setting } = await supabase
      .from('task_payment_settings')
      .select('session_target')
      .eq('id', 'default')
      .single();
    if (setting && setting.session_target) sessionTarget = setting.session_target;

    return NextResponse.json({ success: true, data: dailyCounter, sessionTarget });
  } catch (error: any) {
    console.error("Counter fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

