'use client';

import type { Member, DraftSession } from '@/lib/types';
import { getPicksForRound, getSkippedMember, getCurrentDrafter } from '@/lib/draft';
import MemberBadge from './MemberBadge';

interface DraftOrderPanelProps {
  session: DraftSession;
  members: Member[];
  myMemberId?: string;
  totalPicks: number;
  totalGames: number;
}

export default function DraftOrderPanel({ session, members, myMemberId, totalPicks, totalGames }: DraftOrderPanelProps) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const draftOrder = session.draft_order;

  const currentDrafterId = draftOrder.length > 0
    ? getCurrentDrafter(draftOrder, session.current_round, session.current_pick_in_round)
    : null;

  const skippedId = getSkippedMember(draftOrder, session.current_round);
  const picksThisRound = getPicksForRound(draftOrder, session.current_round);

  const picksRemaining = totalGames - totalPicks;
  const progressPct = totalGames > 0 ? Math.round((totalPicks / totalGames) * 100) : 0;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Progress */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Round {session.current_round}</span>
          <span className="text-gray-400">{totalPicks}/{totalGames} picked</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-giants-orange h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{picksRemaining} games remaining</p>
      </div>

      {/* Current picker */}
      {session.status === 'active' && currentDrafterId && memberMap[currentDrafterId] && (
        <div
          className="p-4 border-b border-gray-800"
          style={{ backgroundColor: memberMap[currentDrafterId].color + '22' }}
        >
          <p className="text-xs text-gray-400 mb-1">Now picking…</p>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: memberMap[currentDrafterId].color }}
            >
              {memberMap[currentDrafterId].name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white">{memberMap[currentDrafterId].name}</p>
              {currentDrafterId === myMemberId && (
                <p className="text-xs text-giants-orange font-semibold">Your pick! Choose a game on the calendar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* This round's order */}
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Round {session.current_round} Order
        </p>
        <div className="space-y-1.5">
          {picksThisRound.map((memberId, i) => {
            const member = memberMap[memberId];
            if (!member) return null;
            const isCurrent = memberId === currentDrafterId;
            const isPast = draftOrder.length > 0 && (
              (session.current_round > 1 || i < session.current_pick_in_round) ||
              (session.current_round === 1 && i < session.current_pick_in_round)
            );
            const isCurrentPickIndex = isCurrent;

            return (
              <div
                key={memberId}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                  ${isCurrentPickIndex ? 'bg-gray-700 ring-1 ring-giants-orange/60' : 'bg-gray-800/50'}
                  ${i < session.current_pick_in_round ? 'opacity-40' : ''}`}
              >
                <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                <MemberBadge name={member.name} color={member.color} size="sm" />
                {memberId === myMemberId && !isCurrentPickIndex && (
                  <span className="ml-auto text-xs text-gray-600">you</span>
                )}
                {isCurrentPickIndex && (
                  <span className="ml-auto text-xs text-giants-orange font-bold">← now</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Skipped member info */}
        {skippedId && memberMap[skippedId] && (
          <div className="mt-3 px-3 py-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-xs text-gray-500">
              Sitting out this round:
            </p>
            <MemberBadge name={memberMap[skippedId].name} color={memberMap[skippedId].color} size="sm" />
          </div>
        )}
      </div>

      {/* Full randomized seed order */}
      {draftOrder.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Draft Seed Order
          </p>
          <div className="space-y-1">
            {draftOrder.map((memberId, i) => {
              const member = memberMap[memberId];
              if (!member) return null;
              return (
                <div key={memberId} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 w-4">{i + 1}</span>
                  <MemberBadge name={member.name} color={member.color} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
