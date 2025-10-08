import { Request, Response, NextFunction } from "express";
import { EmailService } from "../services/email.service";
import { Logger } from "../utils/logger";

export class EmailController {
  static async syncEmails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;

      Logger.info(`Starting email sync for user ${userId}`);

      const result = await EmailService.syncEmails(userId);

      res.json({
        success: true,
        message: `Synced ${result.synced} emails out of ${result.total}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEmails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const unreadOnly = req.query.unreadOnly === "true";

      const result = await EmailService.getEmails(userId, {
        page,
        limit,
        search,
        unreadOnly,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const emailId = parseInt(req.params.id);

      if (isNaN(emailId)) {
        res.status(400).json({ success: false, message: "Invalid email ID" });
        return;
      }

      const email = await EmailService.getEmailById(userId, emailId);

      res.json({
        success: true,
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const emailId = parseInt(req.params.id);

      if (isNaN(emailId)) {
        res.status(400).json({ success: false, message: "Invalid email ID" });
        return;
      }

      const email = await EmailService.markAsRead(userId, emailId);

      res.json({
        success: true,
        message: "Email marked as read",
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const stats = await EmailService.getEmailStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
