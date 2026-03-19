'use client';

import { useState } from 'react';
import type { Game, Member, Pick, DraftSession } from '@/lib/types';
import MemberBadge from '@/components/MemberBadge';

interface ResultsClientProps {
  games: Game[];
  members: Member[];
  picks: Pick[];
  sessions: DraftSession[];
  activeSessionId: string | null;
}

export default function ResultsClient({ games, members, picks, sessions, activeSessionId }: ResultsClientProps) {
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'pick_order' | 'member'>('date');

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const gameMap = Object.fromEntries(games.map((g) => [g.id, g]));
  const pickMap = Object.fromEntries(picks.map((p) => [p.game_id, p]));

  // Join picks with game + member data
  const rows = games.map((g) => ({
    game: g,
    pick: pickMap[g.id] ?? null,
    member: pickMap[g.id] ? (memberMap[pickMap[g.id].member_id] ?? null) : null,
  }));

  const filtered = filterMemberId
    ? rows.filter((r) => r.pick?.member_id === filterMemberId)
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') return a.game.date.localeCompare(b.game.date);
    if (sortBy === 'pick_order') return (a.pick?.pick_number_overall ?? 999) - (b.pick?.pick_number_overall ?? 999);
    if (sortBy === 'member') return (a.member?.name ?? 'zzz').localeCompare(b.member?.name ?? 'zzz');
    return 0;
  });

  const pickedCount = picks.length;
  const totalGames = games.length;

  return (
    <div className="min-h-screen bg-giants-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-giants-orange">Draft Results</h1>
            <p className="text-gray-400 text-sm mt-1">
              {pickedCount}/{totalGames} games assigned
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeSessionId && (
              <a
                href={`/api/export?session_id=${activeSessionId}`}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Export CSV ↓
              </a>
            )}
            <a href="/" className="text-gray-400 hover:text-white text-sm">← Home</a>
          </div>
        </div>

        {/* Summary cards per member */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {members.map((m) => {
            const count = picks.filter((p) => p.member_id === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                className={`bg-gray-900 rounded-xl p-4 text-left transition-all hover:ring-1
                  ${filterMemberId === m.id ? 'ring-2' : ''}`}
                style={{ '--tw-ring-color': m.color } as React.CSSProperties}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                  style={{ backgroundColor: m.color }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <p className="font-semibold text-sm truncate">{m.name}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: m.color }}>{count}</p>
                <p className="text-xs text-gray-500">games</p>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMemberId(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${!filterMemberId ? 'bg-white text-giants-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              All members
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filterMemberId === m.id ? 'ring-2 ring-white/30' : 'hover:opacity-90'}`}
                style={{ backgroundColor: m.color + '33', border: `1px solid ${m.color}` }}
              >
                <MemberBadge name={m.name} color={m.color} size="sm" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sort:</span>
            {(['date', 'pick_order', 'member'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded text-sm transition-colors
                  ${sortBy === s ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {s === 'date' ? 'Date' : s === 'pick_order' ? 'Pick #' : 'Member'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Opponent</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Picked By</th>
                <th className="text-left px-4 py-3">Pick #</th>
                <th className="text-left px-4 py-3">Round</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ game, pick, member }) => (
                <tr
                  key={game.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  style={member ? { borderLeft: `3px solid ${member.color}` } : {}}
                >
                  <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">{game.date}</td>
                  <td className="px-4 py-3 font-medium">
                    {game.opponent}
                    {game.notes && <span className="ml-2 text-xs text-gray-500">{game.notes}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{game.time ?? '—'}</td>
                  <td className="px-4 py-3">
                    {member ? (
                      <MemberBadge name={member.name} color={member.color} />
                    ) : (
                      <span className="text-gray-600 italic">Unpicked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{pick?.pick_number_overall ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{pick?.round ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              No games yet. Upload a schedule and start the draft.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
