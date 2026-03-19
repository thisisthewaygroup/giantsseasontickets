'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CSVUpload from '@/components/CSVUpload';
import MemberBadge from '@/components/MemberBadge';
import { MEMBER_COLORS } from '@/lib/types';
import type { Member, Game, DraftSession } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [sessions, setSessions] = useState<DraftSession[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [pendingGames, setPendingGames] = useState<{ date: string; time?: string; opponent: string; game_number?: number; notes?: string; price_per_ticket?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    const [membersRes, gamesRes, sessionsRes] = await Promise.all([
      fetch('/api/members'),
      fetch('/api/games'),
      fetch('/api/sessions'),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (gamesRes.ok) setGames(await gamesRes.json());
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim() || undefined, color }),
    });
    if (res.ok) {
      setNewMemberName('');
      setNewMemberEmail('');
      fetchData();
    } else {
      showMessage('error', 'Failed to add member');
    }
  }

  async function deleteMember(id: string) {
    await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  async function uploadGames() {
    if (pendingGames.length === 0) return;
    setLoading(true);
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games: pendingGames }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      showMessage('success', `${data.inserted} games uploaded!`);
      fetchData();
    } else {
      showMessage('error', 'Failed to upload games');
    }
  }

  async function createAndStartDraft() {
    if (members.length === 0) return showMessage('error', 'Add members first');
    if (games.length === 0) return showMessage('error', 'Upload schedule first');
    setLoading(true);

    // Create session
    const yearRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: new Date().getFullYear() }),
    });
    if (!yearRes.ok) { setLoading(false); return showMessage('error', 'Failed to create session'); }
    const session = await yearRes.json();

    // Start it (randomize order)
    const startRes = await fetch(`/api/sessions/${session.id}/start`, { method: 'POST' });
    setLoading(false);
    if (startRes.ok) {
      router.push(`/draft/${session.id}`);
    } else {
      const err = await startRes.json();
      showMessage('error', err.error || 'Failed to start draft');
    }
  }

  const activeSession = sessions.find((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-giants-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-giants-orange">Draft Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Set up members, upload the schedule, and start the draft.</p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Home</a>
        </div>

        {/* Status message */}
        {message && (
          <div className={`rounded-lg p-3 text-sm font-medium ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Active draft banner */}
        {activeSession && (
          <div className="bg-giants-orange/20 border border-giants-orange rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-giants-orange">Draft in progress!</p>
              <p className="text-sm text-gray-300">Round {activeSession.current_round}, pick {activeSession.current_pick_in_round + 1}</p>
            </div>
            <button
              onClick={() => router.push(`/draft/${activeSession.id}`)}
              className="bg-giants-orange text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Go to Draft →
            </button>
          </div>
        )}

        {/* Members */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Group Members</h2>
            <span className="text-sm text-gray-400">{members.length}/8 members</span>
          </div>

          <form onSubmit={addMember} className="flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-giants-orange"
              required
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-giants-orange"
            />
            <button
              type="submit"
              disabled={members.length >= 8}
              className="bg-giants-orange text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </form>

          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                  <MemberBadge name={m.name} color={m.color} />
                  {m.email && <span className="text-gray-500 text-xs">{m.email}</span>}
                </div>
                <button
                  onClick={() => deleteMember(m.id)}
                  className="text-gray-600 hover:text-red-400 text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">No members yet. Add up to 8 people.</p>
            )}
          </div>
        </section>

        {/* Schedule Upload */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Game Schedule</h2>
            {games.length > 0 && (
              <span className="text-sm text-green-400">{games.length} games loaded</span>
            )}
          </div>

          <CSVUpload onGamesReady={setPendingGames} />

          {pendingGames.length > 0 && (
            <button
              onClick={uploadGames}
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Uploading…' : `Upload ${pendingGames.length} Games`}
            </button>
          )}

          {games.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {games[0]?.date} – {games[games.length - 1]?.date}
            </div>
          )}
        </section>

        {/* Start Draft */}
        <section className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Start Draft</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={`rounded-lg p-3 border ${members.length > 0 ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-gray-700 bg-gray-800 text-gray-500'}`}>
              {members.length > 0 ? `✓ ${members.length} members` : '✗ No members yet'}
            </div>
            <div className={`rounded-lg p-3 border ${games.length > 0 ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-gray-700 bg-gray-800 text-gray-500'}`}>
              {games.length > 0 ? `✓ ${games.length} games` : '✗ No schedule yet'}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Starting the draft will randomly determine the pick order. Round 1 all {members.length || 'N'} members pick. Each subsequent round, one member sits out in rotating order.
          </p>
          <button
            onClick={createAndStartDraft}
            disabled={loading || members.length === 0 || games.length === 0}
            className="w-full bg-giants-orange hover:bg-orange-600 text-white py-3 rounded-lg font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Starting…' : 'Randomize Order & Start Draft →'}
          </button>
        </section>

        {/* Past Sessions */}
        {sessions.filter(s => s.status !== 'active').length > 0 && (
          <section className="bg-gray-900 rounded-xl p-6 space-y-3">
            <h2 className="text-xl font-bold">Past Sessions</h2>
            {sessions.filter(s => s.status !== 'active').map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium">{s.year} Draft</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {s.status}
                  </span>
                </div>
                <a href={`/draft/${s.id}`} className="text-giants-orange hover:underline text-sm">View →</a>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
