import { prisma } from '../../db/prisma';

export class UsersService {
  static async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
