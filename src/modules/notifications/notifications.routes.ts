import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, NotificationsController.getUserNotifications);
router.patch('/:id/read', authenticate, NotificationsController.markAsRead);
router.post('/read-all', authenticate, NotificationsController.markAllAsRead);
router.delete('/clear-all', authenticate, NotificationsController.clearAll);
router.delete('/:id', authenticate, NotificationsController.deleteNotification);

export default router;
