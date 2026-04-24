import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  GameState, Player, LogEntry, Phase,
  DICE_RANKS, rollDice, getRank, getNextActivePlayerIndex,
  countActivePlayers, generateRoomId, generateLogId,
  botDecideClaim, botDecideChallenge,
} from './lib/game';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory game rooms
const rooms = new Map<string, GameState>();
// Map socket id → { roomId, playerId }
const socketToPlayer = new Map<string, { roomId: string; playerId: string }>();
// Actual dice rolls — server only, never broadcast except to roller
const roomRolls = new Map<string, Map<string, string>>(); // roomId → playerId → label

function log(state: GameState, message: string, type: LogEntry['type']): void {
  state.log.push({ id: generateLogId(), message, type, timestamp: Date.now() });
  if (state.log.length > 50) state.log.shift();
}

function getPlayerName(state: GameState, id: string): string {
  return state.players.find(p => p.id === id)?.name ?? 'Unknown';
}

function scheduleBotTurn(io: SocketIOServer, roomId: string): void {
  const state = rooms.get(roomId);
  if (!state || state.phase === 'lobby' || state.phase === 'finished') return;

  const current = state.players[state.currentPlayerIndex];
  if (!current || !current.isBot || current.lives <= 0) return;

  setTimeout(() => {
    const s = rooms.get(roomId);
    if (!s) return;
    const bot = s.players[s.currentPlayerIndex];
    if (!bot || !bot.isBot || bot.lives <= 0) return;

    if (s.phase === 'rolling') {
      // Bot rolls
      const roll = rollDice();
      const rolls = roomRolls.get(roomId) ?? new Map();
      rolls.set(bot.id, roll.label);
      roomRolls.set(roomId, rolls);

      const minRank = s.currentClaim ? getRank(s.currentClaim) + 1 : 0;

      // Decide whether to challenge first (only if there's a claim to challenge)
      if (s.currentClaim && botDecideChallenge(getRank(s.currentClaim))) {
        handleChallenge(io, roomId, bot.id);
        return;
      }

      const claimLabel = botDecideClaim(roll.label, roll.rank, minRank);
      handleClaim(io, roomId, bot.id, claimLabel);
    }
  }, 1500 + Math.random() * 1000);
}

function startRound(io: SocketIOServer, roomId: string, starterIndex: number): void {
  const state = rooms.get(roomId);
  if (!state) return;

  // Find actual alive player at or after starterIndex
  let idx = starterIndex;
  while (state.players[idx]?.lives === 0) {
    idx = (idx + 1) % state.players.length;
  }

  state.phase = 'rolling';
  state.currentPlayerIndex = idx;
  state.currentClaim = null;
  state.currentClaimRank = -1;
  state.lastChallengeResult = null;
  state.round++;

  log(state, `Round ${state.round} — ${getPlayerName(state, state.players[idx].id)}'s turn to start`, 'system');
  io.to(roomId).emit('game-state', state);
  scheduleBotTurn(io, roomId);
}

function handleClaim(io: SocketIOServer, roomId: string, playerId: string, claimLabel: string): void {
  const state = rooms.get(roomId);
  if (!state) return;

  const current = state.players[state.currentPlayerIndex];
  if (current.id !== playerId) return;

  state.currentClaim = claimLabel;
  state.currentClaimRank = getRank(claimLabel);
  log(state, `${getPlayerName(state, playerId)} claims ${claimLabel === '21' ? 'Emma (21)' : claimLabel}`, 'claim');

  // Move to next player
  const nextIdx = getNextActivePlayerIndex(state.players, state.currentPlayerIndex);
  state.currentPlayerIndex = nextIdx;
  state.phase = 'rolling';

  io.to(roomId).emit('game-state', state);
  scheduleBotTurn(io, roomId);
}

