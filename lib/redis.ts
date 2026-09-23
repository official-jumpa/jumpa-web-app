import Redis, { type RedisOptions } from "ioredis";

declare global {
  // Prevent multiple Redis instances during Next.js hot-reload in development
  var __redisClient: Redis | undefined;
}

function createRedisClient(): Redis | null {
  const connectionUrl =
    process.env.REDIS_API_KEY;

  if (!connectionUrl) {
    console.warn("[Redis] No REDIS_API_KEY configured");
    return null;
  }

  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) {
          console.warn("[Redis] Exceeded max connection retries; failing open");
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    };

    const client = new Redis(connectionUrl, options);

    client.on("error", (err) => {
      // Log connection error without crashing the Node.js process
      console.warn("[Redis] Client error:", err.message);
    });

    client.on("connect", () => {
      console.log("[Redis] Connected to Redis server");
    });

    return client;
  } catch (err: any) {
    console.error("[Redis] Initialization error:", err.message);
    return null;
  }
}

export function getRedisClient(): Redis | null {
  if (!globalThis.__redisClient) {
    globalThis.__redisClient = createRedisClient() ?? undefined;
  }
  return globalThis.__redisClient ?? null;
}

export default getRedisClient;
