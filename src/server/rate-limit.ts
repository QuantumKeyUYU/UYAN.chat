import { prisma } from '@/server/db/client';

const MINUTE_IN_MS = 60 * 1000;

const parsePositiveInt = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
};

const resolveNumber = (keys: string[], fallback: number) => {
  for (const key of keys) {
    const parsed = parsePositiveInt(process.env[key]);
    if (parsed !== null) {
      return parsed;
    }
  }
  return fallback;
};

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  table: 'message' | 'response';
}

const RATE_LIMITS: Record<'message' | 'response' | 'report', RateLimitConfig> = {
  message: {
    limit: resolveNumber(['RATE_LIMIT_MESSAGE_MAX', 'RATE_LIMIT_MESSAGE_PER_HOUR'], 3),
    windowMs:
      resolveNumber(['RATE_LIMIT_MESSAGE_WINDOW_MINUTES'], 60) * MINUTE_IN_MS,
    table: 'message',
  },
  response: {
    limit: resolveNumber(['RATE_LIMIT_RESPONSE_MAX', 'RATE_LIMIT_RESPONSE_PER_HOUR'], 10),
    windowMs:
      resolveNumber(['RATE_LIMIT_RESPONSE_WINDOW_MINUTES'], 60) * MINUTE_IN_MS,
    table: 'response',
  },
  report: {
    limit: resolveNumber(['RATE_LIMIT_REPORT_MAX', 'RATE_LIMIT_REPORT_PER_DAY'], 5),
    windowMs:
      resolveNumber(['RATE_LIMIT_REPORT_WINDOW_MINUTES'], 24 * 60) * MINUTE_IN_MS,
    table: 'response',
  },
};

const calculateRetryAfterSeconds = (oldest: Date | null, windowMs: number) => {
  if (!oldest) {
    return Math.ceil(windowMs / 1000);
  }
  const elapsed = Date.now() - oldest.getTime();
  const remaining = Math.max(windowMs - elapsed, 0);
  return Math.ceil(remaining / 1000);
};

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function checkRateLimit({
  deviceHash,
  config,
  errorMessage,
}: {
  deviceHash: string;
  config: RateLimitConfig;
  errorMessage: string;
}) {
  const windowStart = new Date(Date.now() - config.windowMs);

  const aggregate =
    config.table === 'message'
      ? await prisma.message.aggregate({
          where: { deviceHash, createdAt: { gte: windowStart } },
          _count: { _all: true },
          _min: { createdAt: true },
        })
      : await prisma.response.aggregate({
          where: { deviceHash, createdAt: { gte: windowStart } },
          _count: { _all: true },
          _min: { createdAt: true },
        });

  const count = aggregate._count?._all ?? 0;
  if (count >= config.limit) {
    const oldest = aggregate._min?.createdAt ?? null;
    throw new RateLimitError(errorMessage, calculateRetryAfterSeconds(oldest, config.windowMs));
  }
}

export function checkMessageRateLimit(deviceHash: string) {
  return checkRateLimit({
    deviceHash,
    config: RATE_LIMITS.message,
    errorMessage:
      'Ты сегодня уже поделился несколькими историями. Давай сделаем паузу и вернёмся чуть позже.',
  });
}

export function checkResponseRateLimit(deviceHash: string) {
  return checkRateLimit({
    deviceHash,
    config: RATE_LIMITS.response,
    errorMessage:
      'Сегодня ты уже успел поддержать много людей. Давай дадим себе отдых и вернёмся позднее.',
  });
}

export function checkReportRateLimit(deviceHash: string) {
  return checkRateLimit({
    deviceHash,
    config: RATE_LIMITS.report,
    errorMessage:
      'Жалоб сегодня уже достаточно. Сделай паузу — мы разберёмся и вернёмся с ответом.',
  });
}
