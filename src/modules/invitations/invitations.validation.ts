import { z } from 'zod';

export const acceptInvitationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    password: z.string().optional(),
  }),
});
