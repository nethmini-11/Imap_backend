import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { env, isDevelopment } from "../config/environment"; 

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal server error";

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    message = error.message;
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (statusCode >= 500) {
    Logger.error("Server error:", error);
  } else {
    Logger.warn("Client error:", { message: error.message, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && { stack: error.stack }), 
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
