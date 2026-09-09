import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), AuthController.resendVerification);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshSchema), AuthController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

router.patch('/profile', authenticate, AuthController.updateProfile);
router.get('/me', authenticate, AuthController.getProfile);
router.post('/logout', authenticate, AuthController.logout);

export default router;
