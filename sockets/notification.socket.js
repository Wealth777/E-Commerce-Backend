const jwt = require('jsonwebtoken');
const logger = require('../logger');
const chatService = require('../services/chat/chat.service');

let ioInstance = null;
const onlineUsers = new Map();

const getRoomName = (role, userId) => `${role}:${userId}`;
const getConversationRoom = (conversationId) => `chat:${conversationId}`;

const emitChatEventToUser = (role, userId, event, payload) => {
  if (!ioInstance || !role || !userId) return;
  ioInstance.to(getRoomName(role, userId.toString())).emit(event, payload);
};

const emitChatEventToConversation = (conversationId, event, payload) => {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(getConversationRoom(conversationId.toString())).emit(event, payload);
};

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
    onlineUsers.set(socket.user._id.toString(), { role: socket.user.role, socketId: socket.id, onlineAt: new Date() });
    socket.broadcast.emit('user_online', { userId: socket.user._id, role: socket.user.role });

    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.user._id,
      role: socket.user.role,
    });

    socket.on('join_chat', async ({ conversationId } = {}, callback) => {
      try {
        await chatService.getConversationById({ conversationId, userId: socket.user._id });
        socket.join(getConversationRoom(conversationId));
        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('leave_chat', ({ conversationId } = {}, callback) => {
      if (conversationId) socket.leave(getConversationRoom(conversationId));
      callback?.({ success: true });
    });

    socket.on('send_message', async (payload = {}, callback) => {
      try {
        const data = await chatService.sendMessage({
          currentUserId: socket.user._id,
          currentRole: socket.user.role,
          conversationId: payload.conversationId,
          receiverId: payload.receiverId,
          receiverRole: payload.receiverRole,
          text: payload.text,
          files: [],
        });
        socket.emit('receive_message', data);
        callback?.({ success: true, data });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('message_read', async ({ conversationId } = {}, callback) => {
      try {
        const data = await chatService.markRead({ userId: socket.user._id, conversationId });
        callback?.({ success: true, data });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('message_delivered', ({ conversationId, messageId } = {}) => {
      emitChatEventToConversation(conversationId, 'message_delivered', { conversationId, messageId, userId: socket.user._id, deliveredAt: new Date() });
    });

    socket.on('typing_start', async ({ conversationId } = {}, callback) => {
      try {
        const data = await chatService.setTyping({ userId: socket.user._id, role: socket.user.role, conversationId, isTyping: true });
        callback?.({ success: true, data });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('typing_stop', async ({ conversationId } = {}, callback) => {
      try {
        const data = await chatService.setTyping({ userId: socket.user._id, role: socket.user.role, conversationId, isTyping: false });
        callback?.({ success: true, data });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('conversation_archived', (payload = {}) => {
      socket.emit('conversation_archived', payload);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.user._id.toString());
      socket.broadcast.emit('user_offline', { userId: socket.user._id, role: socket.user.role });
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
  emitChatEventToUser,
  emitChatEventToConversation,
};