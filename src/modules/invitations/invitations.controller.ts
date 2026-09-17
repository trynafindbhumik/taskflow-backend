import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { InvitationsService } from './invitations.service';

export class InvitationsController {
  static async getInvitationByToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InvitationsService.getInvitationByToken(req.params.token);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async acceptInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const authenticatedUserId = req.user?.id;
      const result = await InvitationsService.acceptInvitation(
        req.params.token,
        req.body,
        authHeader,
        authenticatedUserId
      );
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.statusCode === 401 && error.errors?.user_exists) {
        return res.status(401).json({
          message: error.message,
          user_exists: true,
          email: error.errors.email,
        });
      }
      return next(error);
    }
  }

  static async acceptInvitationWithGoogle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InvitationsService.acceptInvitationWithGoogle(req.params.token, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async rejectInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await InvitationsService.rejectInvitation(req.params.token);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}
