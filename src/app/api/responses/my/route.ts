export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { hashDeviceId } from '@/lib/deviceHash';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';

const getMillis = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value && typeof (value as { toMillis?: () => unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    if (typeof millis === 'number') return millis;
  }
  return 0;
};

export async function GET(request: NextRequest) {
  try {
    const debugInfo = await resolveDeviceIdDebugInfo(request);
    const deviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;

    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const db = getAdminDb();
    const deviceHash = hashDeviceId(deviceId);
    const responsesCollection = db.collection('responses');

    const [hashSnapshot, legacySnapshot] = await Promise.all([
      responsesCollection.where('deviceHash', '==', deviceHash).get(),
      responsesCollection.where('deviceId', '==', deviceId).get(),
    ]);

    const seen = new Set<string>();
    const responseDocs = [...hashSnapshot.docs, ...legacySnapshot.docs].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });

    const responses = responseDocs.map((doc) => serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));

    if (responses.length === 0) {
      return attachDeviceCookie(NextResponse.json({ responses: [] }), deviceId);
    }

    const messageIds = Array.from(
      new Set(
        responses
          .map((response) => (typeof response.messageId === 'string' ? response.messageId : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const messages = new Map<string, Record<string, unknown>>();
    await Promise.all(
      messageIds.map(async (messageId) => {
        const snap = await db.collection('messages').doc(messageId).get();
        if (snap.exists) {
          messages.set(messageId, serializeDoc({ id: snap.id, ...(snap.data() as Record<string, unknown>) }));
        }
      }),
    );

    const enriched = responses
      .map((response) => ({
        ...response,
        message: response.messageId ? messages.get(response.messageId as string) ?? null : null,
      }))
      .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

    return attachDeviceCookie(NextResponse.json({ responses: enriched }), deviceId);
  } catch (error) {
    console.error('[api/responses/my] Failed to fetch user responses', error);
    return NextResponse.json({ error: 'Не удалось получить отправленные отклики.' }, { status: 500 });
  }
}
