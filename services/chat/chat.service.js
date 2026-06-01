const mongoose = require('mongoose');
const xss = require('xss');
const cloudinary = require('../../config/cloudinary');
const Conversation = require('../../models/chat/conversation.model');
const Message = require('../../models/chat/message.model');
const ReadReceipt = require('../../models/chat/readReceipt.model');
const TypingStatus = require('../../models/chat/typingStatus.model');
const BlockedUser = require('../../models/chat/blockedUser.model');
const ChatReport = require('../../models/chat/chatReport.model');
const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const AppError = require('../common/AppError');
const notificationService = require('../notification/notification.service');
const getChatSocket = () => require('../../sockets/notification.socket');

const roleModelMap = { buyer: Buyer, vendor: Vendor };
const MAX_TEXT = 5000;
const MAX_LIMIT = 100;

const normalizeId = (value) => value?.toString?.() || String(value);
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const participantKey = (a, b) => [normalizeId(a), normalizeId(b)].sort().join(':');
const getPage = (v) => Math.max(1, Number(v) || 1);
const getLimit = (v, fallback = 20) => Math.min(Math.max(1, Number(v) || fallback), MAX_LIMIT);

const sanitizeText = (text = '') => xss(String(text).trim()).slice(0, MAX_TEXT);

const getUserProfile = async (userId, role) => {
  const Model = roleModelMap[role];
  if (!Model || !isObjectId(userId)) throw new AppError('Invalid user', 400);
  const user = await Model.findById(userId).select('fullName username profilePhoto storeName');
  if (!user) throw new AppError(`${role} not found`, 404);
  return {
    user: user._id,
    role,
    name: user.fullName || user.username || role,
    businessName: role === 'vendor' ? user.storeName : undefined,
    profilePhoto: user.profilePhoto,
  };
};

const getOtherParticipant = (conversation, userId) => conversation.participants.find(p => normalizeId(p.user) !== normalizeId(userId));
const isParticipant = (conversation, userId) => conversation.participants.some(p => normalizeId(p.user) === normalizeId(userId));

const ensureParticipant = (conversation, userId) => {
  if (!conversation || !isParticipant(conversation, userId)) throw new AppError('Conversation not found', 404);
};

const ensureNotBlocked = async ({ senderId, receiverId, conversation }) => {
  if (conversation?.blocked) throw new AppError('Conversation is blocked', 403);
  const block = await BlockedUser.findOne({
    $or: [
      { blocker: senderId, blocked: receiverId },
      { blocker: receiverId, blocked: senderId },
    ],
  });
  if (block) throw new AppError('Messaging is blocked between these users', 403);
};

const buildUserStatus = (participants) => participants.map(p => ({ user: p.user, role: p.role, unreadCount: 0 }));

const createOrGetConversation = async ({ currentUserId, currentRole, targetUserId, targetRole }) => {
  if (!['buyer', 'vendor'].includes(currentRole) || !['buyer', 'vendor'].includes(targetRole)) throw new AppError('Chat supports buyers and vendors only', 403);
  if (normalizeId(currentUserId) === normalizeId(targetUserId)) throw new AppError('You cannot start a conversation with yourself', 400);

  const key = participantKey(currentUserId, targetUserId);
  let conversation = await Conversation.findOne({ participantKey: key });
  if (conversation) return conversation;

  const participants = [
    await getUserProfile(currentUserId, currentRole),
    await getUserProfile(targetUserId, targetRole),
  ];

  conversation = await Conversation.create({
    participants,
    participantKey: key,
    userStatus: buildUserStatus(participants),
    metadata: { createdBy: currentUserId, createdByRole: currentRole },
  });

  return conversation;
};

const getConversationById = async ({ conversationId, userId }) => {
  if (!isObjectId(conversationId)) throw new AppError('Invalid conversation ID', 400);
  const conversation = await Conversation.findById(conversationId);
  ensureParticipant(conversation, userId);
  return conversation;
};

const uploadAttachment = (file) => new Promise((resolve, reject) => {
  const folder = process.env.CHAT_UPLOAD_FOLDER || 'gmc/chat/attachments';
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();

  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'auto', type: 'authenticated' },
    (error, result) => {
      if (error) return reject(error);
      return resolve({
        originalName: file.originalname,
        fileName: `${result.public_id}.${ext}`,
        mimeType: file.mimetype,
        extension: ext,
        size: file.size,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type || 'auto',
      });
    }
  );
  stream.end(file.buffer);
});

const resolveMessageType = (text, attachments) => {
  if (attachments.length && text) return 'mixed';
  if (!attachments.length) return 'text';
  return attachments.every(a => a.mimeType.startsWith('image/')) ? 'image' : 'file';
};

