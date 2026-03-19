import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { randomizeDraftOrder } from '@/lib/draft';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  // Fetch all members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id')
    .order('created_at');

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });
  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No members found. Add members first.' }, { status: 400 });
  }

  // Check games exist
  const { count: gameCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  if (!gameCount || gameCount === 0) {
    return NextResponse.json({ error: 'No games found. Upload schedule first.' }, { status: 400 });
  }

  const memberIds = members.map((m) => m.id);
  const draftOrder = randomizeDraftOrder(memberIds);

  const { data, error } = await supabase
    .from('draft_sessions')
    .update({
      status: 'active',
      draft_order: draftOrder,
      current_round: 1,
      current_pick_in_round: 0,
      started_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
