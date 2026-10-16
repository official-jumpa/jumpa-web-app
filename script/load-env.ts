// Loads .env.local before .env, as `next dev` does. Values already set (e.g. by the host) win.
// Import it first: lib/environment.ts reads process.env when it loads.
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
