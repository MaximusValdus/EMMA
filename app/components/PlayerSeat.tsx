'use client';
import LifeDie from './LifeDie';
import type { Player } from '@/lib/game';

type Props = {
  player: Player;
  isCurrentTurn: boolean;
  isMe: boolean;
  isHost: boolean;
};

export default function PlayerSeat({ player, isCurrentTurn, isMe, isHost }: Props) {
  const eliminated = player.lives <= 0;

  return (
    <div className={`
      flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl border-2 transition-all
      ${isCurrentTurn ? 'w-[90px]' : 'w-[76px]'}
      ${eliminated ? 'border-gray-700 bg-gray-900/80 opacity-40' : ''}
      ${!eliminated && isCurrentTurn ? 'border-yellow-300 bg-yellow-900/60 active-glow scale-110' : ''}
      ${!eliminated && !isCurrentTurn ? 'border-amber-700/60 bg-black/60' : ''}
    `}>
      {isCurrentTurn && !eliminated && (
        <span className="text-yellow-300 text-[10px] font-bold uppercase tracking-widest animate-pulse leading-none">
          ▶ playing
        </span>
      )}
      <div className="flex items-center gap-0.5 w-full justify-center">
        {player.isBot && <span className="text-xs">🤖</span>}
        {isHost && !player.isBot && <span className="text-xs text-yellow-400">👑</span>}
        <span className={`font-bold truncate
          ${isCurrentTurn ? 'text-sm text-yellow-200' : 'text-xs'}
          ${isMe && !isCurrentTurn ? 'text-green-300' : ''}
          ${!isMe && !isCurrentTurn ? 'text-amber-100' : ''}
        `}>
          {player.name}{isMe ? ' (you)' : ''}
        </span>
      </div>
      <LifeDie lives={player.lives} isEliminated={eliminated} />
    </div>
  );
}
