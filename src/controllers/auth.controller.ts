import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { env } from "../config/environment";

export class AuthController {
  static async initiateAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authUrl = AuthService.getAuthUrl();
      res.json({ success: true, authUrl });
    } catch (error) {
      next(error);
    }
  }

  static async handleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        res
          .status(400)
          .json({ success: false, message: "Authorization code required" });
        return;
      }

      const { user, token } = await AuthService.handleCallback(code);

      // Redirect to frontend with token
      res.redirect(
        `${
          env.FRONTEND_URL
        }/auth/callback?token=${token}&email=${encodeURIComponent(
          user.email
        )}&name=${encodeURIComponent(user.name)}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);
      next(error);
    }
  }

  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id;
      await AuthService.logout(userId);

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = (req as any).user;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          last_sync_at: user.last_sync_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
