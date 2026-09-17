import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { UsersService } from './users.service';

export class UsersController {
  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const searchQuery =
        typeof req.query.q === 'string'
          ? req.query.q
          : typeof req.query.search === 'string'
          ? req.query.search
          : undefined;
      const users = await UsersService.listUsers(searchQuery);
      return res.status(200).json(users);
    } catch (error) {
      return next(error);
    }
  }
}
