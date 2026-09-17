import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AuthService } from './auth.service';
import { UnauthorizedError } from '../../errors/AppError';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async verifyEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyEmail(req.body.token);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async resendVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.resendVerification(req.body.email);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.statusCode === 403 && error.errors?.unverified) {
        return res.status(403).json({
          message: error.message,
          unverified: true,
          email: error.errors.email,
        });
      }
      return next(error);
    }
  }

  static async googleAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.googleAuth(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async connectGoogle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();
      const result = await AuthService.connectGoogle(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async disconnectGoogle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();
      const result = await AuthService.disconnectGoogle(userId);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.refreshToken(req.body.refresh_token);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.resetPassword(req.body.token, req.body.new_password);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();
      const result = await AuthService.updateProfile(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();
      const result = await AuthService.getProfile(userId);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.logout(req.user?.id);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}
