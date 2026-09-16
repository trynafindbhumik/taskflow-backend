import { prisma } from '../../db/prisma';
import { emitNotificationToUser } from '../../services/socket';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/AppError';

export class TasksService {
  static async updateTask(currentUserId: string, taskId: string, data: any) {
    const { title, description, status, priority, assignee_id, due_date, subtasks } = data;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { name: true, owner_id: true } } },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const isTaskCreator = existingTask.creator_id === currentUserId;
    const isProjectOwner = existingTask.project.owner_id === currentUserId;
    const canEditDetails = isTaskCreator || isProjectOwner;

    // Non-creators / non-project owners can ONLY update status
    if (!canEditDetails) {
      if (
        title !== undefined ||
        description !== undefined ||
        priority !== undefined ||
        due_date !== undefined ||
        assignee_id !== undefined
      ) {
        throw new ForbiddenError(
          'Only the task creator or project owner can edit task details. Non-owners can only update task status.'
        );
      }
    }

    const updateData: any = {};
    if (canEditDetails && title !== undefined) updateData.title = title;
    if (canEditDetails && description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (canEditDetails && priority !== undefined) updateData.priority = priority;
    if (canEditDetails && due_date !== undefined) updateData.due_date = due_date;

    let targetAssigneeId: string | null = null;
    if (canEditDetails && assignee_id !== undefined) {
      let sanitizedAssigneeId: string | null =
        typeof assignee_id === 'string' &&
        assignee_id.trim() !== '' &&
        assignee_id !== 'unassigned' &&
        assignee_id !== 'none'
          ? assignee_id
          : null;

      if (sanitizedAssigneeId) {
        const targetUser = await prisma.user.findUnique({ where: { id: sanitizedAssigneeId } });
        if (!targetUser) {
          sanitizedAssigneeId = null;
        }
      }

      updateData.assignee_id = sanitizedAssigneeId;
      targetAssigneeId = sanitizedAssigneeId;
    }

    if (Array.isArray(subtasks)) {
      const keepIds = subtasks
        .map((st) => st.id)
        .filter((stId) => stId && typeof stId === 'string' && !stId.startsWith('st_'));

      // If user isn't creator/owner, they cannot delete subtasks created by others
      const existingSubtasks = await prisma.subtask.findMany({ where: { task_id: taskId } });
      const subtasksToDelete = existingSubtasks.filter((st) => !keepIds.includes(st.id));
      for (const st of subtasksToDelete) {
        const isSubtaskCreator = st.creator_id === currentUserId;
        if (!isSubtaskCreator && !canEditDetails) {
          throw new ForbiddenError('You can only delete subtasks created by yourself or if you are the project owner');
        }
      }

      await prisma.subtask.deleteMany({
        where: {
          task_id: taskId,
          id: { notIn: keepIds },
        },
      });

      for (const st of subtasks) {
        if (!st.title || typeof st.title !== 'string') continue;
        const isTempId = !st.id || typeof st.id !== 'string' || st.id.startsWith('st_');
        if (isTempId) {
          await prisma.subtask.create({
            data: {
              task_id: taskId,
              title: st.title.trim(),
              completed: !!st.completed,
              creator_id: currentUserId || null,
            },
          });
        } else {
          const existingSt = await prisma.subtask.findUnique({ where: { id: st.id } });
          if (existingSt) {
            const isSubtaskCreator = existingSt.creator_id === currentUserId;
            const canEditSubtaskTitle = canEditDetails || isSubtaskCreator;
            
            await prisma.subtask.update({
              where: { id: st.id },
              data: {
                ...(canEditSubtaskTitle && { title: st.title.trim() }),
                completed: !!st.completed,
              },
            });
          } else {
            await prisma.subtask.create({
              data: {
                task_id: taskId,
                title: st.title.trim(),
                completed: !!st.completed,
                creator_id: currentUserId || null,
              },
            });
          }
        }
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        subtasks: { orderBy: { created_at: 'asc' } },
      },
    });

    if (
      targetAssigneeId &&
      targetAssigneeId !== existingTask.assignee_id &&
      targetAssigneeId !== currentUserId
    ) {
      const notif = await prisma.notification.create({
        data: {
          user_id: targetAssigneeId,
          title: 'Task Assigned',
          message: `You were assigned task "${updatedTask.title}" in "${existingTask.project.name}"`,
          type: 'task_assigned',
          link: `/projects/${updatedTask.project_id}`,
        },
      });
      emitNotificationToUser(targetAssigneeId, notif);
    }

    return updatedTask;
  }

  static async bulkUpdate(currentUserId: string, ids: string[], data: any) {
    const { status, priority, assignee_id } = data;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    let sanitizedAssigneeId: string | null | undefined = undefined;
    if (assignee_id !== undefined) {
      sanitizedAssigneeId =
        typeof assignee_id === 'string' &&
        assignee_id.trim() !== '' &&
        assignee_id !== 'unassigned' &&
        assignee_id !== 'none'
          ? assignee_id
          : null;

      if (sanitizedAssigneeId) {
        const userExists = await prisma.user.findUnique({ where: { id: sanitizedAssigneeId } });
        if (!userExists) sanitizedAssigneeId = null;
      }
      updateData.assignee_id = sanitizedAssigneeId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No valid fields provided for bulk update');
    }

    const result = await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    if (sanitizedAssigneeId && sanitizedAssigneeId !== currentUserId) {
      const tasks = await prisma.task.findMany({
        where: { id: { in: ids } },
        include: { project: { select: { name: true } } },
      });

      for (const t of tasks) {
        const notif = await prisma.notification.create({
          data: {
            user_id: sanitizedAssigneeId,
            title: 'Task Assigned',
            message: `You were assigned task "${t.title}" in "${t.project.name}"`,
            type: 'task_assigned',
            link: `/projects/${t.project_id}`,
          },
        });
        emitNotificationToUser(sanitizedAssigneeId, notif);
      }
    }

    return { message: 'Bulk update successful', count: result.count };
  }

  static async bulkDelete(currentUserId: string, ids: string[]) {
    const existingTasks = await prisma.task.findMany({
      where: { id: { in: ids } },
      include: { project: { select: { owner_id: true } } },
    });

    const deletableIds = existingTasks
      .filter((t) => t.creator_id === currentUserId || t.project.owner_id === currentUserId || !t.creator_id)
      .map((t) => t.id);

    if (deletableIds.length === 0) {
      throw new ForbiddenError('You do not have permission to delete any of the selected tasks');
    }

    const result = await prisma.task.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return { message: 'Bulk delete successful', count: result.count };
  }

  static async deleteTask(currentUserId: string, taskId: string) {
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { owner_id: true } } },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const isCreator = existingTask.creator_id === currentUserId;
    const isOwner = existingTask.project.owner_id === currentUserId;

    if (!isCreator && !isOwner) {
      throw new ForbiddenError('You can only delete tasks created by yourself or if you are the project owner');
    }

    await prisma.task.delete({ where: { id: taskId } });
  }

  static async createSubtask(currentUserId: string, taskId: string, title: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return prisma.subtask.create({
      data: {
        task_id: taskId,
        title,
        completed: false,
        creator_id: currentUserId,
      },
    });
  }

  static async updateSubtask(currentUserId: string, subtaskId: string, data: { completed?: boolean; title?: string }) {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: {
          select: {
            creator_id: true,
            project: { select: { owner_id: true } },
          },
        },
      },
    });

    if (!subtask) {
      throw new NotFoundError('Subtask not found');
    }

    const isSubtaskCreator = subtask.creator_id === currentUserId;
    const isTaskCreator = subtask.task.creator_id === currentUserId;
    const isProjectOwner = subtask.task.project.owner_id === currentUserId;
    const canEditTitle = isSubtaskCreator || isTaskCreator || isProjectOwner;

    if (data.title !== undefined && !canEditTitle) {
      throw new ForbiddenError(
        'Only the subtask creator, task creator, or project owner can edit subtask title'
      );
    }

    const updateData: any = {};
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (canEditTitle && data.title !== undefined) updateData.title = data.title;

    return prisma.subtask.update({
      where: { id: subtaskId },
      data: updateData,
    });
  }

  static async deleteSubtask(currentUserId: string, subtaskId: string) {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: {
          select: {
            creator_id: true,
            project: { select: { owner_id: true } },
          },
        },
      },
    });

    if (!subtask) {
      throw new NotFoundError('Subtask not found');
    }

    const isSubtaskCreator = subtask.creator_id === currentUserId;
    const isTaskCreator = subtask.task.creator_id === currentUserId;
    const isProjectOwner = subtask.task.project.owner_id === currentUserId;

    if (!isSubtaskCreator && !isTaskCreator && !isProjectOwner) {
      throw new ForbiddenError('You can only delete subtasks created by yourself or if you are the project owner');
    }

    await prisma.subtask.delete({ where: { id: subtaskId } });
  }
}
