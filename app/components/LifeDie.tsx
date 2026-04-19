'use client';

type Props = { lives: number; isEliminated?: boolean };

export default function LifeDie({ lives, isEliminated = false }: Props) {
  const display = Math.max(0, Math.min(6, lives));

  const colors = [
    '', // 0 - not shown
    'bg-red-900 border-red-600',
    'bg-red-800 border-red-500',
    'bg-orange-800 border-orange-500',
    'bg-yellow-800 border-yellow-500',
    'bg-green-800 border-green-500',
    'bg-green-700 border-green-400',
  ];

  if (isEliminated || display === 0) {
    return (
      <div className="w-8 h-8 rounded-lg border-2 border-gray-700 bg-gray-900 flex items-center justify-center">
        <span className="text-gray-600 text-xs">✗</span>
      </div>
    );
  }

  return (
    <div className={`w-8 h-8 rounded-lg border-2 ${colors[display]} flex items-center justify-center`}>
      <span className="text-white font-bold text-sm">{display}</span>
    </div>
  );
}
