import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { DashboardService } from './dashboard.service';
import { UnauthorizedError } from '../../errors/AppError';

export class DashboardController {
  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const stats = await DashboardService.getStats(userId);
      return res.status(200).json(stats);
    } catch (error) {
      return next(error);
    }
  }

  static async getDeadlines(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const limit = parseInt((req.query.limit as string) || '5', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      const result = await DashboardService.getDeadlines(userId, limit, offset);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const q = (req.query.q as string) || '';
      const result = await DashboardService.search(userId, q);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}
