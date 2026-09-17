import { Router } from 'express';
import { InvitationsController } from './invitations.controller';
import { validate } from '../../middleware/validate';
import { acceptInvitationSchema } from './invitations.validation';

const router = Router();

router.get('/:token', InvitationsController.getInvitationByToken);
router.post('/:token/accept', validate(acceptInvitationSchema), InvitationsController.acceptInvitation);
router.post('/:token/accept-google', InvitationsController.acceptInvitationWithGoogle);
router.post('/:token/reject', InvitationsController.rejectInvitation);

export default router;
