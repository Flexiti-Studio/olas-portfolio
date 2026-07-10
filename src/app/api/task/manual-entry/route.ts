import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { date, totalLinks } = await req.json();

    if (!date || totalLinks === undefined) {
      return NextResponse.json({ error: "Missing date or totalLinks" }, { status: 400 });
    }

    let sessionTarget = 20;
    const { data: setting } = await supabase
      .from('task_payment_settings')
      .select('session_target')
      .eq('id', 'default')
      .single();
      
    if (setting && setting.session_target) {
      sessionTarget = setting.session_target;
    }

    let linkCount = totalLinks;
    let sessionCount = Math.floor((totalLinks > 0 ? totalLinks - 1 : 0) / sessionTarget) + 1;

    const { data: existing } = await supabase
      .from('task_session_counters')
      .select('id')
      .eq('date', date)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('task_session_counters')
        .update({ sessionCount, linkCount, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('task_session_counters')
        .insert([{ date, sessionCount, linkCount }]);
        
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manual entry error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
