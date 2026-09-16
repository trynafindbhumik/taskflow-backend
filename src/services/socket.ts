import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_super_secret_jwt_key_2026';

/**
 * Initializes Socket.IO server with JWT handshake authentication and room management.
 */
export function initSocketIO(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.query?.token as string) ||
      (socket.handshake.headers?.authorization?.split(' ')[1] as string);

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      socket.data.user = decoded;
      next();
    } catch {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id;
    if (userId) {
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`🔌 WebSocket connected: User ${userId} joined room ${userRoom}`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: User ${userId}`);
    });
  });

  console.log('🚀 Socket.IO Server initialized');
  return io;
}

/**
 * Returns the active Socket.IO server instance.
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emits a real-time notification event to a specific user room.
 */
export function emitNotificationToUser(userId: string, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`📡 Real-time notification emitted to user:${userId}`);
  }
}
