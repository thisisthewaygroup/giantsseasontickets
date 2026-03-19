import { getSupabaseServer } from '@/lib/supabase';
import type { Game, Member, Pick } from '@/lib/types';
import CalendarPageClient from './CalendarPageClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = getSupabaseServer();

  const [gamesRes, membersRes, sessionRes] = await Promise.all([
    supabase.from('games').select('*').order('date'),
    supabase.from('members').select('*').order('created_at'),
    supabase.from('draft_sessions').select('*').order('created_at', { ascending: false }).limit(1),
  ]);

  const session = sessionRes.data?.[0] ?? null;
  let picks: Pick[] = [];

  if (session) {
    const picksRes = await supabase
      .from('picks')
      .select('*')
      .eq('draft_session_id', session.id);
    picks = (picksRes.data ?? []) as Pick[];
  }

  return (
    <CalendarPageClient
      games={(gamesRes.data ?? []) as Game[]}
      members={(membersRes.data ?? []) as Member[]}
      picks={picks}
      year={session?.year ?? new Date().getFullYear()}
    />
  );
}