function handleChallenge(io: SocketIOServer, roomId: string, challengerId: string): void {
  const state = rooms.get(roomId);
  if (!state || !state.currentClaim) return;

  // Find the previous player (the claimant) — go backwards from current
  const currentIdx = state.currentPlayerIndex;
  let claimantIdx = (currentIdx - 1 + state.players.length) % state.players.length;
  while (state.players[claimantIdx].lives === 0) {
    claimantIdx = (claimantIdx - 1 + state.players.length) % state.players.length;
  }
  const claimant = state.players[claimantIdx];

  const rolls = roomRolls.get(roomId);
  const actualLabel = rolls?.get(claimant.id) ?? '31';
  const actualRank = getRank(actualLabel);
  const claimRank = getRank(state.currentClaim);

  const claimantName = getPlayerName(state, claimant.id);
  const challengerName = getPlayerName(state, challengerId);

  let loserId: string;
  if (actualRank >= claimRank) {
    // Claim was honest (or better) — challenger loses a life
    loserId = challengerId;
    log(state, `${challengerName} challenged — actual was ${actualLabel === '21' ? 'Emma (21)' : actualLabel} ✓ claim was true! ${challengerName} loses a life`, 'result');
  } else {
    // Claim was a lie — claimant loses a life
    loserId = claimant.id;
    log(state, `${challengerName} challenged — actual was ${actualLabel === '21' ? 'Emma (21)' : actualLabel} ✗ ${claimantName} lied! ${claimantName} loses a life`, 'result');
  }

  const loserIdx = state.players.findIndex(p => p.id === loserId);
  if (loserIdx !== -1) state.players[loserIdx].lives -= 1;

  state.lastChallengeResult = {
    challengerId,
    claimantId: claimant.id,
    claimedLabel: state.currentClaim,
    actualLabel,
    loserId,
  };
  state.phase = 'challenge-result';

  // Check if game over
  const alive = countActivePlayers(state.players);
  if (alive <= 1) {
    const winner = state.players.find(p => p.lives > 0);
    state.winner = winner?.id ?? null;
    state.phase = 'finished';
    log(state, `Game over! ${winner ? getPlayerName(state, winner.id) : 'Nobody'} wins!`, 'system');
    io.to(roomId).emit('game-state', state);
    return;
  }

  if (state.players[loserIdx]?.lives === 0) {
    log(state, `${getPlayerName(state, loserId)} is eliminated!`, 'system');
  }

  io.to(roomId).emit('game-state', state);

  // Challenger always starts next round (if alive)
  const challengerIdx = state.players.findIndex(p => p.id === challengerId);
  const starterIdx = state.players[challengerIdx]?.lives > 0
    ? challengerIdx
    : getNextActivePlayerIndex(state.players, challengerIdx);

  setTimeout(() => startRound(io, roomId, starterIdx), 3000);
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('create-game', ({ name }: { name: string }) => {
      const roomId = generateRoomId();
      const playerId = socket.id;

      const player: Player = {
        id: playerId,
        name,
        lives: 6,
        isBot: false,
        seatIndex: 0,
        isConnected: true,
      };

      const state: GameState = {
        roomId,
        hostId: playerId,
        phase: 'lobby',
        players: [player],
        currentPlayerIndex: 0,
        currentClaim: null,
        currentClaimRank: -1,
        lastChallengeResult: null,
        winner: null,
        log: [],
        round: 0,
      };

      log(state, `${name} created the game`, 'system');
      rooms.set(roomId, state);
      roomRolls.set(roomId, new Map());
      socketToPlayer.set(socket.id, { roomId, playerId });
      socket.join(roomId);
      socket.emit('game-created', { roomId });
      io.to(roomId).emit('game-state', state);
    });

    socket.on('join-game', ({ roomId, name }: { roomId: string; name: string }) => {
      const rid = roomId.toUpperCase();
      const state = rooms.get(rid);
      if (!state) { socket.emit('error', 'Game not found'); return; }

      // Reconnection: player with same name already exists — update their socket id
      const existing = state.players.find(p => p.name === name && !p.isBot);
      if (existing) {
        const oldEntry = [...socketToPlayer.entries()].find(([, v]) => v.playerId === existing.id);
        if (oldEntry) socketToPlayer.delete(oldEntry[0]);
        existing.id = socket.id;
        existing.isConnected = true;
        if (state.hostId === (oldEntry?.[1]?.playerId ?? '')) state.hostId = socket.id;
        socketToPlayer.set(socket.id, { roomId: rid, playerId: socket.id });
        socket.join(rid);
        socket.emit('game-joined', { roomId: rid });
        socket.emit('game-state', state);
        io.to(rid).emit('game-state', state);
        return;
      }

      if (state.phase !== 'lobby') { socket.emit('error', 'Game already started'); return; }
      if (state.players.length >= 6) { socket.emit('error', 'Game is full'); return; }

      const playerId = socket.id;
      const player: Player = {
        id: playerId,
        name,
        lives: 6,
        isBot: false,
        seatIndex: state.players.length,
        isConnected: true,
      };

      state.players.push(player);
      log(state, `${name} joined the game`, 'system');
      socketToPlayer.set(socket.id, { roomId: rid, playerId });
      socket.join(rid);
      socket.emit('game-joined', { roomId: rid });
      io.to(rid).emit('game-state', state);
    });

    socket.on('add-bot', ({ roomId }: { roomId: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.hostId !== socket.id) return;
      if (state.players.length >= 6) return;

      const botNum = state.players.filter(p => p.isBot).length + 1;
      const bot: Player = {
        id: `bot-${generateRoomId()}-${botNum}`,
        name: `Bot ${botNum}`,
        lives: 6,
        isBot: true,
        seatIndex: state.players.length,
        isConnected: true,
      };

      state.players.push(bot);
      log(state, `${bot.name} joined as a bot`, 'system');
      io.to(roomId).emit('game-state', state);
    });

    socket.on('remove-bot', ({ roomId, botId }: { roomId: string; botId: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.hostId !== socket.id) return;

      const idx = state.players.findIndex(p => p.id === botId && p.isBot);
      if (idx === -1) return;
      state.players.splice(idx, 1);
      state.players.forEach((p, i) => p.seatIndex = i);
      io.to(roomId).emit('game-state', state);
    });

    socket.on('start-game', ({ roomId }: { roomId: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.hostId !== socket.id) return;
      if (state.players.length < 2) { socket.emit('error', 'Need at least 2 players'); return; }

      startRound(io, roomId, 0);
    });

    socket.on('roll-and-claim', ({ roomId, claimLabel }: { roomId: string; claimLabel: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.phase !== 'rolling') return;

      const mapping = socketToPlayer.get(socket.id);
      if (!mapping) return;

      const current = state.players[state.currentPlayerIndex];
      if (current.id !== mapping.playerId) return;

      // Validate claim rank
      const claimRank = getRank(claimLabel);
      if (claimRank === -1) return;
      if (claimRank <= state.currentClaimRank) { socket.emit('error', 'Claim must be higher than current claim'); return; }

      // Store actual roll (client sends what they rolled — server trusts it for privacy model)
      // Actually the client should send the actual roll too so server can verify on challenge
      // We'll handle this below in the roll event
      handleClaim(io, roomId, mapping.playerId, claimLabel);
    });

    socket.on('roll-result', ({ roomId, label }: { roomId: string; label: string }) => {
      // Client reports their actual dice roll to server (for challenge verification)
      const mapping = socketToPlayer.get(socket.id);
      if (!mapping) return;
      const rolls = roomRolls.get(roomId);
      if (!rolls) return;
      rolls.set(mapping.playerId, label);
    });

    socket.on('challenge', ({ roomId }: { roomId: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.phase !== 'rolling' || !state.currentClaim) return;

      const mapping = socketToPlayer.get(socket.id);
      if (!mapping) return;

      const current = state.players[state.currentPlayerIndex];
      if (current.id !== mapping.playerId) return;

      handleChallenge(io, roomId, mapping.playerId);
    });

    socket.on('play-again', ({ roomId }: { roomId: string }) => {
      const state = rooms.get(roomId);
      if (!state || state.hostId !== socket.id) return;

      // Reset all players' lives and remove bots that were added after original setup
      state.players.forEach(p => { p.lives = 6; });
      state.winner = null;
      state.lastChallengeResult = null;
      state.round = 0;
      state.log = [];
      roomRolls.set(roomId, new Map());
      log(state, 'New game started!', 'system');
      startRound(io, roomId, 0);
    });

    socket.on('disconnect', () => {
      const mapping = socketToPlayer.get(socket.id);
      if (!mapping) return;

      const state = rooms.get(mapping.roomId);
      if (state) {
        const player = state.players.find(p => p.id === mapping.playerId);
        if (player) {
          player.isConnected = false;
          log(state, `${player.name} disconnected`, 'system');
          io.to(mapping.roomId).emit('game-state', state);
        }
      }
      socketToPlayer.delete(socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Emma game server running at http://localhost:${port}`);
  });
});
