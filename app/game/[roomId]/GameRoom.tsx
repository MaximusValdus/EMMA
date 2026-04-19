'use client';
import { useState, useEffect } from 'react';
import { useGame } from '@/lib/SocketContext';
import PokerTable from '@/app/components/PokerTable';
import DiceCup from '@/app/components/DiceCup';
import GameLog from '@/app/components/GameLog';
import { getRank } from '@/lib/game';

type Props = { roomId: string };

export default function GameRoom({ roomId }: Props) {
  const { socket, gameState, playerId, error, roomId: ctxRoomId } = useGame();
  const [copied, setCopied] = useState(false);

  const me = gameState?.players.find(p => p.id === playerId);
  const isHost = gameState?.hostId === playerId;
  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const canChallenge = isMyTurn && !!gameState?.currentClaim && gameState?.phase === 'rolling';
  const minRank = gameState?.currentClaim ? getRank(gameState.currentClaim) + 1 : 0;

  useEffect(() => {
    if (!socket || !roomId) return;
    if (ctxRoomId === roomId) return;
    const stored = sessionStorage.getItem('emma-name');
    if (stored) socket.emit('join-game', { roomId, name: stored });
  }, [socket, roomId, ctxRoomId]);

  function handleAddBot() { socket?.emit('add-bot', { roomId }); }
  function handleRemoveBot(botId: string) { socket?.emit('remove-bot', { roomId, botId }); }
  function handleStartGame() { socket?.emit('start-game', { roomId }); }
  function handleRollAndClaim(actualLabel: string, claimLabel: string) {
    socket?.emit('roll-result', { roomId, label: actualLabel });
    socket?.emit('roll-and-claim', { roomId, claimLabel });
  }
  function handleChallenge() { socket?.emit('challenge', { roomId }); }
  function handlePlayAgain() { socket?.emit('play-again', { roomId }); }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Connecting…</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-900/50 shrink-0">
        <h1 className="text-2xl font-bold text-amber-400 tracking-widest">EMMA</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-mono">
            Room: <span className="text-amber-300 font-bold">{roomId}</span>
          </span>
          <button onClick={copyLink}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-700 px-3 py-1 rounded-lg transition-colors">
            {copied ? '✓ Copied!' : 'Copy invite link'}
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 mx-4 mt-2 bg-red-900/50 border border-red-600 rounded-lg px-4 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Table (fills available width, fixed height) ── */}
      <div className="shrink-0 w-full px-4 pt-3">
        <PokerTable state={gameState} playerId={playerId ?? ''} />
      </div>

      {/* ── Bottom strip: actions + log ── */}
      <div className="flex-1 min-h-0 flex gap-3 px-4 pb-4 pt-2">

        {/* Action panel */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">

          {/* Lobby */}
          {gameState.phase === 'lobby' && (
            <div className="bg-gray-900/80 border border-amber-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-amber-300 text-sm font-semibold">
                {gameState.players.length} / 6 players
                {gameState.players.length < 2 && ' — need at least 2 to start'}
              </p>
              {isHost ? (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleAddBot} disabled={gameState.players.length >= 6}
                    className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40">
                    + Add Bot
                  </button>
                  {gameState.players.filter(p => p.isBot).map(bot => (
                    <button key={bot.id} onClick={() => handleRemoveBot(bot.id)}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-800 text-gray-300 rounded-lg text-xs transition-colors">
                      Remove {bot.name}
                    </button>
                  ))}
                  <button onClick={handleStartGame} disabled={gameState.players.length < 2}
                    className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold transition-colors disabled:opacity-40 ml-auto">
                    Start Game ▶
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Waiting for the host to start…</p>
              )}
            </div>
          )}

          {/* In-game actions */}
          {(gameState.phase === 'rolling' || gameState.phase === 'claiming') && (
            <div className="bg-gray-900/80 border border-amber-800 rounded-xl p-3">
              {isMyTurn && me && me.lives > 0 ? (
                <div className="flex items-center gap-4">
                  <p className="text-green-300 font-bold text-base shrink-0">Your Turn!</p>
                  {canChallenge && (
                    <button onClick={handleChallenge}
                      className="shrink-0 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold transition-colors text-sm">
                      🚨 Challenge!
                    </button>
                  )}
                  {canChallenge && <span className="text-gray-500 text-xs shrink-0">— or —</span>}
                  <div className="flex-1">
                    <DiceCup minRank={minRank} onRollAndClaim={handleRollAndClaim} disabled={false} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-300 text-lg animate-pulse">▶</span>
                    <span className="text-yellow-200 font-bold text-base">
                      {currentPlayer?.name ?? '…'}{currentPlayer?.isBot ? ' 🤖' : ''}
                    </span>
                    <span className="text-gray-400 text-sm">is playing…</span>
                  </div>
                  {gameState.currentClaim && (
                    <p className="text-amber-200 mt-1">
                      Current claim:{' '}
                      <span className="font-bold text-white">
                        {gameState.currentClaim === '21' ? 'Emma (21)' : gameState.currentClaim}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Challenge result */}
          {gameState.phase === 'challenge-result' && gameState.lastChallengeResult && (
            <div className="bg-gray-900/80 border border-orange-700 rounded-xl p-4 text-center fade-in">
              <p className="text-orange-300 font-bold text-lg mb-1">Challenge Result!</p>
              <p className="text-white text-sm">
                Claimed: <span className="font-bold text-amber-300">
                  {gameState.lastChallengeResult.claimedLabel === '21' ? 'Emma' : gameState.lastChallengeResult.claimedLabel}
                </span>
                {' · '}
                Actual: <span className="font-bold text-green-300">
                  {gameState.lastChallengeResult.actualLabel === '21' ? 'Emma' : gameState.lastChallengeResult.actualLabel}
                </span>
              </p>
              <p className="text-red-400 mt-1 text-sm">
                {gameState.players.find(p => p.id === gameState.lastChallengeResult!.loserId)?.name} loses a life!
              </p>
              <p className="text-gray-500 text-xs mt-1 animate-pulse">Next round starting…</p>
            </div>
          )}

          {/* Game over */}
          {gameState.phase === 'finished' && (
            <div className="bg-gray-900/80 border border-yellow-600 rounded-xl p-5 text-center fade-in">
              <p className="text-yellow-300 font-bold text-2xl mb-1">Game Over!</p>
              {gameState.winner && (
                <p className="text-white text-lg">
                  🏆 <span className="text-yellow-300 font-bold">
                    {gameState.players.find(p => p.id === gameState.winner)?.name}
                  </span> wins!
                </p>
              )}
              {isHost && (
                <button onClick={handlePlayAgain}
                  className="mt-3 px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold transition-colors">
                  Play Again ▶
                </button>
              )}
            </div>
          )}
        </div>

        {/* Game log */}
        <div className="w-64 shrink-0 bg-gray-900/80 border border-gray-700 rounded-xl p-3 flex flex-col min-h-0">
          <GameLog entries={gameState.log} />
        </div>
      </div>

    </div>
  );
}
