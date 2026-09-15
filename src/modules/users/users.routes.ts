import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, UsersController.listUsers);

export default router;
