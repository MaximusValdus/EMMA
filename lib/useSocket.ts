'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './game';

export type SocketState = {
  socket: Socket | null;
  gameState: GameState | null;
  roomId: string | null;
  playerId: string | null;
  error: string | null;
  myRoll: { d1: number; d2: number; label: string } | null;
};

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketState>({
    socket: null,
    gameState: null,
    roomId: null,
    playerId: null,
    error: null,
    myRoll: null,
  });

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    setState(s => ({ ...s, socket, playerId: socket.id ?? null }));

    socket.on('connect', () => {
      setState(s => ({ ...s, playerId: socket.id ?? null }));
    });

    socket.on('game-created', ({ roomId }: { roomId: string }) => {
      setState(s => ({ ...s, roomId }));
    });

    socket.on('game-joined', ({ roomId }: { roomId: string }) => {
      setState(s => ({ ...s, roomId }));
    });

    socket.on('game-state', (gameState: GameState) => {
      setState(s => ({ ...s, gameState }));
    });

    socket.on('your-roll', (roll: { d1: number; d2: number; label: string }) => {
      setState(s => ({ ...s, myRoll: roll }));
    });

    socket.on('error', (msg: string) => {
      setState(s => ({ ...s, error: msg }));
    });

    return () => { socket.disconnect(); };
  }, []);

  return { state, socketRef };
}
