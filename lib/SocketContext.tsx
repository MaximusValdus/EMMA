'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './game';

type SocketCtx = {
  socket: Socket | null;
  gameState: GameState | null;
  roomId: string | null;
  playerId: string | null;
  error: string | null;
  setRoomId: (id: string) => void;
  clearError: () => void;
};

const Ctx = createContext<SocketCtx>({
  socket: null, gameState: null, roomId: null,
  playerId: null, error: null,
  setRoomId: () => {}, clearError: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => setPlayerId(socket.id ?? null));
    socket.on('game-created', ({ roomId: id }: { roomId: string }) => setRoomId(id));
    socket.on('game-joined', ({ roomId: id }: { roomId: string }) => setRoomId(id));
    socket.on('game-state', (state: GameState) => setGameState(state));
    socket.on('error', (msg: string) => setError(msg));

    return () => { socket.disconnect(); };
  }, []);

  return (
    <Ctx.Provider value={{
      socket: socketRef.current,
      gameState,
      roomId,
      playerId,
      error,
      setRoomId,
      clearError: () => setError(null),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGame() {
  return useContext(Ctx);
}
