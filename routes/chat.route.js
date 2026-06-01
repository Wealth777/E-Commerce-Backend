const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { verifyUser, requireRole, apiLimiter } = require('../middleware/verifyUser');
const { chatUpload } = require('../middleware/chatUpload');
const chatController = require('../controllers/common/chat.controller');
const { sendError } = require('../utils/responseStruture');
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
  return next();
};

const mongoId = (field) => body(field).isMongoId().withMessage(`${field} must be a valid ID`);
const paramMongoId = (field) => param(field).isMongoId().withMessage(`${field} must be a valid ID`);
const role = (field) => body(field).isIn(['buyer', 'vendor']).withMessage(`${field} must be buyer or vendor`);

router.use(apiLimiter);
router.use(verifyUser);
router.use(requireRole(['buyer', 'vendor']));

router.post('/conversations', [mongoId('targetUserId'), role('targetRole')], validate, chatController.startOrGetConversation);
router.get('/conversations', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate, chatController.getConversations);
router.get('/conversations/search', chatController.searchConversations);
router.get('/conversations/:conversationId/messages', [paramMongoId('conversationId')], validate, chatController.getMessages);
router.get('/conversations/:conversationId/messages/search', [paramMongoId('conversationId')], validate, chatController.searchMessages);
router.patch('/conversations/:conversationId/read', [paramMongoId('conversationId')], validate, chatController.markMessagesRead);
router.patch('/conversations/:conversationId/archive', [paramMongoId('conversationId')], validate, chatController.archiveConversation);
router.patch('/conversations/:conversationId/unarchive', [paramMongoId('conversationId')], validate, chatController.unarchiveConversation);
router.delete('/conversations/:conversationId', [paramMongoId('conversationId')], validate, chatController.deleteConversation);
router.post('/conversations/:conversationId/report', [paramMongoId('conversationId'), body('reason').trim().notEmpty().isLength({ max: 1000 })], validate, chatController.reportConversation);

router.post('/messages', chatUpload, [body('conversationId').optional().isMongoId(), body('receiverId').optional().isMongoId(), body('receiverRole').optional().isIn(['buyer', 'vendor']), body('text').optional().isLength({ max: 5000 })], validate, chatController.sendMessage);
router.delete('/messages/:messageId', [paramMongoId('messageId'), body('forEveryone').optional().isBoolean()], validate, chatController.deleteMessage);
router.post('/block', [mongoId('targetUserId'), role('targetRole')], validate, chatController.blockUser);
router.post('/unblock', [mongoId('targetUserId')], validate, chatController.unblockUser);
router.post('/reports/user', [mongoId('reportedUserId'), role('reportedUserRole'), body('reason').trim().notEmpty().isLength({ max: 1000 })], validate, chatController.reportUser);

module.exports = router;
