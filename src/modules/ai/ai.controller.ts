import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service';
import { AuthenticatedRequest } from '../../middleware/auth';
import { BadRequestError, UnauthorizedError } from '../../errors/AppError';

export class AiController {
  static async handleChat(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication token required for AI Assistant');
      }

      const { message, conversation_id, attachment, selected_project_id } = req.body;

      if ((!message || typeof message !== 'string') && !attachment) {
        throw new BadRequestError('Message or attachment is required');
      }

      const result = await AiService.handleChatMessage(
        userId,
        message || '',
        conversation_id,
        attachment,
        selected_project_id
      );
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const conversations = await AiService.getConversations(userId);
      return res.json(conversations);
    } catch (error) {
      return next(error);
    }
  }

  static async getConversationMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const conversationId = req.params.id;
      const messages = await AiService.getConversationMessages(userId, conversationId);
      return res.json(messages);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const conversationId = req.params.id;
      const result = await AiService.deleteConversation(userId, conversationId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async executeProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const proposalId = req.params.id;
      const payload = proposalId || req.body.proposal_data || req.body;

      const result = await AiService.executeProposal(userId, payload);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async cancelProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const proposalId = req.params.id;
      const result = await AiService.cancelProposal(userId, proposalId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async shareConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const conversationId = req.params.id;
      const result = await AiService.shareConversation(userId, conversationId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async getSharedConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const shareId = req.params.shareId;
      const result = await AiService.getSharedConversation(shareId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      if (!userId) throw new BadRequestError('User context missing');

      const result = await AiService.getAnalytics(userId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }
}
