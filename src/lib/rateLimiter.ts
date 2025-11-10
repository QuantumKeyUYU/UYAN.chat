import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebase/admin';
import { hashDeviceId } from './deviceHash';

type RateLimitAction = 'message' | 'response' | 'report';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  message: { limit: 3, windowMs: 60 * 60 * 1000 },
  response: { limit: 10, windowMs: 60 * 60 * 1000 },
  report: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
};

interface RateLimitDoc {
  deviceHash: string;
  action: RateLimitAction;
  count: number;
  windowStart: Timestamp;
  lastRequest: Timestamp;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

interface CheckRateLimitParams {
  deviceId: string;
  action: RateLimitAction;
}

const calculateRetryAfter = (windowStart: Timestamp, windowMs: number): number => {
  const windowEnd = windowStart.toMillis() + windowMs;
  const retryAfterMs = Math.max(windowEnd - Date.now(), 0);
  return Math.ceil(retryAfterMs / 1000);
};

export const checkRateLimit = async ({
  deviceId,
  action,
}: CheckRateLimitParams): Promise<RateLimitResult> => {
  const config = RATE_LIMITS[action];
  if (!config) {
    throw new Error(`Unknown rate limit action: ${action}`);
  }

  const deviceHash = hashDeviceId(deviceId);
  const db = getAdminDb();
  const docId = `${deviceHash}_${action}`;
  const docRef = db.collection('rate_limits').doc(docId);
  const now = Timestamp.now();

  let result: RateLimitResult = { allowed: false };

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      const doc: RateLimitDoc = {
        deviceHash,
        action,
        count: 1,
        windowStart: now,
        lastRequest: now,
      };
      transaction.set(docRef, doc);
      result = { allowed: true };
      return;
    }

    const data = snapshot.data() as RateLimitDoc;
    const windowStart = data.windowStart;
    const count = data.count ?? 0;
    const windowStartMs = windowStart?.toMillis?.() ?? 0;

    if (!windowStart || Date.now() - windowStartMs >= config.windowMs) {
      transaction.set(docRef, {
        deviceHash,
        action,
        count: 1,
        windowStart: now,
        lastRequest: now,
      });
      result = { allowed: true };
      return;
    }

    if (count >= config.limit) {
      result = {
        allowed: false,
        retryAfterSeconds: calculateRetryAfter(windowStart, config.windowMs),
      };
      transaction.update(docRef, {
        lastRequest: now,
      });
      return;
    }

    transaction.update(docRef, {
      count: count + 1,
      lastRequest: now,
    });
    result = { allowed: true };
  });

  return result;
};
