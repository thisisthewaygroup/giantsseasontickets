'use client';

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';
import type { Game, Member, Pick } from '@/lib/types';
import MemberBadge from './MemberBadge';

interface CalendarGridProps {
  year: number;
  month: number; // 1-indexed
  games: Game[];
  picks: Pick[];
  members: Member[];
  // If provided, clicking an available game calls this (draft mode)
  onPickGame?: (gameId: string) => void;
  canPick?: boolean;
  currentDrafterId?: string;
  myMemberId?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({
  year, month, games, picks, members, onPickGame, canPick, currentDrafterId, myMemberId,
}: CalendarGridProps) {
  const memberMap = useMemo(() => {
    const m: Record<string, Member> = {};
    for (const mem of members) m[mem.id] = mem;
    return m;
  }, [members]);

  const pickMap = useMemo(() => {
    const m: Record<string, Pick> = {};
    for (const p of picks) m[p.game_id] = p;
    return m;
  }, [picks]);

  // Games in this month
  const gamesThisMonth = useMemo(() => {
    return games.filter((g) => {
      const d = new Date(g.date + 'T12:00:00');
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [games, year, month]);

  // Map date string -> games[]
  const gamesByDate = useMemo(() => {
    const m: Record<string, Game[]> = {};
    for (const g of gamesThisMonth) {
      if (!m[g.date]) m[g.date] = [];
      m[g.date].push(g);
    }
    return m;
  }, [gamesThisMonth]);

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const monthLabel = format(monthStart, 'MMMM yyyy');

  const isMyTurn = canPick && myMemberId && currentDrafterId === myMemberId;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Month header */}
      <div className="bg-giants-black px-4 py-3 border-b border-gray-800">
        <h3 className="text-lg font-bold text-white">{monthLabel}</h3>
        <p className="text-xs text-gray-500">{gamesThisMonth.length} home game{gamesThisMonth.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-800/50">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-800">
        {/* Leading empty cells */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="border-r border-b border-gray-800 bg-gray-950/30 min-h-[80px]" />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayGames = gamesByDate[dateStr] ?? [];
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={dateStr}
              className={`border-r border-b border-gray-800 min-h-[80px] p-1.5
                ${!isCurrentMonth ? 'bg-gray-950/40' : 'bg-gray-900'}
                ${dayGames.length > 0 ? 'bg-gray-800/40' : ''}`}
            >
              <div className="text-xs text-gray-500 font-medium mb-1 text-right pr-0.5">
                {format(day, 'd')}
              </div>

              {dayGames.map((game) => {
                const pick = pickMap[game.id];
                const pickedBy = pick ? memberMap[pick.member_id] : null;
                const isAvailable = !pick;
                const isClickable = isAvailable && isMyTurn && onPickGame;

                return (
                  <button
                    key={game.id}
                    onClick={() => isClickable && onPickGame(game.id)}
                    disabled={!isClickable}
                    className={`w-full text-left rounded px-1.5 py-1 mb-0.5 text-[10px] leading-tight transition-all
                      ${pickedBy
                        ? 'opacity-80'
                        : isClickable
                          ? 'bg-giants-orange/20 border border-giants-orange/60 hover:bg-giants-orange/40 hover:scale-105 cursor-pointer animate-pulse-subtle'
                          : 'bg-gray-700/50 cursor-default'
                      }`}
                    style={pickedBy ? { backgroundColor: pickedBy.color + '33', borderLeft: `3px solid ${pickedBy.color}` } : {}}
                    title={`${game.opponent}${game.time ? ` at ${game.time}` : ''}${pickedBy ? ` — picked by ${pickedBy.name}` : isClickable ? ' — click to pick!' : ''}`}
                  >
                    <div className="font-semibold truncate text-white">{abbreviateOpponent(game.opponent)}</div>
                    {game.time && <div className="text-gray-400">{game.time}</div>}
                    {pickedBy && (
                      <div className="mt-0.5">
                        <MemberBadge name={pickedBy.name} color={pickedBy.color} size="sm" />
                      </div>
                    )}
                    {isAvailable && isMyTurn && (
                      <div className="text-giants-orange font-bold mt-0.5">Pick!</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function abbreviateOpponent(opponent: string): string {
  // Remove "San Francisco" or common prefixes, return last word(s) for brevity
  const short = opponent
    .replace(/^San Francisco\s+/i, '')
    .replace(/^Los Angeles\s+/i, 'LA ')
    .replace(/^New York\s+/i, 'NY ')
    .replace(/^San Diego\s+/i, 'SD ')
    .replace(/^St\. Louis\s+/i, 'STL ')
    .replace(/^Kansas City\s+/i, 'KC ')
    .replace(/^Tampa Bay\s+/i, 'TB ')
    .replace(/^Colorado\s+/i, 'COL ')
    .replace(/^Oakland\s+/i, 'OAK ')
    .replace(/^Arizona\s+/i, 'ARI ')
    .replace(/^Atlanta\s+/i, 'ATL ')
    .replace(/^Chicago\s+/i, 'CHI ')
    .replace(/^Cincinnati\s+/i, 'CIN ')
    .replace(/^Cleveland\s+/i, 'CLE ')
    .replace(/^Detroit\s+/i, 'DET ')
    .replace(/^Houston\s+/i, 'HOU ')
    .replace(/^Miami\s+/i, 'MIA ')
    .replace(/^Milwaukee\s+/i, 'MIL ')
    .replace(/^Minnesota\s+/i, 'MIN ')
    .replace(/^Philadelphia\s+/i, 'PHI ')
    .replace(/^Pittsburgh\s+/i, 'PIT ')
    .replace(/^Seattle\s+/i, 'SEA ')
    .replace(/^Texas\s+/i, 'TEX ')
    .replace(/^Toronto\s+/i, 'TOR ')
    .replace(/^Washington\s+/i, 'WSH ')
    .replace(/^Baltimore\s+/i, 'BAL ')
    .replace(/^Boston\s+/i, 'BOS ')
    .replace(/^Cincinnati\s+/i, 'CIN ');
  return short.length > 12 ? short.slice(0, 11) + '…' : short;
}
