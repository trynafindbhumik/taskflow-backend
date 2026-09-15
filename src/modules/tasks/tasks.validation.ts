import { z } from 'zod';

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee_id: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    subtasks: z.array(z.any()).optional(),
  }),
});

export const bulkUpdateTasksSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, 'ids array cannot be empty'),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignee_id: z.string().optional().nullable(),
  }),
});

export const bulkDeleteTasksSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, 'ids array cannot be empty'),
  }),
});

export const createSubtaskSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Subtask title is required' }).min(1, 'Subtask title cannot be empty'),
  }),
});

export const updateSubtaskSchema = z.object({
  body: z.object({
    completed: z.boolean().optional(),
    title: z.string().optional(),
  }),
});
