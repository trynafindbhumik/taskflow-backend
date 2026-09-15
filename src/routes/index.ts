import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import tasksRoutes from '../modules/tasks/tasks.routes';
import invitationsRoutes from '../modules/invitations/invitations.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/invitations', invitationsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/', dashboardRoutes);

export default router;
