import { Router } from 'express';
import { TasksController } from './tasks.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  updateTaskSchema,
  bulkUpdateTasksSchema,
  bulkDeleteTasksSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from './tasks.validation';

const router = Router();

router.patch('/:id', authenticate, validate(updateTaskSchema), TasksController.updateTask);
router.post('/bulk-update', authenticate, validate(bulkUpdateTasksSchema), TasksController.bulkUpdate);
router.post('/bulk-delete', authenticate, validate(bulkDeleteTasksSchema), TasksController.bulkDelete);
router.delete('/:id', authenticate, TasksController.deleteTask);

router.post('/:id/subtasks', authenticate, validate(createSubtaskSchema), TasksController.createSubtask);
router.patch('/subtasks/:subtaskId', authenticate, validate(updateSubtaskSchema), TasksController.updateSubtask);
router.delete('/subtasks/:subtaskId', authenticate, TasksController.deleteSubtask);

export default router;
