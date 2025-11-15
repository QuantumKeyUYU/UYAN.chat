export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import type { UserStats } from '@/types/firestore';
import { isFirestoreQuotaError } from '@/lib/firebase/errors';

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
    const statsSnap = await statsRef.doc(deviceHash).get();

    if (!statsSnap.exists) {
      return attachDeviceCookie(
        NextResponse.json({ unreadCount: 0, lastRepliesSeenAt: null }),
        deviceId,
      );
    }

    const stats = statsSnap.data() as UserStats & { lastRepliesSeenAt?: { toMillis: () => number } | null };

    const lastRepliesSeenAtValue = (() => {
      const raw = stats.lastRepliesSeenAt ?? null;
      if (!raw) return null;
      try {
        return typeof raw.toMillis === 'function' ? raw.toMillis() : null;
      } catch (error) {
        console.warn('[responses/unread] Failed to serialize lastRepliesSeenAt', error);
        return null;
      }
    })();

    return attachDeviceCookie(
      NextResponse.json({
        unreadCount: stats.repliesUnread ?? 0,
        lastRepliesSeenAt: lastRepliesSeenAtValue,
      }),
      deviceId,
    );
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return NextResponse.json(
        { code: 'FIRESTORE_QUOTA_EXCEEDED', message: 'Quota exceeded' },
        { status: 503 },
      );
    }
    console.error('[responses/unread] Failed to compute unread responses', error);
    return NextResponse.json({ error: 'Не удалось загрузить ответы.' }, { status: 500 });
  }
}
