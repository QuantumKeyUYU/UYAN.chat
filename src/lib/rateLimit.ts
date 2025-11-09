import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebase';

export type RateAction = 'message' | 'response' | 'report';

interface RateLimitDoc {
  deviceId: string;
  action: RateAction;
  count: number;
  windowStart: Timestamp;
}

export const checkRateLimit = async (
  deviceId: string,
  action: RateAction,
  limit: number,
  windowMs: number,
): Promise<boolean> => {
  const db = getAdminDb();
  const docId = `${deviceId}_${action}`;
  const docRef = db.collection('rate_limits').doc(docId);
  const now = Date.now();
  const nowTimestamp = Timestamp.fromMillis(now);

  let allowed = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      const doc: RateLimitDoc = {
        deviceId,
        action,
        count: 1,
        windowStart: nowTimestamp,
      };
      transaction.set(docRef, doc);
      allowed = true;
      return;
    }

    const data = snapshot.data() as RateLimitDoc;
    const windowStartMs = data.windowStart?.toMillis?.() ?? 0;

    if (now - windowStartMs > windowMs) {
      transaction.set(docRef, {
        deviceId,
        action,
        count: 1,
        windowStart: nowTimestamp,
      });
      allowed = true;
      return;
    }

    const currentCount = data.count ?? 0;
    if (currentCount >= limit) {
      allowed = false;
      return;
    }

    transaction.update(docRef, {
      count: currentCount + 1,
    });
    allowed = true;
  });

  return allowed;
};
