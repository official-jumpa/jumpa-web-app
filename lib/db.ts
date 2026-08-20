import mongoose from "mongoose";
import type { Db } from "mongodb";
import { environment } from "./environment";

const MONGO_URI = environment.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

// Global safety net: prevent Mongoose from auto-generating ObjectId _id fields.
mongoose.set("id", false);

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: mongoose.Connection | null;
}

let cached = global._mongooseConn ?? null;

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached && cached.readyState === 1) return cached;

  const conn = await mongoose.connect(MONGO_URI);

  cached = conn.connection;
  global._mongooseConn = cached;

  console.log("[DB] MongoDB connected:", cached.host);
  return cached;
}

/**
 * Returns the native MongoDB Db instance from the live MongoClient.
 * Resilient to Atlas failovers.
 */
export function getDb(): Db {
  const client = mongoose.connection.getClient();
  if (!client) {
    throw new Error(
      "[DB] MongoClient is not available. Ensure connectDB() has been awaited before calling getDb().",
    );
  }
  return client.db();
}

export { mongoose };
