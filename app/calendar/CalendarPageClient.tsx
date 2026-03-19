'use client';

import { useState } from 'react';
import type { Game, Member, Pick } from '@/lib/types';
import CalendarGrid from '@/components/CalendarGrid';
import MemberBadge from '@/components/MemberBadge';

const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10];

interface CalendarPageClientProps {
  games: Game[];
  members: Member[];
  picks: Pick[];
  year: number;
}

export default function CalendarPageClient({ games, members, picks, year }: CalendarPageClientProps) {
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    const g = games[0];
    if (g) return new Date(g.date + 'T12:00:00').getMonth() + 1;
    return new Date().getMonth() + 1;
  });

  const filteredPicks = filterMemberId
    ? picks.filter((p) => p.member_id === filterMemberId)
    : picks;

  const monthsWithGames = SEASON_MONTHS.filter((m) =>
    games.some((g) => {
      const d = new Date(g.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === m;
    })
  );

  const pickedCount = picks.length;
  const totalGames = games.length;

  return (
    <div className="min-h-screen bg-giants-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-giants-orange">{year} Schedule</h1>
            <p className="text-gray-400 text-sm mt-1">
              {pickedCount}/{totalGames} games picked
            </p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Home</a>
        </div>

        {/* Member filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterMemberId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${!filterMemberId ? 'bg-white text-giants-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            All
          </button>
          {members.map((m) => {
            const count = picks.filter((p) => p.member_id === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filterMemberId === m.id ? 'ring-2 ring-white/50' : 'hover:opacity-90'}`}
                style={{
                  backgroundColor: m.color + '33',
                  borderColor: m.color,
                  border: `1px solid ${m.color}`,
                }}
              >
                <MemberBadge name={m.name} color={m.color} size="sm" />
                <span className="text-gray-400 text-xs">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Month tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {monthsWithGames.map((m) => {
            const label = new Date(year, m - 1).toLocaleString('default', { month: 'short' });
            return (
              <button
                key={m}
                onClick={() => setActiveMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${activeMonth === m ? 'bg-giants-orange text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Calendar */}
        <CalendarGrid
          year={year}
          month={activeMonth}
          games={games}
          picks={filteredPicks}
          members={members}
        />
      </div>
    </div>
  );
}
