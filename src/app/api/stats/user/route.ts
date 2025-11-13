import { NextResponse, NextRequest } from 'next/server';
import type { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { UserStats } from '@/types/firestore';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';

interface SerializedUserStats {
  deviceId: string;
  lightsGiven: number;
  lightsReceived: number;
  messagesSent: number;
  karmaScore: number;
  createdAt: number | null;
  lastActiveAt: number | null;
  lastRepliesSeenAt: number | null;
}

const serializeTimestamp = (value?: Timestamp | null): number | null => {
  if (!value) return null;
  try {
    return value.toMillis();
  } catch (error) {
    console.warn('[stats/user] Failed to serialize timestamp', error);
    return null;
  }
};

const emptyStats = (deviceId: string): SerializedUserStats => ({
  deviceId,
  lightsGiven: 0,
  lightsReceived: 0,
  messagesSent: 0,
  karmaScore: 0,
  createdAt: null,
  lastActiveAt: null,
  lastRepliesSeenAt: null,
});

export async function GET(request: NextRequest) {
  const debugInfo = await resolveDeviceIdDebugInfo(request);
  const deviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;

  if (!deviceId) {
    console.warn('[stats/user] Unable to resolve deviceId', debugInfo);
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  console.info('[stats/user] Device resolution', {
    resolvedDeviceId: deviceId,
    resolvedFrom: debugInfo.resolvedFrom,
    conflicts: debugInfo.conflicts,
    journeyId: debugInfo.journeyId,
    journeyIsAlias: debugInfo.journeyIsAlias,
  });

  try {
    const db = getAdminDb();
    const deviceHash = hashDeviceId(deviceId);

    const [hashSnapshot, legacySnapshot] = await Promise.all([
      db.collection('user_stats').doc(deviceHash).get(),
      db.collection('user_stats').doc(deviceId).get(),
    ]);

    console.info('[stats/user] Snapshot stats', {
      resolvedDeviceId: deviceId,
      hashDocExists: hashSnapshot.exists,
      legacyDocExists: legacySnapshot.exists,
    });

    const snapshot = hashSnapshot.exists ? hashSnapshot : legacySnapshot;

    if (!snapshot.exists) {
      return attachDeviceCookie(NextResponse.json({ stats: emptyStats(deviceId) }, { status: 200 }), deviceId);
    }

    const data = snapshot.data() as UserStats | (UserStats & { deviceId?: string });
    const stats: SerializedUserStats = {
      deviceId,
      lightsGiven: data.lightsGiven ?? 0,
      lightsReceived: data.lightsReceived ?? 0,
      messagesSent: data.messagesSent ?? 0,
      karmaScore: data.karmaScore ?? 0,
      createdAt: serializeTimestamp(data.createdAt),
      lastActiveAt: serializeTimestamp(data.lastActiveAt),
      lastRepliesSeenAt: serializeTimestamp(data.lastRepliesSeenAt),
    };

    return attachDeviceCookie(NextResponse.json({ stats }, { status: 200 }), deviceId);
  } catch (error) {
    console.error('[stats/user] Failed to load user stats', error);
    return NextResponse.json({ error: 'Не удалось загрузить статистику.' }, { status: 500 });
  }
}
