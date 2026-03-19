'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { getCurrentDrafter } from '@/lib/draft';
import type { DraftSession, Member, Game, Pick } from '@/lib/types';
import CalendarGrid from '@/components/CalendarGrid';
import DraftOrderPanel from '@/components/DraftOrderPanel';
import MemberBadge from '@/components/MemberBadge';

interface DraftRoomProps {
  sessionId: string;
  initialSession: DraftSession;
  initialMembers: Member[];
  initialGames: Game[];
  initialPicks: Pick[];
}

// Month range for the season (April=4 through October=10)
const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10];

export default function DraftRoom({
  sessionId, initialSession, initialMembers, initialGames, initialPicks,
}: DraftRoomProps) {
  const [session, setSession] = useState<DraftSession>(initialSession);
  const [members] = useState<Member[]>(initialMembers);
  const [games] = useState<Game[]>(initialGames);
  const [picks, setPicks] = useState<Pick[]>(initialPicks);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [pickingGameId, setPickingGameId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    // Default to the month of the first unpicked game
    const firstGame = initialGames[0];
    if (firstGame) return new Date(firstGame.date + 'T12:00:00').getMonth() + 1;
    return new Date().getMonth() + 1;
  });

  const supabase = getSupabaseBrowser();

  // Persist identity in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`draft_member_${sessionId}`);
    if (stored) setMyMemberId(stored);
  }, [sessionId]);

  function joinAs(memberId: string) {
    setMyMemberId(memberId);
    localStorage.setItem(`draft_member_${sessionId}`, memberId);
  }

  function showNotification(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`draft:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'draft_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new as DraftSession);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'picks',
        filter: `draft_session_id=eq.${sessionId}`,
      }, (payload) => {
        const newPick = payload.new as Pick;
        setPicks((prev) => {
          if (prev.find((p) => p.id === newPick.id)) return prev;
          return [...prev, newPick];
        });
        // Show notification for other people's picks
        if (newPick.member_id !== myMemberId) {
          const member = members.find((m) => m.id === newPick.member_id);
          const game = games.find((g) => g.id === newPick.game_id);
          if (member && game) {
            showNotification(`${member.name} picked ${game.opponent} (${game.date})`);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, myMemberId, members, games, supabase]);

  const handlePickGame = useCallback(async (gameId: string) => {
    if (!myMemberId || pickingGameId) return;
    setPickingGameId(gameId);

    const res = await fetch(`/api/sessions/${sessionId}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, member_id: myMemberId }),
    });

    setPickingGameId(null);

    if (!res.ok) {
      const err = await res.json();
      showNotification(`Error: ${err.error}`);
    } else {
      const game = games.find((g) => g.id === gameId);
      if (game) showNotification(`You picked ${game.opponent} on ${game.date}!`);
    }
  }, [myMemberId, pickingGameId, sessionId, games]);

  const currentDrafterId = session.draft_order.length > 0
    ? getCurrentDrafter(session.draft_order, session.current_round, session.current_pick_in_round)
    : null;

  const isMyTurn = myMemberId !== null && currentDrafterId === myMemberId && session.status === 'active';

  const year = session.year;

  // Filter months that have games
  const monthsWithGames = SEASON_MONTHS.filter((m) =>
    games.some((g) => {
      const d = new Date(g.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === m;
    })
  );

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  return (
    <div className="min-h-screen bg-giants-black text-white">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-white text-sm">←</a>
            <h1 className="font-bold text-white">
              {session.year} Giants Draft
              {session.status === 'completed' && <span className="ml-2 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Complete</span>}
              {session.status === 'active' && <span className="ml-2 text-xs bg-giants-orange/20 text-giants-orange px-2 py-0.5 rounded-full">Live</span>}
            </h1>
          </div>

          {/* Identity selector */}
          <div className="flex items-center gap-3">
            {myMemberId && memberMap[myMemberId] ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">You are</span>
                <MemberBadge name={memberMap[myMemberId].name} color={memberMap[myMemberId].color} />
                <button
                  onClick={() => { setMyMemberId(null); localStorage.removeItem(`draft_member_${sessionId}`); }}
                  className="text-xs text-gray-600 hover:text-gray-400"
                >
                  change
                </button>
              </div>
            ) : (
              <select
                onChange={(e) => e.target.value && joinAs(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-giants-orange"
                defaultValue=""
              >
                <option value="" disabled>Join as…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <a href="/results" className="text-sm text-gray-400 hover:text-white">Results</a>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm shadow-xl animate-slide-in">
          {notification}
        </div>
      )}

      {/* Your turn banner */}
      {isMyTurn && (
        <div className="bg-giants-orange text-white text-center py-2 text-sm font-bold animate-pulse">
          It&apos;s your turn! Click a game on the calendar to pick it.
        </div>
      )}

      {/* Draft complete */}
      {session.status === 'completed' && (
        <div className="bg-green-900/30 border-b border-green-800 text-center py-3 text-sm text-green-300">
          🎉 Draft complete! All games have been picked. <a href="/results" className="underline font-semibold">View results →</a>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Main: Calendar */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Month tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {monthsWithGames.map((m) => {
              const label = new Date(year, m - 1).toLocaleString('default', { month: 'short' });
              const hasGamesLeft = games.some((g) => {
                const d = new Date(g.date + 'T12:00:00');
                return d.getFullYear() === year && d.getMonth() + 1 === m && !picks.find((p) => p.game_id === g.id);
              });
              return (
                <button
                  key={m}
                  onClick={() => setActiveMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative
                    ${activeMonth === m
                      ? 'bg-giants-orange text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                  {label}
                  {hasGamesLeft && session.status === 'active' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-giants-orange border border-giants-black" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar for active month */}
          <CalendarGrid
            year={year}
            month={activeMonth}
            games={games}
            picks={picks}
            members={members}
            onPickGame={handlePickGame}
            canPick={isMyTurn}
            currentDrafterId={currentDrafterId ?? undefined}
            myMemberId={myMemberId ?? undefined}
          />
        </div>

        {/* Sidebar: Draft order */}
        <div className="w-72 flex-shrink-0">
          <DraftOrderPanel
            session={session}
            members={members}
            myMemberId={myMemberId ?? undefined}
            totalPicks={picks.length}
            totalGames={games.length}
          />
        </div>
      </div>
    </div>
  );
}
