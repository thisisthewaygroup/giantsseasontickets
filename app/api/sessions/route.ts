import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('draft_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const body = await req.json();
  const { year } = body;

  if (!year) {
    return NextResponse.json({ error: 'year is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('draft_sessions')
    .insert({ year, status: 'setup', draft_order: [], current_round: 1, current_pick_in_round: 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
