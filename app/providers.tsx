'use client';
import { SocketProvider } from '@/lib/SocketContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
