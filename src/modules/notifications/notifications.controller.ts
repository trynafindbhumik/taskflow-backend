import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { NotificationsService } from './notifications.service';
import { UnauthorizedError } from '../../errors/AppError';

export class NotificationsController {
  static async getUserNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const notifications = await NotificationsService.getUserNotifications(userId);
      return res.status(200).json(notifications);
    } catch (error) {
      return next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const updated = await NotificationsService.markAsRead(userId, req.params.id);
      return res.status(200).json(updated);
    } catch (error) {
      return next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const result = await NotificationsService.markAllAsRead(userId);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async clearAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await NotificationsService.clearAll(userId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  static async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await NotificationsService.deleteNotification(userId, req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
