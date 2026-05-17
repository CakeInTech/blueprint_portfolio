import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "30 m"),
      analytics: true,
      prefix: "aura:forms",
    })
  : null;

export async function checkFormRateLimit(identifier: string) {
  if (!limiter) {
    return { success: true, remaining: 1, reset: Date.now() };
  }

  return limiter.limit(identifier);
}
