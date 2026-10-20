import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(window.location.origin, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('⚡ Socket connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
