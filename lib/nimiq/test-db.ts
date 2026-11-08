import type { TestContext } from "node:test";
import mongoose from "mongoose";

/** Throwaway database for tests; never the app's MONGO_URI. */
const TEST_MONGO_URI =
  process.env.NIMIQ_TEST_MONGO_URI ??
  "mongodb://127.0.0.1:27017/jumpa_nimiq_test";

let connected = false;

/** The tests drop their database when done, so only one named as a test database is allowed. */
export function assertTestDatabase(uri: string): void {
  const name = new URL(uri).pathname.replace(/^\//, "");
  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run tests against "${name || "(default)"}": the database name must contain "test".`,
    );
  }
}

/** Connects to the test database; tests skip themselves when none is reachable. */
export async function connectTestDb(): Promise<void> {
  assertTestDatabase(TEST_MONGO_URI);
  try {
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    connected = true;
  } catch {
    connected = false;
  }
}

/** Marks the test skipped and returns true when there is no test database. */
export function skipWithoutDb(t: TestContext): boolean {
  if (connected) return false;
  t.skip("no local MongoDB");
  return true;
}

export async function dropTestDb(): Promise<void> {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  connected = false;
}
