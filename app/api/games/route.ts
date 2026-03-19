import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const body = await req.json();
  const { games } = body as { games: Array<{ date: string; time?: string; opponent: string; game_number?: number; notes?: string; price_per_ticket?: number }> };

  if (!games || !Array.isArray(games) || games.length === 0) {
    return NextResponse.json({ error: 'games array required' }, { status: 400 });
  }

  // Validate required fields
  for (const g of games) {
    if (!g.date || !g.opponent) {
      return NextResponse.json({ error: 'Each game requires date and opponent' }, { status: 400 });
    }
  }

  // Clear existing games and insert new ones (full replace on upload)
  await supabase.from('picks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data, error } = await supabase
    .from('games')
    .insert(games)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, games: data }, { status: 201 });
}
