import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { User } from "../models/User";
import { AuthenticationError, NotFoundError } from "../utils/errors";

// Extend the Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Authorization token required");
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await User.findByPk(payload.userId);
    if (!user || !user.is_active) {
      throw new NotFoundError("User not found or inactive");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      const user = await User.findByPk(payload.userId);
      if (user && user.is_active) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
