/**
 * Draft Order Logic
 *
 * Round 1: all N members pick in order   [1,2,3,4,5,6,7,8]
 * Round 2: skip member at draftOrder[0]  [2,3,4,5,6,7,8]
 * Round 3: skip member at draftOrder[1]  [1,3,4,5,6,7,8]
 * Round r≥2: skip draftOrder[(r-2) % N]
 *
 * This gives N picks in round 1, (N-1) picks in all subsequent rounds.
 */

/**
 * Returns the ordered array of member IDs who pick in a given round.
 */
export function getPicksForRound(draftOrder: string[], round: number): string[] {
  if (round === 1) return [...draftOrder];
  const skipIndex = (round - 2) % draftOrder.length;
  return draftOrder.filter((_, i) => i !== skipIndex);
}

/**
 * Returns the member ID of whoever is currently picking.
 */
export function getCurrentDrafter(
  draftOrder: string[],
  currentRound: number,
  currentPickInRound: number
): string {
  const picks = getPicksForRound(draftOrder, currentRound);
  return picks[currentPickInRound];
}

/**
 * Number of picks in a given round.
 */
export function getPicksInRound(round: number, totalMembers: number): number {
  return round === 1 ? totalMembers : totalMembers - 1;
}

/**
 * Advances to the next pick state after a pick is made.
 */
export function advancePickState(
  currentRound: number,
  currentPickInRound: number,
  totalMembers: number
): { round: number; pickInRound: number } {
  const picksInCurrentRound = getPicksInRound(currentRound, totalMembers);
  if (currentPickInRound + 1 >= picksInCurrentRound) {
    return { round: currentRound + 1, pickInRound: 0 };
  }
  return { round: currentRound, pickInRound: currentPickInRound + 1 };
}

/**
 * Returns the 1-indexed overall pick number.
 */
export function getOverallPickNumber(
  round: number,
  pickInRound: number,
  totalMembers: number
): number {
  if (round === 1) return pickInRound + 1;
  // Round 1 has totalMembers picks; all others have (totalMembers - 1)
  return totalMembers + (round - 2) * (totalMembers - 1) + pickInRound + 1;
}

/**
 * Fisher-Yates shuffle — randomizes initial draft order.
 */
export function randomizeDraftOrder(memberIds: string[]): string[] {
  const arr = [...memberIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns the member ID skipped in a given round (null for round 1).
 */
export function getSkippedMember(draftOrder: string[], round: number): string | null {
  if (round === 1) return null;
  return draftOrder[(round - 2) % draftOrder.length];
}

/**
 * Builds a full pick schedule showing (round, pickInRound, memberId) for each game slot.
 * Useful for previewing the draft order.
 */
export function buildPickSchedule(
  draftOrder: string[],
  totalGames: number
): Array<{ round: number; pickInRound: number; memberId: string; overallPick: number }> {
  const schedule = [];
  let round = 1;
  let pickInRound = 0;
  const n = draftOrder.length;

  for (let i = 0; i < totalGames; i++) {
    const memberId = getCurrentDrafter(draftOrder, round, pickInRound);
    const overallPick = getOverallPickNumber(round, pickInRound, n);
    schedule.push({ round, pickInRound, memberId, overallPick });
    const next = advancePickState(round, pickInRound, n);
    round = next.round;
    pickInRound = next.pickInRound;
  }

  return schedule;
}
