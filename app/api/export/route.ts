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
      games (date, time, opponent, game_number, notes, price_per_ticket),
      members (name, color)
    `)
    .eq('draft_session_id', sessionId)
    .order('pick_number_overall');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type GameRow = { date: string; time?: string; opponent: string; game_number?: number; notes?: string; price_per_ticket?: number };
  type MemberRow = { name: string };

  // Sort picks chronologically by game date
  const sorted = [...(picks ?? [])].sort((a, b) => {
    const ga = (Array.isArray(a.games) ? a.games[0] : a.games) as GameRow | null;
    const gb = (Array.isArray(b.games) ? b.games[0] : b.games) as GameRow | null;
    return (ga?.date ?? '').localeCompare(gb?.date ?? '');
  });

  // Accumulate each member's total cost (price_per_ticket * 2)
  const memberTotals: Record<string, number> = {};
  for (const pick of sorted) {
    const game = (Array.isArray(pick.games) ? pick.games[0] : pick.games) as GameRow | null;
    const member = (Array.isArray(pick.members) ? pick.members[0] : pick.members) as MemberRow | null;
    if (!member?.name) continue;
    const cost = (game?.price_per_ticket ?? 0) * 2;
    memberTotals[member.name] = (memberTotals[member.name] ?? 0) + cost;
  }

  // Main picks section
  const rows: string[][] = [
    ['Date', 'Time', 'Opponent', 'Game #', 'Picked By', 'Ticket Cost (2 seats)', 'Notes'],
  ];

  for (const pick of sorted) {
    const game = (Array.isArray(pick.games) ? pick.games[0] : pick.games) as GameRow | null;
    const member = (Array.isArray(pick.members) ? pick.members[0] : pick.members) as MemberRow | null;
    const cost = (game?.price_per_ticket ?? 0) * 2;
    rows.push([
      game?.date ?? '',
      game?.time ?? '',
      game?.opponent ?? '',
      String(game?.game_number ?? ''),
      member?.name ?? '',
      cost > 0 ? `$${cost.toFixed(2)}` : '',
      game?.notes ?? '',
    ]);
  }

  // Blank separator then totals section
  rows.push([]);
  rows.push(['Member Totals', '', '', '', '', '', '']);
  rows.push(['Member', 'Total Cost (2 seats per game)', '', '', '', '', '']);
  for (const [name, total] of Object.entries(memberTotals).sort((a, b) => a[0].localeCompare(b[0]))) {
    rows.push([name, `$${total.toFixed(2)}`, '', '', '', '', '']);
  }

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="draft-results.csv"',
    },
  });
}
