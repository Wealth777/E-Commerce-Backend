const chatService = require('../../services/chat/chat.service');
const logger = require('../../logger');
const { sendSuccess, sendError } = require('../../utils/responseStruture');

const handleError = (res, error, fallback) => {
  logger.error(error);
  return sendError(res, error.statusCode || 500, error.message || fallback, error.errors || null);
};

exports.startOrGetConversation = async (req, res) => {
  try {
    const conversation = await chatService.createOrGetConversation({
      currentUserId: req.user._id,
      currentRole: req.user.role,
      targetUserId: req.body.targetUserId,
      targetRole: req.body.targetRole,
    });
    return sendSuccess(res, 200, 'Conversation fetched successfully', conversation);
  } catch (error) {
    return handleError(res, error, 'Failed to start conversation');
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const data = await chatService.sendMessage({
      currentUserId: req.user._id,
      currentRole: req.user.role,
      conversationId: req.body.conversationId,
      receiverId: req.body.receiverId,
      receiverRole: req.body.receiverRole,
      text: req.body.text,
      files: req.files || [],
    });
    return sendSuccess(res, 201, 'Message sent successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to send message');
  }
};

exports.getConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations({ userId: req.user._id, query: req.query });
    return sendSuccess(res, 200, 'Conversations fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch conversations');
  }
};

exports.getMessages = async (req, res) => {
  try {
    const data = await chatService.getMessages({ userId: req.user._id, conversationId: req.params.conversationId, query: req.query });
    return sendSuccess(res, 200, 'Messages fetched successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to fetch messages');
  }
};

exports.markMessagesRead = async (req, res) => {
  try {
    const data = await chatService.markRead({ userId: req.user._id, conversationId: req.params.conversationId });
    return sendSuccess(res, 200, 'Messages marked as read', data);
  } catch (error) {
    return handleError(res, error, 'Failed to mark messages read');
  }
};

exports.archiveConversation = async (req, res) => {
  try {
    const data = await chatService.updateArchive({ userId: req.user._id, conversationId: req.params.conversationId, archived: true });
    return sendSuccess(res, 200, 'Conversation archived', data);
  } catch (error) {
    return handleError(res, error, 'Failed to archive conversation');
  }
};

exports.unarchiveConversation = async (req, res) => {
  try {
    const data = await chatService.updateArchive({ userId: req.user._id, conversationId: req.params.conversationId, archived: false });
    return sendSuccess(res, 200, 'Conversation unarchived', data);
  } catch (error) {
    return handleError(res, error, 'Failed to unarchive conversation');
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const data = await chatService.deleteConversationForUser({ userId: req.user._id, conversationId: req.params.conversationId });
    return sendSuccess(res, 200, 'Conversation deleted for current user', data);
  } catch (error) {
    return handleError(res, error, 'Failed to delete conversation');
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const data = await chatService.deleteMessage({ userId: req.user._id, messageId: req.params.messageId, forEveryone: req.body.forEveryone === true });
    return sendSuccess(res, 200, 'Message deleted successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to delete message');
  }
};

exports.searchConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations({ userId: req.user._id, query: { ...req.query, search: req.query.q } });
    return sendSuccess(res, 200, 'Conversation search completed', data);
  } catch (error) {
    return handleError(res, error, 'Failed to search conversations');
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const data = await chatService.getMessages({ userId: req.user._id, conversationId: req.params.conversationId, query: { ...req.query, search: req.query.q } });
    return sendSuccess(res, 200, 'Message search completed', data);
  } catch (error) {
    return handleError(res, error, 'Failed to search messages');
  }
};

exports.blockUser = async (req, res) => {
  try {
    const data = await chatService.blockUser({ currentUserId: req.user._id, currentRole: req.user.role, targetUserId: req.body.targetUserId, targetRole: req.body.targetRole, reason: req.body.reason });
    return sendSuccess(res, 200, 'User blocked successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to block user');
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const data = await chatService.unblockUser({ currentUserId: req.user._id, targetUserId: req.body.targetUserId });
    return sendSuccess(res, 200, 'User unblocked successfully', data);
  } catch (error) {
    return handleError(res, error, 'Failed to unblock user');
  }
};

exports.reportUser = async (req, res) => {
  try {
    const data = await chatService.report({ currentUserId: req.user._id, currentRole: req.user.role, reportedUserId: req.body.reportedUserId, reportedUserRole: req.body.reportedUserRole, reason: req.body.reason, metadata: req.body.metadata });
    return sendSuccess(res, 201, 'User report submitted', data);
  } catch (error) {
    return handleError(res, error, 'Failed to report user');
  }
};

exports.reportConversation = async (req, res) => {
  try {
    const data = await chatService.report({ currentUserId: req.user._id, currentRole: req.user.role, conversationId: req.params.conversationId, reason: req.body.reason, metadata: req.body.metadata });
    return sendSuccess(res, 201, 'Conversation report submitted', data);
  } catch (error) {
    return handleError(res, error, 'Failed to report conversation');
  }
};
