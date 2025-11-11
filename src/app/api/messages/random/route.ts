export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import type { AdminMessage, AdminMessageDoc } from '@/types/firestoreAdmin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, readDeviceIdFromRequest } from '@/lib/device/server';

export async function GET(request: NextRequest) {
  try {
    const deviceId = readDeviceIdFromRequest(request);
    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const deviceHash = hashDeviceId(deviceId);

    const db = getAdminDb();
    const snapshot = await db
      .collection('messages')
      .where('status', '==', 'waiting')
      .where('moderationPassed', '==', true)
      .orderBy('createdAt', 'asc')
      .limit(25)
      .get();

    const now = Timestamp.now();
    const messages: AdminMessage[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as AdminMessageDoc;
        return { id: doc.id, ...data };
      })
      .filter((doc) => {
        const docHash = typeof doc.deviceHash === 'string' && doc.deviceHash.length > 0
          ? doc.deviceHash
          : typeof (doc as any).deviceId === 'string' && (doc as any).deviceId.length > 0
            ? hashDeviceId(String((doc as any).deviceId))
            : null;
        return !docHash || docHash !== deviceHash;
      })
      .filter((doc) => doc.expiresAt.toMillis() > now.toMillis());

    if (!messages.length) {
      return attachDeviceCookie(NextResponse.json({ message: null }, { status: 200 }), deviceId);
    }

    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];

    return attachDeviceCookie(NextResponse.json({ message: serializeDoc(message) }), deviceId);
  } catch (error) {
    console.error('Failed to fetch random message', error);
    return NextResponse.json({ error: 'Не удалось получить сообщение.' }, { status: 500 });
  }
}
