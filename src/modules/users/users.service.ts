import { prisma } from '../../db/prisma';

export class UsersService {
  static async listUsers(searchQuery?: string) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const q = searchQuery.trim();

    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }
}

