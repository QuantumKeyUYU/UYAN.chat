import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebase/admin';
import type { UserStats } from '@/types/firestore';
import { hashDeviceId } from './deviceHash';

const COLLECTION = 'user_stats';

// Stats are keyed by a hash so that we can re-map deviceId to another identity key later
// without rewriting historical documents.
const buildInitialStats = (deviceHash: string): UserStats => {
  const now = Timestamp.now();
  return {
    deviceHash,
    lightsGiven: 0,
    lightsReceived: 0,
    messagesSent: 0,
    lastActiveAt: now,
    createdAt: now,
    karmaScore: 0,
    bannedUntil: null,
  };
};

export const getOrCreateUserStatsByHash = async (deviceHash: string) => {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(deviceHash);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const payload = buildInitialStats(deviceHash);
    await ref.set(payload);
    return payload;
  }

  return snapshot.data() as UserStats;
};

export const getOrCreateUserStats = async (deviceId: string) => {
  const deviceHash = hashDeviceId(deviceId);
  return getOrCreateUserStatsByHash(deviceHash);
};

const applyIncrements = async (
  deviceHash: string,
  increments: Partial<Record<keyof UserStats, number>>,
) => {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(deviceHash);
  const now = Timestamp.now();
  const data: Record<string, unknown> = { lastActiveAt: now };

  Object.entries(increments).forEach(([key, value]) => {
    if (typeof value === 'number') {
      data[key] = FieldValue.increment(value);
    }
  });

  await ref.set(data, { merge: true });
};

export const incrementStatsByHash = async (
  deviceHash: string,
  increments: Partial<Record<keyof UserStats, number>>,
) => {
  await getOrCreateUserStatsByHash(deviceHash);
  await applyIncrements(deviceHash, increments);
};

export const incrementStats = async (
  deviceId: string,
  increments: Partial<Record<keyof UserStats, number>>,
) => {
  const deviceHash = hashDeviceId(deviceId);
  await incrementStatsByHash(deviceHash, increments);
};
