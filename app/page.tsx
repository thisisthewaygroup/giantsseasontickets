import { getSupabaseServer } from '@/lib/supabase';
import type { DraftSession } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = getSupabaseServer();
  const { data: sessions } = await supabase
    .from('draft_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  const activeSession = (sessions as DraftSession[] | null)?.find((s) => s.status === 'active');
  const recentSessions = (sessions as DraftSession[] | null) ?? [];

  return (
    <div className="min-h-screen bg-giants-black text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-giants-orange flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-4xl font-black text-white">SF</span>
        </div>

        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
          Giants Ticket Draft
        </h1>
        <p className="text-giants-cream text-lg mb-10 max-w-md">
          Your group&apos;s home for the annual season ticket pick draft. Pick your games, see the calendar, track your schedule.
        </p>

        {/* Active draft */}
        {activeSession && (
          <Link
            href={`/draft/${activeSession.id}`}
            className="bg-giants-orange text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-orange-600 transition-all hover:scale-105 mb-6 block"
          >
            Join Live Draft — {activeSession.year} →
          </Link>
        )}

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
          <Link
            href="/admin"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <h2 className="font-bold text-lg mb-1">Admin Setup</h2>
            <p className="text-gray-400 text-sm">Add members, upload schedule, start the draft.</p>
          </Link>

          <Link
            href="/calendar"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl mb-2">📅</div>
            <h2 className="font-bold text-lg mb-1">Calendar</h2>
            <p className="text-gray-400 text-sm">See all home games by month, color-coded by member.</p>
          </Link>

          <Link
            href="/results"
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl p-6 text-left transition-all hover:-translate-y-0.5"
          >
            <div className="text-2xl mb-2">📊</div>
            <h2 className="font-bold text-lg mb-1">Results</h2>
            <p className="text-gray-400 text-sm">Full game list sorted by date or member. Export to CSV.</p>
          </Link>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="mt-10 w-full max-w-2xl">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Draft Sessions</p>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/draft/${s.id}`}
                  className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{s.year} Draft</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'active' ? 'bg-giants-orange/20 text-giants-orange' :
                      s.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <span className="text-gray-600 text-sm">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-gray-700 text-xs py-4">
        SF Giants Season Ticket Draft Platform
      </footer>
    </div>
  );
}
