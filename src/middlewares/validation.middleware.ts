import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/errors";

export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 20)
  );

  if (page < 1) {
    throw new ValidationError("Page must be greater than 0");
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError("Limit must be between 1 and 100");
  }

  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
};
