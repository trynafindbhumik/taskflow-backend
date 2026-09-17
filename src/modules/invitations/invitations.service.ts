import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { formatUser } from '../auth/auth.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  AppError,
} from '../../errors/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'taskflow_super_secret_refresh_key_2026';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as any;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any;


/**
 * Business logic service for project invitations and user acceptance onboarding.
 */
export class InvitationsService {
  /**
   * Retrieves invitation details by token and evaluates expiration status.
   */
  static async getInvitationByToken(token: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: { select: { id: true, name: true, description: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    const isExpired = invitation.expires_at < new Date();
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    return {
      id: invitation.id,
      project_id: invitation.project_id,
      project_name: invitation.project.name,
      project_description: invitation.project.description,
      inviter_name: invitation.inviter.name,
      email: invitation.email,
      status: isExpired && invitation.status === 'pending' ? 'expired' : invitation.status,
      user_exists: !!existingUser,
      is_expired: isExpired,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
    };
  }

  /**
   * Accepts a project invitation, handling both new user registration and existing user auth verification.
   */
  static async acceptInvitation(token: string, body: { name?: string; password?: string }, authHeader?: string, authenticatedUserId?: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: { project: true },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestError(`Invitation is already ${invitation.status}`);
    }

    if (invitation.expires_at < new Date()) {
      throw new BadRequestError('Invitation link has expired (invitations are valid for 7 days)');
    }

    const targetEmail = invitation.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!existingUser) {
      // New user registration flow
      const { name, password } = body;
      if (!name || !password) {
        throw new BadRequestError('Full name and password are required to create your account and accept the invitation.');
      }

      if (password.length < 6) {
        throw new BadRequestError('Password must be at least 6 characters.');
      }

      const password_hash = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: targetEmail,
          password_hash,
          is_verified: true,
        },
      });

      await prisma.projectMember.create({
        data: {
          project_id: invitation.project_id,
          user_id: newUser.id,
          role: 'member',
        },
      });

      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });

      await prisma.notification.create({
        data: {
          user_id: invitation.inviter_id,
          title: 'Invitation Accepted',
          message: `${newUser.name} created an account and accepted your invitation to join "${invitation.project.name}"`,
          type: 'project_invite',
          link: `/projects/${invitation.project_id}`,
        },
      });

      const accessToken = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refreshToken = jwt.sign(
        { id: newUser.id, email: newUser.email },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await prisma.user.update({
        where: { id: newUser.id },
        data: { refresh_token: hashedRefreshToken },
      });

      return {
        message: 'Account created and invitation accepted successfully!',
        access_token: accessToken,
        refresh_token: refreshToken,
        user: formatUser(newUser),
        project_id: invitation.project_id,
      };
    }

    // Existing user acceptance flow
    let userId = authenticatedUserId;
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(bearerToken, JWT_SECRET) as any;
        userId = decoded.id;
      } catch {
        // Token invalid or expired
      }
    }

    if (!userId) {
      throw new AppError(`An account with email "${invitation.email}" already exists. Please sign in to accept this invitation.`, 401, {
        user_exists: true,
        email: invitation.email,
      });
    }

    const authenticatedUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!authenticatedUser || authenticatedUser.email.toLowerCase() !== targetEmail) {
      throw new ForbiddenError(
        `This invitation was sent to ${invitation.email}. You are currently signed in as a different user (${authenticatedUser?.email}). Please sign in as ${invitation.email} to accept.`
      );
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: invitation.project_id, user_id: authenticatedUser.id } },
    });

    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          project_id: invitation.project_id,
          user_id: authenticatedUser.id,
          role: 'member',
        },
      });
    }

    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    await prisma.notification.create({
      data: {
        user_id: invitation.inviter_id,
        title: 'Invitation Accepted',
        message: `${authenticatedUser.name} accepted your invitation to join "${invitation.project.name}"`,
        type: 'project_invite',
        link: `/projects/${invitation.project_id}`,
      },
    });

    return {
      message: 'Invitation accepted successfully!',
      project_id: invitation.project_id,
    };
  }

  /**
   * Declines a pending invitation.
   */
  static async rejectInvitation(token: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestError(`Invitation is already ${invitation.status}`);
    }

    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: 'rejected' },
    });

    return {
      message: 'Invitation declined.',
    };
  }
}
