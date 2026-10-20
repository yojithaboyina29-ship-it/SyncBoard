import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { TokenPayload } from '../middleware/auth.js';

let ioInstance: SocketIOServer | null = null;

export interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: number;
}

// Map of boardId -> Map of socketId -> PresenceUser
const boardPresence = new Map<string, Map<string, PresenceUser>>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [ENV.CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
      socket.data.user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join Board Room
    socket.on('board:join', ({ boardId, avatarUrl }: { boardId: string; avatarUrl?: string }) => {
      const roomName = `board:${boardId}`;
      socket.join(roomName);

      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }

      const boardRoom = boardPresence.get(boardId)!;
      boardRoom.set(socket.id, {
        socketId: socket.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatarUrl,
        joinedAt: Date.now(),
      });

      // Broadcast updated presence to all clients viewing this board
      const activeMembers = Array.from(boardRoom.values());
      io.to(roomName).emit('presence:update', {
        boardId,
        members: activeMembers,
      });
    });

    // Leave Board Room
    socket.on('board:leave', ({ boardId }: { boardId: string }) => {
      const roomName = `board:${boardId}`;
      socket.leave(roomName);

      if (boardPresence.has(boardId)) {
        const boardRoom = boardPresence.get(boardId)!;
        boardRoom.delete(socket.id);
        if (boardRoom.size === 0) {
          boardPresence.delete(boardId);
        } else {
          io.to(roomName).emit('presence:update', {
            boardId,
            members: Array.from(boardRoom.values()),
          });
        }
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      for (const [boardId, boardRoom] of boardPresence.entries()) {
        if (boardRoom.has(socket.id)) {
          boardRoom.delete(socket.id);
          const roomName = `board:${boardId}`;
          if (boardRoom.size === 0) {
            boardPresence.delete(boardId);
          } else {
            io.to(roomName).emit('presence:update', {
              boardId,
              members: Array.from(boardRoom.values()),
            });
          }
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}
