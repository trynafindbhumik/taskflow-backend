import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { sendProjectInviteEmail } from '../../services/mailer';
import { emitNotificationToUser } from '../../services/socket';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/AppError';

export class ProjectsService {
  static async listProjects(userId: string, page: number = 1, limit: number = 9) {
    const skip = (page - 1) * limit;

    const memberRecords = await prisma.projectMember.findMany({
      where: { user_id: userId },
      select: { project_id: true },
    });
    const projectIds = memberRecords.map((m) => m.project_id);

    const total = await prisma.projects.count({
      where: { id: { in: projectIds } },
    });

    const projects = await prisma.projects.findMany({
      where: { id: { in: projectIds } },
      skip,
      take: limit,
      orderBy: { updated_at: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tasks: {
          select: { id: true, status: true, priority: true },
        },
      },
    });

    return { projects, total, page, limit };
  }

  static async createProject(userId: string, name: string, description?: string | null) {
    return prisma.$transaction(async (tx) => {
      const newProject = await tx.projects.create({
        data: {
          name,
          description: description || null,
          owner_id: userId,
        },
      });

      await tx.projectMember.create({
        data: {
          project_id: newProject.id,
          user_id: userId,
          role: 'owner',
        },
      });

      return newProject;
    });
  }

  static async getProjectDetails(userId: string, projectId: string) {
    const member = await prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: userId } },
    });

    if (!member) {
      throw new ForbiddenError('Access denied');
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  static async updateProject(userId: string, projectId: string, data: { name?: string; description?: string | null }) {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner_id !== userId) {
      throw new ForbiddenError('Only the project owner can edit project name or description');
    }

    return prisma.projects.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  static async deleteProject(userId: string, projectId: string) {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner_id !== userId) {
      throw new ForbiddenError('Only project owner can delete project');
    }

    await prisma.projects.delete({
      where: { id: projectId },
    });
  }

  static async getProjectMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { project_id: projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joined_at: 'asc' },
    });
  }

  static async inviteMembers(currentUserId: string, projectId: string, body: any) {
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    const project = await prisma.projects.findUnique({ where: { id: projectId } });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    let rawEmailList: string[] = [];

    if (Array.isArray(body)) {
      rawEmailList = body.map((item) => (typeof item === 'string' ? item : item?.email)).filter(Boolean);
    } else if (Array.isArray(body.emails)) {
      rawEmailList = body.emails.map((item: any) => (typeof item === 'string' ? item : item?.email)).filter(Boolean);
    } else if (Array.isArray(body.members)) {
      rawEmailList = body.members
        .map((item: any) => (typeof item === 'string' ? item : item?.email || item?.user_id))
        .filter(Boolean);
    } else if (body.email) {
      rawEmailList = [body.email];
    } else if (body.user_id) {
      const user = await prisma.user.findUnique({ where: { id: body.user_id } });
      if (user) rawEmailList = [user.email];
    }

    const targetEmails = Array.from(
      new Set(
        rawEmailList
          .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
          .filter((e) => e.length > 0 && e.includes('@'))
      )
    );

    if (targetEmails.length === 0) {
      throw new BadRequestError('At least one valid email address or user ID is required');
    }

    const sent: Array<{ email: string; token: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const targetEmail of targetEmails) {
      const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (existingUser) {
        const existingMember = await prisma.projectMember.findUnique({
          where: { project_id_user_id: { project_id: projectId, user_id: existingUser.id } },
        });
        if (existingMember) {
          skipped.push({ email: targetEmail, reason: 'Already a project member' });
          continue;
        }
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const existingInvitation = await prisma.projectInvitation.findFirst({
        where: { project_id: projectId, email: targetEmail, status: 'pending' },
      });

      if (existingInvitation) {
        await prisma.projectInvitation.update({
          where: { id: existingInvitation.id },
          data: { token, expires_at },
        });
      } else {
        await prisma.projectInvitation.create({
          data: {
            project_id: projectId,
            inviter_id: currentUserId,
            email: targetEmail,
            token,
            expires_at,
            status: 'pending',
          },
        });
      }

      await sendProjectInviteEmail(
        targetEmail,
        currentUser?.name || 'A teammate',
        project.name,
        token
      );

      sent.push({ email: targetEmail, token });
    }

    return {
      message:
        sent.length > 0
          ? `Successfully sent ${sent.length} invitation email${sent.length > 1 ? 's' : ''}`
          : 'No new invitations sent',
      sent_count: sent.length,
      skipped_count: skipped.length,
      sent,
      skipped,
    };
  }

  static async removeMember(currentUserId: string, projectId: string, targetUserId: string) {
    const project = await prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner_id !== currentUserId && currentUserId !== targetUserId) {
      throw new ForbiddenError('Only owner can remove other members');
    }

    if (project.owner_id === targetUserId) {
      throw new BadRequestError('Cannot remove project owner');
    }

    await prisma.$transaction([
      prisma.projectMember.delete({
        where: { project_id_user_id: { project_id: projectId, user_id: targetUserId } },
      }),
      prisma.task.updateMany({
        where: { project_id: projectId, assignee_id: targetUserId },
        data: { assignee_id: null },
      }),
    ]);
  }

  static async getProjectTasks(projectId: string, status?: string) {
    const where: any = { project_id: projectId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    return prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        subtasks: { orderBy: { created_at: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async createProjectTask(currentUserId: string, projectId: string, data: any) {
    const { title, description, status, priority, assignee_id, due_date, subtasks } = data;

    let subtaskCreateData: any[] = [];
    if (Array.isArray(subtasks) && subtasks.length > 0) {
      subtaskCreateData = subtasks.map((s: any) =>
        typeof s === 'string'
          ? { title: s, completed: false, creator_id: currentUserId }
          : { title: s.title, completed: !!s.completed, creator_id: currentUserId }
      );
    }

    let targetAssigneeId: string | null =
      typeof assignee_id === 'string' &&
      assignee_id.trim() !== '' &&
      assignee_id !== 'unassigned' &&
      assignee_id !== 'none'
        ? assignee_id
        : null;

    if (targetAssigneeId) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetAssigneeId } });
      if (!targetUser) {
        targetAssigneeId = null;
      }
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        project_id: projectId,
        assignee_id: targetAssigneeId,
        creator_id: currentUserId,
        due_date: due_date || null,
        subtasks: {
          create: subtaskCreateData,
        },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        subtasks: { orderBy: { created_at: 'asc' } },
        project: { select: { name: true } },
      },
    });

    if (targetAssigneeId && targetAssigneeId !== currentUserId) {
      const notif = await prisma.notification.create({
        data: {
          user_id: targetAssigneeId,
          title: 'Task Assigned',
          message: `You were assigned task "${title}" in "${newTask.project.name}"`,
          type: 'task_assigned',
          link: `/projects/${projectId}`,
        },
      });
      emitNotificationToUser(targetAssigneeId, notif);
    }

    return newTask;
  }
}
