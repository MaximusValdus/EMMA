'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/SocketContext';

export default function Home() {
  const router = useRouter();
  const { socket, roomId, error, clearError } = useGame();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('emma-name');
    if (stored) setName(stored);
  }, []);

  // Navigate once roomId is set (after create or join)
  useEffect(() => {
    if (roomId && loading) {
      router.push(`/game/${roomId}`);
    }
  }, [roomId, loading, router]);

  function handleCreate() {
    if (!socket || !name.trim()) return;
    setLoading(true);
    clearError();
    sessionStorage.setItem('emma-name', name.trim());
    socket.emit('create-game', { name: name.trim() });
  }

  function handleJoin() {
    if (!socket || !name.trim() || !joinCode.trim()) return;
    setLoading(true);
    clearError();
    sessionStorage.setItem('emma-name', name.trim());
    socket.emit('join-game', { roomId: joinCode.trim().toUpperCase(), name: name.trim() });
  }

  useEffect(() => {
    if (error) setLoading(false);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-amber-400 tracking-widest mb-2">EMMA</h1>
        <p className="text-gray-400 text-lg">The dice bluffing game</p>
      </div>

      <div className="bg-gray-900 border border-amber-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'create' ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Create Game
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'join' ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Join Game
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
            maxLength={20}
            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors"
          />

          {tab === 'join' && (
            <input
              type="text"
              placeholder="Game code (e.g. ABC123)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={6}
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-500 transition-colors"
            />
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading || !name.trim() || (tab === 'join' && !joinCode.trim())}
            className="mt-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 text-lg"
          >
            {loading ? 'Loading…' : tab === 'create' ? 'Create Game' : 'Join Game'}
          </button>
        </div>
      </div>

      <div className="max-w-sm text-center text-gray-500 text-xs space-y-1">
        <p>Each player starts with 6 lives. Roll 2 dice in secret.</p>
        <p>Claim a value equal or higher than the previous claim — or lie.</p>
        <p>Challenge to reveal the truth. The loser loses a life.</p>
        <p className="text-amber-600 font-semibold">The highest roll is 21 — called Emma.</p>
      </div>
    </div>
  );
}
