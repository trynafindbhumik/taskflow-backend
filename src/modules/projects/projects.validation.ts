import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Project name is required' }).min(1, 'Project name cannot be empty'),
    description: z.string().optional().nullable(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name cannot be empty').optional(),
    description: z.string().optional().nullable(),
  }),
});

export const createProjectTaskSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Task title is required' }).min(1, 'Task title cannot be empty'),
    description: z.string().optional().nullable(),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee_id: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    subtasks: z.array(z.any()).optional(),
  }),
});
