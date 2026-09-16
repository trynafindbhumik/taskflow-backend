import { Router } from 'express';
import { AiController } from './ai.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/chat', authenticate, AiController.handleChat);
router.get('/conversations', authenticate, AiController.getConversations);
router.get('/sessions', authenticate, AiController.getConversations);
router.get('/conversations/:id/messages', authenticate, AiController.getConversationMessages);
router.get('/sessions/:id/history', authenticate, AiController.getConversationMessages);
router.get('/sessions/:id/messages', authenticate, AiController.getConversationMessages);
router.delete('/conversations/:id', authenticate, AiController.deleteConversation);
router.delete('/sessions/:id', authenticate, AiController.deleteConversation);

router.post('/conversations/:id/share', authenticate, AiController.shareConversation);
router.post('/sessions/:id/share', authenticate, AiController.shareConversation);
router.get('/share/:shareId', authenticate, AiController.getSharedConversation);

router.get('/analytics', authenticate, AiController.getAnalytics);

router.post('/proposals/execute', authenticate, AiController.executeProposal);
router.post('/proposals/:id/execute', authenticate, AiController.executeProposal);
router.post('/proposals/:id/cancel', authenticate, AiController.cancelProposal);

export default router;
