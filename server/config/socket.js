import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

//Initializes the Socket.io server using the existing HTTP/HTTPS server instance.
export const initWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  // Authentication middleware using JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error('[Socket.io] Authentication failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected. User ID: ${socket.userId}`);

    // Join a dedicated room for this user to simplify targeted broadcasting
    socket.join(String(socket.userId));

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected. User ID: ${socket.userId}`);
    });
  });

  console.log('✓ Socket.io server initialized and integrated with HTTP server');
  return io;
};

//Broadcasts a real-time event to all active Socket.io connections belonging to a specific user.
export const broadcastToUser = (userId, eventType, data) => {
  if (!io) {
    console.warn('[Socket.io] Cannot broadcast, Server is not initialized.');
    return;
  }

  // Send the event directly to all connections in the user's specific room
  io.to(String(userId)).emit(eventType, data);
  console.log(`[Socket.io] Broadcasted event '${eventType}' to User Room: ${userId}`);
};
