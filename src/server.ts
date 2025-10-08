import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/environment";
import { Logger } from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const server = app.listen(env.PORT, () => {
      Logger.info(`🚀 Server running on port ${env.PORT}`);
      Logger.info(`📊 Environment: ${env.NODE_ENV}`);
      Logger.info(`🔗 Server URL: ${env.SERVER_URL}`);
      Logger.info(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      Logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        Logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    Logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
