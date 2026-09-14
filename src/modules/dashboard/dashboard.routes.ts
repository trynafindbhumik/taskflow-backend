import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/stats', authenticate, DashboardController.getStats);
router.get('/deadlines', authenticate, DashboardController.getDeadlines);
router.get('/search', authenticate, DashboardController.search);

export default router;
