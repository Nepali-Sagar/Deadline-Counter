
import dotenv from "dotenv";
import mongoose from "mongoose";
import { beforeAll, afterAll } from "vitest";
import { connectDB } from "./config/db.js";

dotenv.config();

beforeAll(async () => {
  const testUri = process.env.MONGODB_TEST_URI;

  if (!testUri) {
    throw new Error("MONGODB_TEST_URI is missing from .env");
  }

  if (!testUri.includes("deadline_test")) {
    throw new Error(
      "Test database URL must contain deadline_test"
    );
  }

  await connectDB(testUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});
