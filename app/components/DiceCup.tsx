'use client';
import { useState } from 'react';
import DieFace from './DieFace';
import { rollDice, DICE_RANKS, getRank } from '@/lib/game';

type Props = {
  minRank: number;
  onRollAndClaim: (actualLabel: string, claimLabel: string) => void;
  disabled: boolean;
};

export default function DiceCup({ minRank, onRollAndClaim, disabled }: Props) {
  const [rolled, setRolled] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [actualRoll, setActualRoll] = useState<{ d1: number; d2: number; label: string } | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string>('');

  const validClaims = DICE_RANKS.slice(minRank === -1 ? 0 : minRank);

  function handleRoll() {
    if (disabled) return;
    setShaking(true);
    setTimeout(() => {
      const roll = rollDice();
      setActualRoll(roll);
      setRolled(true);
      setShaking(false);
      const defaultClaim = roll.rank >= (minRank === -1 ? 0 : minRank) ? roll.label : validClaims[0];
      setSelectedClaim(defaultClaim ?? '');
    }, 700);
  }

  function handleConfirm() {
    if (!actualRoll || !selectedClaim) return;
    onRollAndClaim(actualRoll.label, selectedClaim);
    setRolled(false);
    setActualRoll(null);
    setSelectedClaim('');
  }

  if (!rolled) {
    return (
      <button
        onClick={handleRoll}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl
          border-2 border-amber-700 bg-amber-900/60 text-amber-200 font-bold text-sm
          transition-all cursor-pointer select-none
          ${shaking ? 'shake' : ''}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-amber-800/80 hover:border-amber-500 active:scale-95'}
        `}
      >
        <span className="text-2xl">🎲</span> Roll dice
      </button>
    );
  }

  if (!actualRoll) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Dice faces */}
      <div className="flex gap-1 shrink-0">
        <DieFace value={actualRoll.d1} size={44} />
        <DieFace value={actualRoll.d2} size={44} />
      </div>

      {/* Roll label */}
      <span className="text-amber-200 font-bold text-sm shrink-0">
        = {actualRoll.label === '21' ? 'Emma' : actualRoll.label}
        <span className="text-gray-500 text-xs ml-1">(only you see this)</span>
      </span>

      {/* Claim selector */}
      <select
        value={selectedClaim}
        onChange={e => setSelectedClaim(e.target.value)}
        className="bg-gray-900 border border-amber-700 text-amber-100 rounded px-2 py-1 text-sm"
      >
        {validClaims.map(c => (
          <option key={c} value={c}>
            {c === '21' ? 'Emma (21)' : c}{c === actualRoll.label ? ' ←' : ''}
          </option>
        ))}
      </select>

      {selectedClaim && getRank(selectedClaim) !== actualRoll.rank && (
        <span className="text-orange-400 text-xs shrink-0">
          {getRank(selectedClaim) > actualRoll.rank ? '⚠ bluffing up' : '⚠ bluffing down'}
        </span>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedClaim}
        className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-40 shrink-0"
      >
        Claim
      </button>
    </div>
  );
}
