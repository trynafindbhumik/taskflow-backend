import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { UsersService } from './users.service';

export class UsersController {
  static async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await UsersService.listUsers();
      return res.status(200).json(users);
    } catch (error) {
      return next(error);
    }
  }
}
