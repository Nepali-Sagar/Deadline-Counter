
import mongoose from "mongoose";

export async function connectDB(
  uri: string | undefined = process.env.MONGODB_URI
): Promise<void> {
  if (!uri) {
    throw new Error("Database connection URI is missing");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected successfully");
}
