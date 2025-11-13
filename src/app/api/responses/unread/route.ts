export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import type { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import type { UserStats } from '@/types/firestore';

const getMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    if (typeof millis === 'number') return millis;
  }
  return 0;
};

const resolveLastRepliesSeenAt = (stats: UserStats | (UserStats & { lastRepliesSeenAt?: Timestamp | null }) | null) => {
  const value = stats?.lastRepliesSeenAt ?? null;
  if (!value) return null;
  try {
    return value.toMillis();
  } catch (error) {
    console.warn('[responses/unread] Failed to serialize lastRepliesSeenAt', error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const debugInfo = await resolveDeviceIdDebugInfo(request);
    const deviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;

    if (!deviceId) {
      console.warn('[responses/unread] Unable to resolve deviceId', debugInfo);
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const db = getAdminDb();
    const deviceHash = hashDeviceId(deviceId);

    const statsRef = db.collection('user_stats');
    const [hashStatsSnap, legacyStatsSnap] = await Promise.all([
      statsRef.doc(deviceHash).get(),
      statsRef.doc(deviceId).get(),
    ]);

    const statsSnapshot = hashStatsSnap.exists ? hashStatsSnap : legacyStatsSnap;
    const statsData = statsSnapshot.exists
      ? ((statsSnapshot.data() as UserStats & { lastRepliesSeenAt?: Timestamp | null }) ?? null)
      : null;

    const lastRepliesSeenAt = resolveLastRepliesSeenAt(statsData);
    const threshold = typeof lastRepliesSeenAt === 'number' ? lastRepliesSeenAt : Number.NEGATIVE_INFINITY;

    const messagesCollection = db.collection('messages');
    const [hashMessagesSnap, legacyMessagesSnap] = await Promise.all([
      messagesCollection.where('deviceHash', '==', deviceHash).get(),
      messagesCollection.where('deviceId', '==', deviceId).get(),
    ]);

    const seenMessageIds = new Set<string>();
    const messageDocs = [...hashMessagesSnap.docs, ...legacyMessagesSnap.docs].filter((doc) => {
      if (seenMessageIds.has(doc.id)) return false;
      seenMessageIds.add(doc.id);
      return true;
    });

    if (messageDocs.length === 0) {
      return attachDeviceCookie(
        NextResponse.json({ unreadCount: 0, lastRepliesSeenAt }),
        deviceId,
      );
    }

    const responsesCollection = db.collection('responses');
    const snapshots = await Promise.all(
      messageDocs.map((message) => responsesCollection.where('messageId', '==', message.id).get()),
    );

    let unreadCount = 0;
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as { createdAt?: unknown };
        const createdAt = getMillis(data.createdAt);
        if (createdAt > threshold) {
          unreadCount += 1;
        }
      });
    });

    return attachDeviceCookie(
      NextResponse.json({ unreadCount, lastRepliesSeenAt }),
      deviceId,
    );
  } catch (error) {
    console.error('[responses/unread] Failed to compute unread responses', error);
    return NextResponse.json({ error: 'Не удалось загрузить ответы.' }, { status: 500 });
  }
}
