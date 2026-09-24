import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { ProjectsService } from './projects.service';
import { UnauthorizedError } from '../../errors/AppError';

export class ProjectsController {
  static async listProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '9', 10);

      const result = await ProjectsService.listProjects(userId, page, limit);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const project = await ProjectsService.createProject(userId, req.body.name, req.body.description);
      return res.status(201).json(project);
    } catch (error) {
      return next(error);
    }
  }

  static async getProjectDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const project = await ProjectsService.getProjectDetails(userId, req.params.id);
      return res.status(200).json(project);
    } catch (error) {
      return next(error);
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const updatedProject = await ProjectsService.updateProject(userId, req.params.id, req.body);
      return res.status(200).json(updatedProject);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await ProjectsService.deleteProject(userId, req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  static async getProjectMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const members = await ProjectsService.getProjectMembers(req.params.id);
      return res.status(200).json(members);
    } catch (error) {
      return next(error);
    }
  }

  static async getProjectInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const invitations = await ProjectsService.getProjectInvitations(req.params.id);
      return res.status(200).json(invitations);
    } catch (error) {
      return next(error);
    }
  }

  static async inviteMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const result = await ProjectsService.inviteMembers(userId, req.params.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      await ProjectsService.removeMember(userId, req.params.id, req.params.userId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  static async getProjectTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tasks = await ProjectsService.getProjectTasks(req.params.id, req.query.status as string);
      return res.status(200).json(tasks);
    } catch (error) {
      return next(error);
    }
  }

  static async createProjectTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError();

      const newTask = await ProjectsService.createProjectTask(userId, req.params.id, req.body);
      return res.status(201).json(newTask);
    } catch (error) {
      return next(error);
    }
  }
}
