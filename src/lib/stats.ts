import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebase/admin';
import type { UserStats } from '@/types/firestore';

const COLLECTION = 'user_stats';

export const getOrCreateUserStats = async (deviceId: string) => {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(deviceId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const now = Timestamp.now();
    const payload: UserStats = {
      deviceId,
      lightsGiven: 0,
      lightsReceived: 0,
      messagesSent: 0,
      lastActiveAt: now,
      createdAt: now,
      karmaScore: 0,
    };
    await ref.set(payload);
    return payload;
  }

  return snapshot.data() as UserStats;
};

export const incrementStats = async (
  deviceId: string,
  increments: Partial<Record<keyof UserStats, number>>,
) => {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(deviceId);
  const now = Timestamp.now();
  const data: Record<string, unknown> = { lastActiveAt: now };

  Object.entries(increments).forEach(([key, value]) => {
    if (typeof value === 'number') {
      data[key] = FieldValue.increment(value);
    }
  });

  await ref.set(data, { merge: true });
};
