const express = require('express');
const router = express.Router();
const { verifyUser, requireRole } = require('../middleware/verifyUser');
const notificationController = require('../controllers/common/notification.controller');

router.use(verifyUser);
router.use(requireRole(['buyer', 'vendor']));

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:notificationId/read', notificationController.markOneAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteInAppNotification);

module.exports = router;
