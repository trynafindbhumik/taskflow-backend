import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { TasksService } from './tasks.service';
import { UnauthorizedError } from '../../errors/AppError';

export class TasksController {
  static async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const updatedTask = await TasksService.updateTask(userId, req.params.id, req.body);
      return res.status(200).json(updatedTask);
    } catch (error) {
      return next(error);
    }
  }

  static async bulkUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const result = await TasksService.bulkUpdate(userId, req.body.ids, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async bulkDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const result = await TasksService.bulkDelete(userId, req.body.ids);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await TasksService.deleteTask(userId, req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  static async createSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const newSubtask = await TasksService.createSubtask(userId, req.params.id, req.body.title);
      return res.status(201).json(newSubtask);
    } catch (error) {
      return next(error);
    }
  }

  static async updateSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updatedSubtask = await TasksService.updateSubtask(req.params.subtaskId, req.body);
      return res.status(200).json(updatedSubtask);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteSubtask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await TasksService.deleteSubtask(userId, req.params.subtaskId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
