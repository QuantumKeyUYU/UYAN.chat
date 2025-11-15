export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import { getOrCreateUserStatsByHash } from '@/lib/stats';

export async function POST(request: NextRequest) {
  try {
    const debugInfo = await resolveDeviceIdDebugInfo(request);
    const deviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;

    if (!deviceId) {
      console.warn('[responses/mark-seen] Unable to resolve deviceId', debugInfo);
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const deviceHash = hashDeviceId(deviceId);
    await getOrCreateUserStatsByHash(deviceHash);

    const db = getAdminDb();
    const statsRef = db.collection('user_stats');
    const now = Timestamp.now();

    await statsRef.doc(deviceHash).set(
      { lastRepliesSeenAt: now, repliesUnread: 0 },
      { merge: true },
    );

    return attachDeviceCookie(
      NextResponse.json({ ok: true, lastRepliesSeenAt: now.toMillis() }),
      deviceId,
    );
  } catch (error) {
    console.error('[responses/mark-seen] Failed to update lastRepliesSeenAt', error);
    return NextResponse.json({ error: 'Не удалось обновить статус ответов.' }, { status: 500 });
  }
}
