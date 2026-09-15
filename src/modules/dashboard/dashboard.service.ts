import { prisma } from '../../db/prisma';

async function getUserProjectIds(userId: string): Promise<string[]> {
  const members = await prisma.projectMember.findMany({
    where: { user_id: userId },
    select: { project_id: true },
  });
  return members.map((m) => m.project_id);
}

export class DashboardService {
  static async getStats(userId: string) {
    const projectIds = await getUserProjectIds(userId);

    const [total, done, in_progress, high_priority] = await Promise.all([
      prisma.task.count({ where: { project_id: { in: projectIds } } }),
      prisma.task.count({ where: { project_id: { in: projectIds }, status: 'done' } }),
      prisma.task.count({ where: { project_id: { in: projectIds }, status: 'in_progress' } }),
      prisma.task.count({ where: { project_id: { in: projectIds }, priority: 'high' } }),
    ]);

    return {
      total,
      done,
      in_progress,
      high_priority,
    };
  }

  static async getDeadlines(userId: string, limit: number = 5, offset: number = 0) {
    const projectIds = await getUserProjectIds(userId);

    const where = {
      project_id: { in: projectIds },
      due_date: { not: null },
    };

    const total = await prisma.task.count({ where });

    const rawTasks = await prisma.task.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { due_date: 'asc' },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    const tasks = rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      project_id: t.project_id,
      project_name: t.project.name,
      assignee: t.assignee,
    }));

    const has_more = offset + limit < total;

    return {
      tasks,
      total,
      has_more,
    };
  }

  static async search(userId: string, query: string) {
    const q = query.trim();
    if (!q) {
      return { projects: [], tasks: [] };
    }

    const projectIds = await getUserProjectIds(userId);

    const [projects, tasks] = await Promise.all([
      prisma.projects.findMany({
        where: {
          id: { in: projectIds },
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          project_id: { in: projectIds },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          subtasks: { orderBy: { created_at: 'asc' } },
        },
      }),
    ]);

    return { projects, tasks };
  }
}
