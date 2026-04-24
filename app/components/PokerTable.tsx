'use client';
import type { GameState } from '@/lib/game';
import PlayerSeat from './PlayerSeat';

type Props = {
  state: GameState;
  playerId: string;
};

const SEAT_ANGLES_BY_COUNT: Record<number, number[]> = {
  2: [270, 90],
  3: [270, 30, 150],
  4: [270, 0, 90, 180],
  5: [270, 330, 30, 150, 210],
  6: [270, 330, 30, 90, 150, 210],
};

// Returns left/top as % of the padded outer container
function seatStyle(angle: number): React.CSSProperties {
  const rad = (angle * Math.PI) / 180;
  // Ellipse sits in the middle 80% of the container (10% padding each side)
  // Map into that region: cx=50%, cy=50%, rx=40%, ry=35%
  const x = 50 + 40 * Math.cos(rad);
  const y = 50 + 35 * Math.sin(rad);
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
  };
}

export default function PokerTable({ state, playerId }: Props) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const count = Math.max(2, state.players.length) as keyof typeof SEAT_ANGLES_BY_COUNT;
  const angles = SEAT_ANGLES_BY_COUNT[count] ?? SEAT_ANGLES_BY_COUNT[6];

  return (
    // Outer: fixed aspect ratio container. paddingTop drives height.
    // Extra px/py gives breathing room so seats don't get clipped.
    <div className="relative w-full mx-auto" style={{ maxWidth: '860px', paddingTop: '44%' }}>
      <div className="absolute inset-0">
        {/* Outer rim — inset so seats can overlap the edge */}
        <div className="absolute inset-x-[8%] inset-y-[10%] rounded-[50%] bg-amber-900 shadow-2xl" />
        {/* Felt surface */}
        <div className="absolute inset-x-[10%] inset-y-[12%] rounded-[50%] bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-amber-400 font-bold text-xl tracking-widest drop-shadow">EMMA</p>
            {currentPlayer && state.phase !== 'lobby' && state.phase !== 'finished' && (
              <p className="text-yellow-300 font-bold text-sm animate-pulse mt-0.5">
                ▶ {currentPlayer.name}
              </p>
            )}
            {state.currentClaim && (
              <div className="mt-0.5">
                <p className="text-green-300/70 text-[10px] uppercase tracking-wider">Current claim</p>
                <p className="text-white font-bold text-xl drop-shadow">
                  {state.currentClaim === '21' ? '🎯 Emma' : state.currentClaim}
                </p>
              </div>
            )}
            {state.phase === 'lobby' && (
              <p className="text-green-400 text-xs mt-1">Waiting to start…</p>
            )}
            {state.phase === 'finished' && state.winner && (
              <p className="text-yellow-300 font-bold text-sm mt-1">
                🏆 {state.players.find(p => p.id === state.winner)?.name} wins!
              </p>
            )}
          </div>
        </div>

        {/* Player seats */}
        {state.players.map((player, i) => (
          <div key={player.id} style={seatStyle(angles[i] ?? 0)}>
            <PlayerSeat
              player={player}
              isCurrentTurn={currentPlayer?.id === player.id && state.phase !== 'lobby'}
              isMe={player.id === playerId}
              isHost={player.id === state.hostId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
