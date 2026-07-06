import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    let query = supabase
      .from('Application')
      .select('*')
      .order('created_at', { ascending: false });

    if (stage) {
      query = query.eq('stage', stage);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
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
    
    const { data, error } = await supabase
      .from('Application')
      .insert([{
        job_title: body.jobTitle,
        company: body.company,
        stage: body.stage || 'Wishlist',
        source: body.source,
        job_description: body.job_description || null,
        cover_letter_url: body.cover_letter_url || null,
        linked_cv_id: body.linked_cv_id || null,
        linked_cv_slug: body.linked_cv_slug || null,
        created_at: body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString(),
        timeline: [{ event: 'Application Created', date: new Date().toISOString(), auto: true }]
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

