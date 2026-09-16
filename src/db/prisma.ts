import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma Client instance for database operations across the application.
 */
export const prisma = new PrismaClient();
