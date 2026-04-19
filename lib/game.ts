export type Phase = 'lobby' | 'rolling' | 'claiming' | 'challenge-result' | 'finished';

export type Player = {
  id: string;
  name: string;
  lives: number;
  isBot: boolean;
  seatIndex: number;
  isConnected: boolean;
};

export type LogEntry = {
  id: string;
  message: string;
  type: 'claim' | 'challenge' | 'result' | 'system';
  timestamp: number;
};

export type ChallengeResult = {
  challengerId: string;
  claimantId: string;
  claimedLabel: string;
  actualLabel: string;
  loserId: string;
};

export type GameState = {
  roomId: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  currentPlayerIndex: number;
  currentClaim: string | null;
  currentClaimRank: number;
  lastChallengeResult: ChallengeResult | null;
  winner: string | null;
  log: LogEntry[];
  round: number;
};

// Ranked from lowest (index 0) to highest (index 20)
export const DICE_RANKS: string[] = [
  '31', '32', '41', '42', '43',
  '51', '52', '53', '54',
  '61', '62', '63', '64', '65',
  '11', '22', '33', '44', '55', '66',
  '21', // Emma - highest
];

export function getRank(label: string): number {
  return DICE_RANKS.indexOf(label);
}

export function rollDice(): { d1: number; d2: number; label: string; rank: number } {
  const d1 = Math.ceil(Math.random() * 6);
  const d2 = Math.ceil(Math.random() * 6);
  const label = d1 >= d2 ? `${d1}${d2}` : `${d2}${d1}`;
  const rank = getRank(label);
  return { d1, d2, label, rank };
}

export function isEmma(label: string): boolean {
  return label === '21';
}

export function getNextActivePlayerIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (players[idx].lives > 0) return idx;
  }
  return fromIndex;
}

export function countActivePlayers(players: Player[]): number {
  return players.filter(p => p.lives > 0).length;
}

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateLogId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Bot AI: decide what to claim given actual roll and minimum required rank
export function botDecideClaim(
  actualLabel: string,
  actualRank: number,
  minRank: number,
): string {
  if (actualRank >= minRank) {
    // Roll beats or meets requirement — tell truth most of the time, occasionally bump up
    if (actualRank < DICE_RANKS.length - 3 && Math.random() < 0.2) {
      return DICE_RANKS[Math.min(actualRank + 1, DICE_RANKS.length - 1)];
    }
    return actualLabel;
  }
  // Must bluff — claim the minimum required or slightly higher
  const bluffRank = minRank + (Math.random() < 0.4 ? 1 : 0);
  return DICE_RANKS[Math.min(bluffRank, DICE_RANKS.length - 1)];
}

// Bot AI: decide whether to challenge the current claim
export function botDecideChallenge(claimRank: number): boolean {
  // Higher the claim, more likely to challenge
  const topRanks = DICE_RANKS.length; // 21
  const probability = 0.1 + (claimRank / topRanks) * 0.55;
  return Math.random() < probability;
}
