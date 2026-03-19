import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  const { data: picks, error } = await supabase
    .from('picks')
    .select(`
      round,
      pick_number_overall,
      picked_at,
      games (date, time, opponent, game_number, notes),
      members (name, color)
    `)
    .eq('draft_session_id', sessionId)
    .order('pick_number_overall');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const rows = [
    ['Pick #', 'Round', 'Member', 'Date', 'Time', 'Opponent', 'Game #', 'Notes', 'Picked At'],
  ];

  for (const pick of picks ?? []) {
    const game = (Array.isArray(pick.games) ? pick.games[0] : pick.games) as { date: string; time?: string; opponent: string; game_number?: number; notes?: string } | null;
    const member = (Array.isArray(pick.members) ? pick.members[0] : pick.members) as { name: string } | null;
    rows.push([
      String(pick.pick_number_overall),
      String(pick.round),
      member?.name ?? '',
      game?.date ?? '',
      game?.time ?? '',
      game?.opponent ?? '',
      String(game?.game_number ?? ''),
      game?.notes ?? '',
      pick.picked_at ? new Date(pick.picked_at).toLocaleString() : '',
    ]);
  }

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="draft-results.csv"',
    },
  });
}
