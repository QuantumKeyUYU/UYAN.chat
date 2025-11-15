export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { hashDeviceId } from '@/lib/deviceHash';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import { isFirestoreQuotaError } from '@/lib/firebase/errors';

type SerializedFirestoreDoc = Record<string, unknown> & { id: string };

type UserResponseSummary = SerializedFirestoreDoc & {
  createdAt: number;
  messageId?: string;
  message: SerializedFirestoreDoc | null;
};

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

    let primarySnapshot = await responsesCollection.where('deviceHash', '==', deviceHash).get();

    let usedFallback = false;
    if (primarySnapshot.empty && deviceId) {
      usedFallback = true;
      primarySnapshot = await responsesCollection.where('deviceId', '==', deviceId).get();
    }

    console.info('[api/responses/my] Snapshot stats', {
      resolvedDeviceId: deviceId,
      docs: primarySnapshot.size,
      usedFallback,
    });

    const responses: SerializedFirestoreDoc[] = primarySnapshot.docs.map((doc) => {
      const raw = serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
      const normalized: SerializedFirestoreDoc = { ...raw, id: doc.id };
      return normalized;
    });

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

    const messages = new Map<string, SerializedFirestoreDoc>();
    const chunkSize = 10;
    const messageSnapshots = await Promise.all(
      Array.from({ length: Math.ceil(messageIds.length / chunkSize) }, (_, index) => {
        const start = index * chunkSize;
        const ids = messageIds.slice(start, start + chunkSize);
        if (ids.length === 0) {
          return Promise.resolve(null);
        }
        return db.collection('messages').where('__name__', 'in', ids).get();
      }),
    );

    messageSnapshots.forEach((snapshot) => {
      if (!snapshot) return;
      snapshot.docs.forEach((doc) => {
        const serialized = serializeDoc({
          id: doc.id,
          ...(doc.data() as Record<string, unknown>),
        });
        const normalized: SerializedFirestoreDoc = { ...serialized, id: doc.id };
        messages.set(doc.id, normalized);
      });
    });

    const enriched: UserResponseSummary[] = responses
      .map((response) => {
        const messageId = typeof response.messageId === 'string' ? response.messageId : undefined;
        const createdAt = getMillis(response.createdAt);
        return {
          ...response,
          createdAt,
          messageId,
          message: messageId ? messages.get(messageId) ?? null : null,
        } satisfies UserResponseSummary;
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return attachDeviceCookie(NextResponse.json({ responses: enriched }), deviceId);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return NextResponse.json(
        { code: 'FIRESTORE_QUOTA_EXCEEDED', message: 'Quota exceeded' },
        { status: 503 },
      );
    }
    console.error('[api/responses/my] Failed to fetch user responses', error);
    return NextResponse.json({ error: 'Не удалось получить отправленные ответы.' }, { status: 500 });
  }
}
