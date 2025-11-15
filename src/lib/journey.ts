import { randomBytes, createHash } from 'crypto';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DocumentReference, QuerySnapshot } from 'firebase-admin/firestore';

import { getAdminDb } from './firebase/admin';
import { hashDeviceId } from './deviceHash';
import type { UserStats } from '@/types/firestore';

const JOURNEY_COLLECTION = 'portable_journeys';
const JOURNEY_DEVICE_COLLECTION = 'portable_journey_devices';
const JOURNEY_KEY_COLLECTION = 'portable_journey_keys';

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_GROUP_LENGTH = 4;
const KEY_GROUPS = 6;

const encodeBase32 = (buffer: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 0b11111;
      output += KEY_ALPHABET[index];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 0b11111;
    output += KEY_ALPHABET[index];
  }

  return output;
};

export const generateJourneyKey = (): string => {
  const raw = encodeBase32(randomBytes(20)).slice(0, KEY_GROUP_LENGTH * KEY_GROUPS);
  const groups: string[] = [];
  for (let index = 0; index < KEY_GROUPS; index += 1) {
    const start = index * KEY_GROUP_LENGTH;
    groups.push(raw.slice(start, start + KEY_GROUP_LENGTH));
  }
  return groups.join('-');
};

export const hashJourneyKey = (key: string): string =>
  createHash('sha256').update(key.trim().toUpperCase()).digest('hex');

interface JourneyDoc {
  journeyId: string;
  primaryDeviceId: string;
  primaryDeviceHash: string;
  deviceIds: string[];
  deviceHashes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastKeyPreview?: string | null;
}

interface JourneyDeviceDoc {
  journeyId: string;
  primaryDeviceId: string;
  primaryDeviceHash: string;
  attachedAt: Timestamp;
  lastSeenAt: Timestamp;
}

interface JourneyKeyDoc {
  journeyId: string;
  createdAt: Timestamp;
  keyPreview?: string | null;
}

export interface JourneySnapshot {
  journeyId: string;
  primaryDeviceId: string;
  primaryDeviceHash: string;
  deviceIds: string[];
  deviceHashes: string[];
  lastKeyPreview: string | null;
}

export interface JourneyStatusSnapshot extends JourneySnapshot {
  attachedDevices: number;
}

const toJourneySnapshot = (doc: JourneyDoc): JourneySnapshot => ({
  journeyId: doc.journeyId,
  primaryDeviceId: doc.primaryDeviceId,
  primaryDeviceHash: doc.primaryDeviceHash,
  deviceIds: doc.deviceIds ?? [],
  deviceHashes: doc.deviceHashes ?? [],
  lastKeyPreview: doc.lastKeyPreview ?? null,
});

