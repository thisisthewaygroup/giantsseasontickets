export interface Member {
  id: string;
  name: string;
  email?: string;
  color: string;
  created_at: string;
}

export interface Game {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  time?: string;
  opponent: string;
  game_number?: number;
  notes?: string;
  created_at: string;
}

export interface DraftSession {
  id: string;
  year: number;
  status: 'setup' | 'active' | 'completed';
  draft_order: string[]; // array of member ids in randomized order
  current_round: number; // 1-indexed
  current_pick_in_round: number; // 0-indexed
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Pick {
  id: string;
  draft_session_id: string;
  game_id: string;
  member_id: string;
  round: number;
  pick_number_overall: number;
  picked_at: string;
}

export interface PickWithDetails extends Pick {
  game: Game;
  member: Member;
}

// Member colors — 8 distinct, colorblind-friendly
export const MEMBER_COLORS = [
  '#FD5A1E', // Giants orange
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];
