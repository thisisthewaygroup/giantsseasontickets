import { getSupabaseServer } from '@/lib/supabase';
import ResultsClient from './ResultsClient';
import type { Game, Member, Pick, DraftSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const supabase = getSupabaseServer();

  const [gamesRes, membersRes, sessionsRes] = await Promise.all([
    supabase.from('games').select('*').order('date'),
    supabase.from('members').select('*').order('created_at'),
    supabase.from('draft_sessions').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const sessions = (sessionsRes.data ?? []) as DraftSession[];
  const latestSession = sessions[0] ?? null;
  let picks: Pick[] = [];

  if (latestSession) {
    const picksRes = await supabase
      .from('picks')
      .select('*')
      .eq('draft_session_id', latestSession.id)
      .order('pick_number_overall');
    picks = (picksRes.data ?? []) as Pick[];
  }

  return (
    <ResultsClient
      games={(gamesRes.data ?? []) as Game[]}
      members={(membersRes.data ?? []) as Member[]}
      picks={picks}
      sessions={sessions}
      activeSessionId={latestSession?.id ?? null}
    />
  );
}
