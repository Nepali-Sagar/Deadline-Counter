import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";
import app from "./app.js";
import Deadline from "./models/Deadline.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  try {
    await connectDB();
    // Ensure the unique sparse clientID index exists before accepting requests.
    await Deadline.init();

    const server = app.listen(PORT, () => {
      console.log(`Deadline API running on port ${PORT}`);
    });

    let shuttingDown = false;

    async function shutdown(signal: string): Promise<void> {
      if (shuttingDown) return;
      shuttingDown = true;

      console.log(`${signal} received. Shutting down...`);

      server.close(async (error) => {
        if (
          error &&
          (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
        ) {
          console.error("Error closing HTTP server:", error);
          process.exitCode = 1;
        }

        try {
          await mongoose.disconnect();
          console.log("MongoDB disconnected.");
        } catch (dbError) {
          console.error("Error disconnecting MongoDB:", dbError);
          process.exitCode = 1;
        }
      });
    }

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
  }
}

void startServer();
