'use client';
import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/lib/game';

type Props = { entries: LogEntry[] };

const typeStyles: Record<LogEntry['type'], string> = {
  claim: 'text-amber-300',
  challenge: 'text-orange-400',
  result: 'text-green-300',
  system: 'text-gray-400 italic',
};

export default function GameLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-amber-400 font-bold text-sm mb-2 uppercase tracking-widest">Game Log</h3>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {entries.map(entry => (
          <div key={entry.id} className={`text-xs fade-in ${typeStyles[entry.type]}`}>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