const sendMessage = async ({ currentUserId, currentRole, conversationId, receiverId, receiverRole, text, files = [] }) => {
  const cleanText = sanitizeText(text);
  if (!cleanText && files.length === 0) throw new AppError('Message text or attachment is required', 400);

  let conversation;
  if (conversationId) conversation = await getConversationById({ conversationId, userId: currentUserId });
  else conversation = await createOrGetConversation({ currentUserId, currentRole, targetUserId: receiverId, targetRole: receiverRole });

  const receiver = getOtherParticipant(conversation, currentUserId);
  await ensureNotBlocked({ senderId: currentUserId, receiverId: receiver.user, conversation });

  const attachments = [];
  for (const file of files) attachments.push(await uploadAttachment(file));

  const message = await Message.create({
    conversation: conversation._id,
    sender: currentUserId,
    senderRole: currentRole,
    receiver: receiver.user,
    receiverRole: receiver.role,
    type: resolveMessageType(cleanText, attachments),
    text: cleanText,
    attachments,
  });

  await ReadReceipt.create({ conversation: conversation._id, message: message._id, user: receiver.user, status: 'sent' });

  const now = new Date();
  conversation.lastMessage = { messageId: message._id, text: cleanText || (attachments.length ? attachments[0].originalName : ''), type: message.type, sender: currentUserId, createdAt: now };
  conversation.lastMessageAt = now;
  conversation.userStatus = conversation.userStatus.map(status => {
    if (normalizeId(status.user) === normalizeId(receiver.user)) status.unreadCount = (status.unreadCount || 0) + 1;
    if (normalizeId(status.user) === normalizeId(currentUserId)) status.deleted = false;
    return status;
  });
  await conversation.save();

  if (!conversation.firstMessageNotificationSent) {
    const hasPreviousMessages = await Message.countDocuments({ conversation: conversation._id, _id: { $ne: message._id } });
    if (hasPreviousMessages === 0) {
      await notificationService.safeCreateNotification({
        recipientId: receiver.user,
        recipientRole: receiver.role,
        type: 'FIRST_CHAT_MESSAGE',
        title: 'New message request',
        message: `${conversation.participants.find(p => normalizeId(p.user) === normalizeId(currentUserId))?.name || 'Someone'} sent you a message.`,
        metadata: { conversationId: conversation._id, senderId: currentUserId, senderRole: currentRole },
        dedupeKey: `chat:first-contact:${conversation.participantKey}`,
      });
      conversation.firstMessageNotificationSent = true;
      await conversation.save();
    }
  }

  getChatSocket().emitChatEventToUser(receiver.role, receiver.user, 'receive_message', { conversation, message });
  getChatSocket().emitChatEventToConversation(conversation._id, 'conversation_updated', conversation);
  return { conversation, message };
};

const getConversations = async ({ userId, query = {} }) => {
  const page = getPage(query.page);
  const limit = getLimit(query.limit);
  const skip = (page - 1) * limit;
  const filter = { 'participants.user': userId, 'userStatus.user': userId, 'userStatus.deleted': { $ne: true } };
  if (query.archived === 'true') filter.userStatus = { $elemMatch: { user: userId, archived: true } };
  if (query.blocked === 'true') filter.blocked = true;
  if (query.unread === 'true') filter.userStatus = { $elemMatch: { user: userId, unreadCount: { $gt: 0 } } };
  if (query.search) filter.$text = { $search: query.search };

  const [conversations, totalItems] = await Promise.all([
    Conversation.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }).skip(skip).limit(limit),
    Conversation.countDocuments(filter),
  ]);

  return { pagination: { currentPage: page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) }, count: conversations.length, conversations };
};

const getMessages = async ({ userId, conversationId, query = {} }) => {
  await getConversationById({ conversationId, userId });
  const page = getPage(query.page);
  const limit = getLimit(query.limit, 30);
  const skip = (page - 1) * limit;
  const filter = { conversation: conversationId, deletedForEveryone: false, 'deletedForMe.user': { $ne: userId } };
  if (query.search) filter.$text = { $search: query.search };
  if (query.from || query.to) filter.createdAt = {};
  if (query.from) filter.createdAt.$gte = new Date(query.from);
  if (query.to) filter.createdAt.$lte = new Date(query.to);

  const [messages, totalItems] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);
  return { pagination: { currentPage: page, pageSize: limit, totalItems, totalPages: Math.ceil(totalItems / limit) }, count: messages.length, messages: messages.reverse() };
};

