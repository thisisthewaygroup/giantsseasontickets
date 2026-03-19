import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { getCurrentDrafter, advancePickState, getOverallPickNumber } from '@/lib/draft';
import type { DraftSession } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();
  const body = await req.json();
  const { game_id, member_id } = body;

  if (!game_id || !member_id) {
    return NextResponse.json({ error: 'game_id and member_id required' }, { status: 400 });
  }

  // Fetch current session state
  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const s = session as DraftSession;

  if (s.status !== 'active') {
    return NextResponse.json({ error: 'Draft is not active' }, { status: 400 });
  }

  // Verify it's this member's turn
  const currentDrafter = getCurrentDrafter(s.draft_order, s.current_round, s.current_pick_in_round);
  if (currentDrafter !== member_id) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
  }

  // Verify game hasn't been picked
  const { data: existingPick } = await supabase
    .from('picks')
    .select('id')
    .eq('draft_session_id', id)
    .eq('game_id', game_id)
    .single();

  if (existingPick) {
    return NextResponse.json({ error: 'Game already picked' }, { status: 409 });
  }

  // Get total games count
  const { count: totalGames } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  const overallPick = getOverallPickNumber(
    s.current_round,
    s.current_pick_in_round,
    s.draft_order.length
  );

  const next = advancePickState(s.current_round, s.current_pick_in_round, s.draft_order.length);

  // Atomically insert pick + advance session
  const { error: rpcError } = await supabase.rpc('make_pick', {
    p_session_id: id,
    p_game_id: game_id,
    p_member_id: member_id,
    p_round: s.current_round,
    p_pick_overall: overallPick,
    p_next_round: next.round,
    p_next_pick_in_round: next.pickInRound,
    p_total_games: totalGames ?? 0,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  return NextResponse.json({ success: true, pick: overallPick });
}
