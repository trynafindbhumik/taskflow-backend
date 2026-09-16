import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { redisService } from '../../services/redis';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/mailer';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  TooManyRequestsError,
  AppError,
} from '../../errors/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'taskflow_super_secret_refresh_key_2026';

export function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_verified: user.is_verified,
    created_at: user.created_at,
  };
}

function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class AuthService {
  static async register(data: { name: string; email: string; password: string }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password_hash,
        is_verified: false,
      },
    });

    const token = generateRandomToken();
    await redisService.setVerificationToken(token, newUser.id, 24 * 60 * 60);
    await sendVerificationEmail(newUser.email, newUser.name, token);

    return {
      message: 'Registration successful! Please check your email to verify your account.',
      user: formatUser(newUser),
    };
  }

  static async verifyEmail(token: string) {
    const userId = await redisService.getVerificationToken(token);
    if (!userId) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { is_verified: true },
    });

    await redisService.deleteVerificationToken(token);

    const accessToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: updatedUser.id },
      data: { refresh_token: hashedRefreshToken },
    });

    await redisService.setRefreshToken(updatedUser.id, refreshToken);

    return {
      message: 'Email successfully verified!',
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: formatUser(updatedUser),
    };
  }

  static async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.is_verified) {
      throw new BadRequestError('Email is already verified');
    }

    const remainingSeconds = await redisService.getResendCooldown(email);
    if (remainingSeconds > 0) {
      throw new TooManyRequestsError(
        `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before requesting another verification email.`,
        remainingSeconds
      );
    }

    const token = generateRandomToken();
    await redisService.setVerificationToken(token, user.id, 24 * 60 * 60);
    await sendVerificationEmail(user.email, user.name, token);
    await redisService.setResendCooldown(email, 60);

    return {
      message: 'Verification email sent! Please check your inbox.',
    };
  }

  static async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.is_verified) {
      throw new AppError('Please verify your email address before logging in.', 403, {
        unverified: true,
        email: user.email,
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: hashedRefreshToken },
    });

    await redisService.setRefreshToken(user.id, refreshToken);

    return {
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: formatUser(user),
    };
  }

  static async refreshToken(refreshTokenInput: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenInput, JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.refresh_token) {
      throw new UnauthorizedError('Invalid refresh token state');
    }

    const isMatch = await bcrypt.compare(refreshTokenInput, user.refresh_token);
    if (!isMatch) {
      throw new UnauthorizedError('Refresh token mismatch');
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: hashedNewRefreshToken },
    });

    await redisService.setRefreshToken(user.id, newRefreshToken);

    return {
      token: newAccessToken,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      const token = generateRandomToken();
      await redisService.setPasswordResetToken(token, user.id, 60 * 60);
      await sendPasswordResetEmail(user.email, token);
    }

    return {
      message: 'If an account exists with that email, a password reset link has been sent.',
    };
  }

  static async resetPassword(token: string, newPassword: string) {
    const userId = await redisService.getPasswordResetToken(token);
    if (!userId) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    await redisService.deletePasswordResetToken(token);

    return {
      message: 'Password successfully reset! You can now log in with your new password.',
    };
  }

  static async updateProfile(userId: string, data: { name?: string; current_password?: string; new_password?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
    }

    if (data.new_password) {
      if (!data.current_password) {
        throw new BadRequestError('Current password is required to set new password');
      }

      const isMatch = await bcrypt.compare(data.current_password, user.password_hash);
      if (!isMatch) {
        throw new BadRequestError('Incorrect current password');
      }

      updateData.password_hash = await bcrypt.hash(data.new_password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return formatUser(updatedUser);
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return formatUser(user);
  }

  static async logout(userId?: string) {
    if (userId) {
      await redisService.deleteRefreshToken(userId);
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { refresh_token: null },
        });
      } catch (err: any) {
        if (err?.code !== 'P2025') {
          throw err;
        }
      }
    }
    return { message: 'Logged out successfully' };
  }
}