const markRead = async ({ userId, conversationId }) => {
  const conversation = await getConversationById({ conversationId, userId });
  const now = new Date();
  await Message.updateMany({ conversation: conversationId, receiver: userId, read: false }, { $set: { read: true, readAt: now, delivered: true, deliveredAt: now } });
  await ReadReceipt.updateMany({ conversation: conversationId, user: userId, status: { $ne: 'read' } }, { $set: { status: 'read', readAt: now, deliveredAt: now } });
  conversation.userStatus = conversation.userStatus.map(status => {
    if (normalizeId(status.user) === normalizeId(userId)) {
      status.unreadCount = 0;
      status.lastReadAt = now;
    }
    return status;
  });
  await conversation.save();
  getChatSocket().emitChatEventToConversation(conversation._id, 'message_read', { conversationId, userId, readAt: now });
  return conversation;
};

const updateArchive = async ({ userId, conversationId, archived }) => {
  const conversation = await getConversationById({ conversationId, userId });
  conversation.userStatus = conversation.userStatus.map(status => {
    if (normalizeId(status.user) === normalizeId(userId)) {
      status.archived = archived;
      status.archivedAt = archived ? new Date() : null;
    }
    return status;
  });
  await conversation.save();
  getChatSocket().emitChatEventToUser(conversation.participants.find(p => normalizeId(p.user) === normalizeId(userId)).role, userId, 'conversation_archived', { conversationId, archived });
  return conversation;
};

const deleteConversationForUser = async ({ userId, conversationId }) => {
  const conversation = await getConversationById({ conversationId, userId });
  conversation.userStatus = conversation.userStatus.map(status => {
    if (normalizeId(status.user) === normalizeId(userId)) {
      status.deleted = true;
      status.deletedAt = new Date();
      status.unreadCount = 0;
    }
    return status;
  });
  await conversation.save();
  return conversation;
};

const deleteMessage = async ({ userId, messageId, forEveryone = false }) => {
  if (!isObjectId(messageId)) throw new AppError('Invalid message ID', 400);
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);
  const conversation = await getConversationById({ conversationId: message.conversation, userId });
  if (forEveryone) {
    if (normalizeId(message.sender) !== normalizeId(userId)) throw new AppError('Only sender can delete for everyone', 403);
    message.deletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
  } else if (!message.deletedForMe.some(item => normalizeId(item.user) === normalizeId(userId))) {
    message.deletedForMe.push({ user: userId });
  }
  await message.save();
  getChatSocket().emitChatEventToConversation(conversation._id, 'message_deleted', { messageId, conversationId: conversation._id, forEveryone });
  return message;
};

const blockUser = async ({ currentUserId, currentRole, targetUserId, targetRole, reason }) => {
  const block = await BlockedUser.findOneAndUpdate(
    { blocker: currentUserId, blocked: targetUserId },
    { $set: { blockerRole: currentRole, blockedRole: targetRole, reason: sanitizeText(reason) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const conversation = await Conversation.findOne({ participantKey: participantKey(currentUserId, targetUserId) });
  if (conversation) {
    conversation.blocked = true;
    conversation.blockedBy = currentUserId;
    conversation.blockedAt = new Date();
    await conversation.save();
    getChatSocket().emitChatEventToConversation(conversation._id, 'conversation_updated', conversation);
  }
  return block;
};

const unblockUser = async ({ currentUserId, targetUserId }) => {
  await BlockedUser.deleteOne({ blocker: currentUserId, blocked: targetUserId });
  const stillBlocked = await BlockedUser.findOne({ blocker: targetUserId, blocked: currentUserId });
  const conversation = await Conversation.findOne({ participantKey: participantKey(currentUserId, targetUserId) });
  if (conversation && !stillBlocked) {
    conversation.blocked = false;
    conversation.blockedBy = null;
    conversation.blockedAt = null;
    await conversation.save();
  }
  return { unblocked: true };
};

const report = async ({ currentUserId, currentRole, reportedUserId, reportedUserRole, conversationId, reason, metadata = {} }) => {
  if (!reason) throw new AppError('Report reason is required', 400);
  if (conversationId) await getConversationById({ conversationId, userId: currentUserId });
  return ChatReport.create({ reporter: currentUserId, reporterRole: currentRole, reportedUser: reportedUserId, reportedUserRole, conversation: conversationId, reason: sanitizeText(reason), metadata });
};

const setTyping = async ({ userId, role, conversationId, isTyping }) => {
  await getConversationById({ conversationId, userId });
  const now = new Date();
  const status = await TypingStatus.findOneAndUpdate(
    { conversation: conversationId, user: userId },
    { $set: { role, isTyping, startedAt: isTyping ? now : null, stoppedAt: isTyping ? null : now } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  getChatSocket().emitChatEventToConversation(conversationId, isTyping ? 'typing_start' : 'typing_stop', { conversationId, userId, role });
  return status;
};

module.exports = { createOrGetConversation, sendMessage, getConversations, getMessages, markRead, updateArchive, deleteConversationForUser, deleteMessage, blockUser, unblockUser, report, setTyping, getConversationById };