const ensureJourneyDocument = async (
  deviceId: string,
): Promise<JourneySnapshot> => {
  const db = getAdminDb();
  const deviceHash = hashDeviceId(deviceId);
  const journeyId = deviceHash;
  const now = Timestamp.now();

  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(journeyId);
  const deviceRef = db.collection(JOURNEY_DEVICE_COLLECTION).doc(deviceHash);

  await db.runTransaction(async (tx) => {
    const [journeySnap, deviceSnap] = await Promise.all([tx.get(journeyRef), tx.get(deviceRef)]);

    if (!journeySnap.exists) {
      tx.set(journeyRef, {
        journeyId,
        primaryDeviceId: deviceId,
        primaryDeviceHash: deviceHash,
        deviceIds: [deviceId],
        deviceHashes: [deviceHash],
        createdAt: now,
        updatedAt: now,
        lastKeyPreview: null,
      } satisfies JourneyDoc);
    } else {
      tx.set(
        journeyRef,
        {
          primaryDeviceId: journeySnap.get('primaryDeviceId') ?? deviceId,
          primaryDeviceHash: journeySnap.get('primaryDeviceHash') ?? deviceHash,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    if (!deviceSnap.exists) {
      tx.set(deviceRef, {
        journeyId,
        primaryDeviceId: deviceId,
        primaryDeviceHash: deviceHash,
        attachedAt: now,
        lastSeenAt: now,
      } satisfies JourneyDeviceDoc);
    } else {
      tx.set(deviceRef, { lastSeenAt: now }, { merge: true });
    }
  });

  const snapshot = await journeyRef.get();
  if (!snapshot.exists) {
    throw new Error('Failed to initialize journey');
  }

  return toJourneySnapshot(snapshot.data() as JourneyDoc);
};

export const ensureJourneyForDevice = async (deviceId: string): Promise<JourneySnapshot> => {
  const db = getAdminDb();
  const deviceHash = hashDeviceId(deviceId);
  const deviceRef = db.collection(JOURNEY_DEVICE_COLLECTION).doc(deviceHash);
  const deviceSnap = await deviceRef.get();

  if (!deviceSnap.exists) {
    return ensureJourneyDocument(deviceId);
  }

  const journeyId = (deviceSnap.data() as JourneyDeviceDoc).journeyId;
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(journeyId);
  const journeySnap = await journeyRef.get();

  if (!journeySnap.exists) {
    return ensureJourneyDocument(deviceId);
  }

  return toJourneySnapshot(journeySnap.data() as JourneyDoc);
};

export const createJourneyKeyForDevice = async (
  deviceId: string,
): Promise<{ identityKey: string; journey: JourneySnapshot }> => {
  const journey = await ensureJourneyForDevice(deviceId);
  const identityKey = generateJourneyKey();
  const identityKeyHash = hashJourneyKey(identityKey);
  const keyPreview = identityKey.slice(0, KEY_GROUP_LENGTH * 2);
  const db = getAdminDb();
  const now = Timestamp.now();

  const keyRef = db.collection(JOURNEY_KEY_COLLECTION).doc(identityKeyHash);
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(journey.journeyId);

  await db.runTransaction(async (tx) => {
    tx.set(
      keyRef,
      {
        journeyId: journey.journeyId,
        createdAt: now,
        keyPreview,
      } satisfies JourneyKeyDoc,
      { merge: true },
    );

    tx.set(
      journeyRef,
      {
        lastKeyPreview: keyPreview,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  return { identityKey, journey };
};

export interface JourneyAttachmentResult {
  journey: JourneySnapshot;
  alreadyAttached: boolean;
  attachedDeviceId: string;
  attachedDeviceHash: string;
}

export const attachDeviceToJourney = async (
  identityKey: string,
  deviceId: string,
): Promise<JourneyAttachmentResult> => {
  const normalizedKey = identityKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!normalizedKey || normalizedKey.length < KEY_GROUP_LENGTH) {
    throw new Error('Invalid identity key');
  }

  const identityKeyHash = hashJourneyKey(identityKey);
  const db = getAdminDb();
  const keyRef = db.collection(JOURNEY_KEY_COLLECTION).doc(identityKeyHash);
  const keySnap = await keyRef.get();

  if (!keySnap.exists) {
    throw new Error('Identity key not found');
  }

  const { journeyId } = keySnap.data() as JourneyKeyDoc;
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(journeyId);
  const journeySnap = await journeyRef.get();
  if (!journeySnap.exists) {
    throw new Error('Journey not found');
  }

  const journey = toJourneySnapshot(journeySnap.data() as JourneyDoc);
  const deviceHash = hashDeviceId(deviceId);
  const deviceRef = db.collection(JOURNEY_DEVICE_COLLECTION).doc(deviceHash);
  const now = Timestamp.now();

  let alreadyAttached = false;
  await db.runTransaction(async (tx) => {
    const deviceDoc = await tx.get(deviceRef);
    const attached = deviceDoc.exists
      ? ((deviceDoc.data() as JourneyDeviceDoc).journeyId ?? null) === journeyId
      : false;

    alreadyAttached = attached;

    if (attached) {
      tx.set(deviceRef, { lastSeenAt: now }, { merge: true });
      return;
    }

    const nextDeviceIds = new Set(journey.deviceIds);
    nextDeviceIds.add(deviceId);
    const nextDeviceHashes = new Set(journey.deviceHashes);
    nextDeviceHashes.add(deviceHash);

    tx.set(
      journeyRef,
      {
        deviceIds: Array.from(nextDeviceIds),
        deviceHashes: Array.from(nextDeviceHashes),
        updatedAt: now,
      },
      { merge: true },
    );

    tx.set(
      deviceRef,
      {
        journeyId,
        primaryDeviceId: journey.primaryDeviceId,
        primaryDeviceHash: journey.primaryDeviceHash,
        attachedAt: now,
        lastSeenAt: now,
      } satisfies JourneyDeviceDoc,
      { merge: true },
    );
  });

  const refreshedJourneySnap = await journeyRef.get();
  const refreshedJourney = toJourneySnapshot(refreshedJourneySnap.data() as JourneyDoc);

  return {
    journey: refreshedJourney,
    alreadyAttached,
    attachedDeviceId: deviceId,
    attachedDeviceHash: deviceHash,
  };
};

export interface JourneyResolution {
  effectiveDeviceId: string;
  primaryDeviceId: string;
  primaryDeviceHash: string;
  journeyId: string;
  isAlias: boolean;
  attachedDevices: string[];
  attachedDeviceHashes: string[];
}

export const resolveJourneyForDevice = async (
  deviceId: string,
): Promise<JourneyResolution | null> => {
  const db = getAdminDb();
  const deviceHash = hashDeviceId(deviceId);
  const deviceRef = db.collection(JOURNEY_DEVICE_COLLECTION).doc(deviceHash);
  const deviceSnap = await deviceRef.get();

  if (!deviceSnap.exists) {
    return null;
  }

  const deviceData = deviceSnap.data() as JourneyDeviceDoc;
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(deviceData.journeyId);
  const journeySnap = await journeyRef.get();
  if (!journeySnap.exists) {
    return null;
  }

  const journey = toJourneySnapshot(journeySnap.data() as JourneyDoc);
  const effectiveDeviceId = journey.primaryDeviceId;

  return {
    effectiveDeviceId,
    primaryDeviceId: journey.primaryDeviceId,
    primaryDeviceHash: journey.primaryDeviceHash,
    journeyId: journey.journeyId,
    isAlias: effectiveDeviceId !== deviceId,
    attachedDevices: journey.deviceIds,
    attachedDeviceHashes: journey.deviceHashes,
  };
};

export interface JourneyDebugSnapshot extends JourneyResolution {
  lastKeyPreview: string | null;
}

export const getJourneyDebugSnapshot = async (
  deviceId: string,
): Promise<JourneyDebugSnapshot | null> => {
  const resolution = await resolveJourneyForDevice(deviceId);
  if (!resolution) {
    return null;
  }

  const db = getAdminDb();
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(resolution.journeyId);
  const journeySnap = await journeyRef.get();
  if (!journeySnap.exists) {
    return null;
  }

  const journey = journeySnap.data() as JourneyDoc;
  return {
    ...resolution,
    lastKeyPreview: journey.lastKeyPreview ?? null,
  };
};

export interface JourneyStatus {
  journeyId: string;
  effectiveDeviceId: string;
  isAttached: boolean;
  isPrimary: boolean;
  attachedDevices: number;
  attachedDeviceIds: string[];
  attachedDeviceHashes: string[];
  lastKeyPreview: string | null;
  localHasHistory: boolean;
  primaryDeviceId: string;
}

const hasMeaningfulStats = (stats: UserStats | null): boolean => {
  if (!stats) return false;
  return (
    stats.messagesSent > 0 ||
    stats.lightsGiven > 0 ||
    stats.lightsReceived > 0 ||
    (stats.karmaScore ?? 0) > 0 ||
    (stats.repliesUnread ?? 0) > 0
  );
};

export const getJourneyStatus = async (deviceId: string): Promise<JourneyStatus> => {
  const journey = await ensureJourneyForDevice(deviceId);
  const resolution = await resolveJourneyForDevice(deviceId);
  const effectiveDeviceId = resolution?.effectiveDeviceId ?? journey.primaryDeviceId;
  const isAlias = resolution?.isAlias ?? false;
  const attachedDeviceIds = resolution?.attachedDevices ?? journey.deviceIds;
  const attachedDeviceHashes = resolution?.attachedDeviceHashes ?? journey.deviceHashes;

  const db = getAdminDb();
  const statsRef = db.collection('user_stats');
  const deviceHash = hashDeviceId(deviceId);
  const statsSnap = await statsRef.doc(deviceHash).get();
  const stats = statsSnap.exists ? (statsSnap.data() as UserStats) : null;

  return {
    journeyId: journey.journeyId,
    effectiveDeviceId,
    isAttached: !isAlias || effectiveDeviceId === deviceId ? true : resolution !== null,
    isPrimary: effectiveDeviceId === deviceId,
    attachedDevices: attachedDeviceIds.length,
    attachedDeviceIds,
    attachedDeviceHashes,
    lastKeyPreview: journey.lastKeyPreview ?? null,
    localHasHistory: hasMeaningfulStats(stats),
    primaryDeviceId: journey.primaryDeviceId,
  };
};

const updateDocuments = async <T>(
  snapshots: QuerySnapshot<T>,
  updater: (ref: DocumentReference<T>) => Promise<void>,
) => {
  for (const doc of snapshots.docs) {
    await updater(doc.ref);
  }
};

export interface MergeResult {
  messagesUpdated: number;
  responsesUpdated: number;
  statsMerged: boolean;
}

export const mergeDevicePath = async (
  sourceDeviceId: string,
  targetDeviceId: string,
): Promise<MergeResult> => {
  if (sourceDeviceId === targetDeviceId) {
    return { messagesUpdated: 0, responsesUpdated: 0, statsMerged: false };
  }

  const db = getAdminDb();
  const sourceHash = hashDeviceId(sourceDeviceId);
  const targetHash = hashDeviceId(targetDeviceId);

  const messagesCollection = db.collection('messages');
  const [hashMessages, legacyMessages] = await Promise.all([
    messagesCollection.where('deviceHash', '==', sourceHash).get(),
    messagesCollection.where('deviceId', '==', sourceDeviceId).get(),
  ]);

  let messagesUpdated = 0;
  const messageUpdates = new Set<string>();

  await updateDocuments(hashMessages, async (ref) => {
    messagesUpdated += 1;
    messageUpdates.add(ref.id);
    await ref.set({ deviceHash: targetHash }, { merge: true });
  });

  await updateDocuments(legacyMessages, async (ref) => {
    if (messageUpdates.has(ref.id)) return;
    messagesUpdated += 1;
    await ref.set({ deviceId: targetDeviceId, deviceHash: targetHash }, { merge: true });
  });

  const responsesCollection = db.collection('responses');
  const [hashResponses, legacyResponses] = await Promise.all([
    responsesCollection.where('deviceHash', '==', sourceHash).get(),
    responsesCollection.where('deviceId', '==', sourceDeviceId).get(),
  ]);

  let responsesUpdated = 0;
  const responseUpdates = new Set<string>();

  await updateDocuments(hashResponses, async (ref) => {
    responsesUpdated += 1;
    responseUpdates.add(ref.id);
    await ref.set({ deviceHash: targetHash }, { merge: true });
  });

  await updateDocuments(legacyResponses, async (ref) => {
    if (responseUpdates.has(ref.id)) return;
    responsesUpdated += 1;
    await ref.set({ deviceId: targetDeviceId, deviceHash: targetHash }, { merge: true });
  });

  const statsRef = db.collection('user_stats');
  const [sourceStatsSnap, targetStatsSnap] = await Promise.all([
    statsRef.doc(sourceHash).get(),
    statsRef.doc(targetHash).get(),
  ]);

  let statsMerged = false;

  if (sourceStatsSnap.exists) {
    const sourceStats = sourceStatsSnap.data() as UserStats;
    const targetStats = targetStatsSnap.exists
      ? ((targetStatsSnap.data() as UserStats) ?? null)
      : null;

    const createdAt = targetStats
      ? sourceStats.createdAt.toMillis() < targetStats.createdAt.toMillis()
        ? sourceStats.createdAt
        : targetStats.createdAt
      : sourceStats.createdAt;

    const lastActiveAt = targetStats
      ? sourceStats.lastActiveAt.toMillis() > targetStats.lastActiveAt.toMillis()
        ? sourceStats.lastActiveAt
        : targetStats.lastActiveAt
      : sourceStats.lastActiveAt;

    const sourceLastRepliesSeenAt = sourceStats.lastRepliesSeenAt ?? null;
    const targetLastRepliesSeenAt = targetStats?.lastRepliesSeenAt ?? null;
    const lastRepliesSeenAt =
      sourceLastRepliesSeenAt && targetLastRepliesSeenAt
        ? sourceLastRepliesSeenAt.toMillis() > targetLastRepliesSeenAt.toMillis()
          ? sourceLastRepliesSeenAt
          : targetLastRepliesSeenAt
        : sourceLastRepliesSeenAt ?? targetLastRepliesSeenAt ?? null;

    await statsRef.doc(targetHash).set(
      {
        deviceHash: targetHash,
        lightsGiven: FieldValue.increment(sourceStats.lightsGiven ?? 0),
        lightsReceived: FieldValue.increment(sourceStats.lightsReceived ?? 0),
        messagesSent: FieldValue.increment(sourceStats.messagesSent ?? 0),
        karmaScore: FieldValue.increment(sourceStats.karmaScore ?? 0),
        repliesUnread: FieldValue.increment(sourceStats.repliesUnread ?? 0),
        createdAt,
        lastActiveAt,
        lastRepliesSeenAt,
      },
      { merge: true },
    );

    await statsRef.doc(sourceHash).delete();
    statsMerged = true;
  }

  return { messagesUpdated, responsesUpdated, statsMerged };
};

export const detachDeviceFromJourney = async (deviceId: string): Promise<void> => {
  const db = getAdminDb();
  const deviceHash = hashDeviceId(deviceId);
  const deviceRef = db.collection(JOURNEY_DEVICE_COLLECTION).doc(deviceHash);
  const deviceSnap = await deviceRef.get();
  if (!deviceSnap.exists) {
    return;
  }

  const deviceData = deviceSnap.data() as JourneyDeviceDoc;
  const journeyRef = db.collection(JOURNEY_COLLECTION).doc(deviceData.journeyId);
  const journeySnap = await journeyRef.get();

  await deviceRef.delete();

  if (!journeySnap.exists) {
    return;
  }

  const journey = journeySnap.data() as JourneyDoc;
  const nextDeviceIds = journey.deviceIds.filter((value) => value !== deviceId);
  const nextDeviceHashes = journey.deviceHashes.filter((value) => value !== deviceHash);

  if (nextDeviceIds.length === 0) {
    await journeyRef.delete();
    return;
  }

  const update: Partial<JourneyDoc> = {
    deviceIds: nextDeviceIds,
    deviceHashes: nextDeviceHashes,
    updatedAt: Timestamp.now(),
  };

  if (journey.primaryDeviceId === deviceId) {
    update.primaryDeviceId = nextDeviceIds[0];
    update.primaryDeviceHash = nextDeviceHashes[0] ?? hashDeviceId(nextDeviceIds[0]);
  }

  await journeyRef.set(update, { merge: true });
};

