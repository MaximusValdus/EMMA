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

function seatStyle(angle: number): React.CSSProperties {
  const rad = (angle * Math.PI) / 180;
  // Keep seats inside the padded container (rx=40%, ry=36% of the inner area)
  const x = 50 + 44 * Math.cos(rad);
  const y = 50 + 40 * Math.sin(rad);
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}

export default function PokerTable({ state, playerId }: Props) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const count = Math.max(2, state.players.length) as keyof typeof SEAT_ANGLES_BY_COUNT;
  const angles = SEAT_ANGLES_BY_COUNT[count] ?? SEAT_ANGLES_BY_COUNT[6];

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: '900px' }}>
      <div className="relative w-full" style={{ paddingTop: '42%' }}>
        <div className="absolute inset-0">
          {/* Outer rim */}
          <div className="absolute inset-0 rounded-[50%] bg-amber-900 shadow-2xl" />
          {/* Felt surface */}
          <div className="absolute inset-[3%] rounded-[50%] bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center">
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

          {/* Player seats — positioned relative to this inner box */}
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
    </div>
  );
}
