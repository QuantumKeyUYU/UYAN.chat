import { prisma } from './db/client';

type RateLimitAction = 'message' | 'response' | 'report';

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const defaults: Record<RateLimitAction, { limit: number; windowMinutes: number }> = {
  message: { limit: 3, windowMinutes: 60 },
  response: { limit: 10, windowMinutes: 60 },
  report: { limit: 5, windowMinutes: 60 * 24 },
};

const envConfig: Record<RateLimitAction, { limit?: string; window?: string }> = {
  message: {
    limit: process.env.RATE_LIMIT_MESSAGE_PER_HOUR,
    window: process.env.RATE_LIMIT_MESSAGE_WINDOW_MINUTES,
  },
  response: {
    limit: process.env.RATE_LIMIT_RESPONSE_PER_HOUR,
    window: process.env.RATE_LIMIT_RESPONSE_WINDOW_MINUTES,
  },
  report: {
    limit: process.env.RATE_LIMIT_REPORT_PER_DAY,
    window: process.env.RATE_LIMIT_REPORT_WINDOW_MINUTES,
  },
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getConfig = (action: RateLimitAction) => {
  const defaultsForAction = defaults[action];
  const env = envConfig[action];
  return {
    limit: parseNumber(env.limit, defaultsForAction.limit),
    windowMinutes: parseNumber(env.window, defaultsForAction.windowMinutes),
  };
};

export async function checkRateLimit(action: RateLimitAction, deviceHash: string): Promise<RateLimitResult> {
  const { limit, windowMinutes } = getConfig(action);
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);

  let count = 0;
  let oldestTimestamp: Date | null = null;

  if (action === 'message') {
    count = await prisma.message.count({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
    });
    const oldest = await prisma.message.findFirst({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    oldestTimestamp = oldest?.createdAt ?? null;
  } else if (action === 'response') {
    count = await prisma.response.count({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
    });
    const oldest = await prisma.response.findFirst({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    oldestTimestamp = oldest?.createdAt ?? null;
  } else {
    count = await prisma.report.count({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
    });
    const oldest = await prisma.report.findFirst({
      where: {
        deviceHash,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    oldestTimestamp = oldest?.createdAt ?? null;
  }

  if (count < limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const retryAfter = oldestTimestamp ? Math.max(0, windowMs - (now - oldestTimestamp.getTime())) : windowMs;
  return { allowed: false, retryAfterSeconds: Math.ceil(retryAfter / 1000) };
}
