import { createHash, randomBytes } from 'crypto';

import { Timestamp } from 'firebase-admin/firestore';

import { getAdminDb } from '@/lib/firebase/admin';
import { hashDeviceId } from '@/lib/deviceHash';

const MIGRATION_COLLECTION = 'device_migrations';
const TOKEN_BYTES = 12;
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const encodeToken = (buffer: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 0b11111;
      output += TOKEN_ALPHABET[index % TOKEN_ALPHABET.length];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 0b11111;
    output += TOKEN_ALPHABET[index % TOKEN_ALPHABET.length];
  }

  return output;
};

const hashToken = (token: string): string =>
  createHash('sha256').update(token.trim().toUpperCase()).digest('hex');

interface MigrationDoc {
  tokenHash: string;
  tokenPreview: string;
  fromDeviceId: string;
  fromDeviceHash: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedAt?: Timestamp | null;
  usedByDeviceId?: string | null;
  usedByDeviceHash?: string | null;
}

export interface MigrationTokenPayload {
  token: string;
  expiresAt: Date;
}

export const createMigrationTokenForDevice = async (
  deviceId: string,
): Promise<MigrationTokenPayload> => {
  const db = getAdminDb();
  const expiresAtDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const expiresAt = Timestamp.fromDate(expiresAtDate);
  const fromDeviceHash = hashDeviceId(deviceId);

  let token = '';
  let tokenHash = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    token = encodeToken(randomBytes(TOKEN_BYTES)).slice(0, 20);
    tokenHash = hashToken(token);
    const doc = await db.collection(MIGRATION_COLLECTION).doc(tokenHash).get();
    if (!doc.exists) {
      break;
    }
    token = '';
    tokenHash = '';
  }

  if (!token || !tokenHash) {
    throw new Error('Failed to generate migration token');
  }

  const now = Timestamp.now();
  const tokenPreview = token.slice(0, 6);

  await db
    .collection(MIGRATION_COLLECTION)
    .doc(tokenHash)
    .set({
      tokenHash,
      tokenPreview,
      fromDeviceId: deviceId,
      fromDeviceHash,
      createdAt: now,
      expiresAt,
      usedAt: null,
      usedByDeviceId: null,
      usedByDeviceHash: null,
    } satisfies MigrationDoc);

  return { token, expiresAt: expiresAtDate };
};

export interface MigrationApplicationResult {
  migratedDeviceId: string;
  createdAt: Date;
  expiresAt: Date;
}

export const applyMigrationToken = async (
  token: string,
  targetDeviceId: string,
): Promise<MigrationApplicationResult> => {
  const normalized = token?.trim().toUpperCase();
  if (!normalized) {
    throw new Error('migration/invalid-token');
  }

  const db = getAdminDb();
  const tokenHash = hashToken(normalized);
  const docRef = db.collection(MIGRATION_COLLECTION).doc(tokenHash);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error('migration/not-found');
    }

    const data = snap.data() as MigrationDoc;
    const now = Timestamp.now();

    if (data.usedAt) {
      throw new Error('migration/already-used');
    }

    if (data.expiresAt.toMillis() < Date.now()) {
      throw new Error('migration/expired');
    }

    tx.set(
      docRef,
      {
        usedAt: now,
        usedByDeviceId: targetDeviceId,
        usedByDeviceHash: hashDeviceId(targetDeviceId),
      },
      { merge: true },
    );

    return {
      migratedDeviceId: data.fromDeviceId,
      createdAt: data.createdAt.toDate(),
      expiresAt: data.expiresAt.toDate(),
    } satisfies MigrationApplicationResult;
  });

  return result;
};
