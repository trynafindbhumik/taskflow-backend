import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  createProjectTaskSchema,
} from './projects.validation';

const router = Router();

router.get('/', authenticate, ProjectsController.listProjects);
router.post('/', authenticate, validate(createProjectSchema), ProjectsController.createProject);
router.get('/:id', authenticate, ProjectsController.getProjectDetails);
router.patch('/:id', authenticate, validate(updateProjectSchema), ProjectsController.updateProject);
router.delete('/:id', authenticate, ProjectsController.deleteProject);

router.get('/:id/members', authenticate, ProjectsController.getProjectMembers);
router.post('/:id/members', authenticate, ProjectsController.inviteMembers);
router.delete('/:id/members/:userId', authenticate, ProjectsController.removeMember);

router.get('/:id/tasks', authenticate, ProjectsController.getProjectTasks);
router.post('/:id/tasks', authenticate, validate(createProjectTaskSchema), ProjectsController.createProjectTask);

export default router;
