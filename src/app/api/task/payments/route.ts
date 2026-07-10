import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Get cost per link, global target, and session target
    let { data: setting, error: settingError } = await supabase
      .from('task_payment_settings')
      .select('cost_per_link, weekly_target, session_target')
      .eq('id', 'default')
      .single();

    let costPerLink = 50; // Default
    let weeklyTarget = 10000; // Default
    let sessionTarget = 20; // Default
    if (settingError && settingError.code === 'PGRST116') {
      // Not found, create default
      const { data: newSetting } = await supabase
        .from('task_payment_settings')
        .insert([{ id: 'default', cost_per_link: 50, weekly_target: 10000, session_target: 20 }])
        .select()
        .single();
      if (newSetting) {
        costPerLink = newSetting.cost_per_link;
        weeklyTarget = newSetting.weekly_target;
        sessionTarget = newSetting.session_target;
      }
    } else if (setting) {
      costPerLink = setting.cost_per_link;
      weeklyTarget = setting.weekly_target || 10000;
      sessionTarget = setting.session_target || 20;
    }

    // Get all counters
    const { data: counters, error: countersError } = await supabase
      .from('task_session_counters')
      .select('*')
      .order('date', { ascending: false });

    if (countersError) throw countersError;

    const dailyStats = (counters || []).map(counter => {
      let totalLinks = 0;
      if (counter.sessionCount > 1 && counter.linkCount > 20) {
        // New logic
        totalLinks = counter.linkCount;
      } else if (counter.sessionCount > 1) {
        // Old logic
        totalLinks = (counter.sessionCount - 1) * 20 + counter.linkCount;
      } else {
        totalLinks = counter.linkCount;
      }

      return {
        date: counter.date,
        totalLinks,
        earnings: totalLinks * costPerLink
      };
    });

    // Get all weekly targets
    const { data: targetsData } = await supabase
      .from('task_weekly_targets')
      .select('*');
    
    const weeklyTargetsMap = new Map();
    if (targetsData) {
      targetsData.forEach(t => weeklyTargetsMap.set(t.week_start, t.target));
    }

    // Group by week (Tuesday to Monday)
    const weeklyMap = new Map<string, { weekStart: string; weekEnd: string; totalLinks: number; earnings: number; days: any[]; target: number }>();

    dailyStats.forEach(stat => {
      const d = new Date(stat.date);
      // Get Tuesday of that week
      const day = d.getDay();
      const daysSinceTuesday = (day + 5) % 7;
      const tuesday = new Date(d.setDate(d.getDate() - daysSinceTuesday));
      const monday = new Date(tuesday);
      monday.setDate(tuesday.getDate() + 6);

      const weekStartStr = tuesday.toISOString().split('T')[0];
      const weekEndStr = monday.toISOString().split('T')[0];
      const weekKey = `${weekStartStr} to ${weekEndStr}`;

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          totalLinks: 0,
          earnings: 0,
          days: [],
          target: weeklyTargetsMap.get(weekStartStr) || weeklyTarget
        });
      }

      const weekData = weeklyMap.get(weekKey)!;
      weekData.totalLinks += stat.totalLinks;
      weekData.earnings += stat.earnings;
      weekData.days.push(stat);
    });

    const weeklyStats = Array.from(weeklyMap.values());
    
    // Sort weekly stats descending
    weeklyStats.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());

    return NextResponse.json({ success: true, costPerLink, weeklyTarget, sessionTarget, dailyStats, weeklyStats });
  } catch (error: any) {
    console.error("Payment fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { costPerLink, weeklyTarget, sessionTarget, weekStart, specificTarget } = await req.json();

    if (weekStart && specificTarget !== undefined) {
      // Update specific week target
      const { error: specificError } = await supabase
        .from('task_weekly_targets')
        .upsert(
          { week_start: weekStart, target: specificTarget, updated_at: new Date().toISOString() },
          { onConflict: 'week_start' }
        );
      
      if (specificError) throw specificError;
      return NextResponse.json({ success: true });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (costPerLink !== undefined) updateData.cost_per_link = costPerLink;
    if (weeklyTarget !== undefined) updateData.weekly_target = weeklyTarget;
    if (sessionTarget !== undefined) updateData.session_target = sessionTarget;

    const { data, error } = await supabase
      .from('task_payment_settings')
      .upsert({ id: 'default', ...updateData })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      costPerLink: data.cost_per_link, 
      weeklyTarget: data.weekly_target,
      sessionTarget: data.session_target
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
