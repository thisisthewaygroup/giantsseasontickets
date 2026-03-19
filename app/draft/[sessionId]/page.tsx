import { getSupabaseServer } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import type { DraftSession, Member, Game, Pick } from '@/lib/types';
import DraftRoom from './DraftRoom';

export const dynamic = 'force-dynamic';

export default async function DraftPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = getSupabaseServer();

  const [sessionRes, membersRes, gamesRes, picksRes] = await Promise.all([
    supabase.from('draft_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('members').select('*').order('created_at'),
    supabase.from('games').select('*').order('date'),
    supabase.from('picks').select('*').eq('draft_session_id', sessionId).order('pick_number_overall'),
  ]);

  if (sessionRes.error || !sessionRes.data) return notFound();

  return (
    <DraftRoom
      sessionId={sessionId}
      initialSession={sessionRes.data as DraftSession}
      initialMembers={(membersRes.data ?? []) as Member[]}
      initialGames={(gamesRes.data ?? []) as Game[]}
      initialPicks={(picksRes.data ?? []) as Pick[]}
    />
  );
}
