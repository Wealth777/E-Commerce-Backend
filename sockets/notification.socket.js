const jwt = require('jsonwebtoken');
const logger = require('../logger');

let ioInstance = null;

const getRoomName = (role, userId) => `${role}:${userId}`;

const initializeSocket = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_KEY);
      socket.user = {
        _id: decoded.id,
        role: decoded.role,
      };

      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const room = getRoomName(socket.user.role, socket.user._id);
    socket.join(room);

    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user._id,
      role: socket.user.role,
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.user._id,
        role: socket.user.role,
      });
    });
  });
};

const emitNotification = (notification) => {
  if (!ioInstance || !notification) return;

  const room = getRoomName(notification.recipientRole, notification.recipient.toString());
  ioInstance.to(room).emit('notification:new', notification);
};

const emitUnreadCount = ({ userId, role, count }) => {
  if (!ioInstance) return;
  ioInstance.to(getRoomName(role, userId.toString())).emit('notification:unread-count', { count });
};

module.exports = {
  initializeSocket,
  emitNotification,
  emitUnreadCount,
};
