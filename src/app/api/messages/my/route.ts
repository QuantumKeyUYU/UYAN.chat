export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import type { AdminMessageDoc } from '@/types/firestoreAdmin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import { isFirestoreQuotaError } from '@/lib/firebase/errors';

export async function GET(request: NextRequest) {
  try {
    const debugInfo = await resolveDeviceIdDebugInfo(request);
    const deviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;
    if (!deviceId) {
      console.warn('[api/messages/my] Unable to resolve deviceId', debugInfo);
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    console.info('[api/messages/my] Device resolution', {
      resolvedDeviceId: deviceId,
      resolvedFrom: debugInfo.resolvedFrom,
      conflicts: debugInfo.conflicts,
      journeyId: debugInfo.journeyId,
      journeyIsAlias: debugInfo.journeyIsAlias,
    });

    const db = getAdminDb();
    const deviceHash = hashDeviceId(deviceId);

    const collection = db.collection('messages');
    let primarySnapshot = await collection.where('deviceHash', '==', deviceHash).get();

    let usedFallback = false;
    if (primarySnapshot.empty && deviceId) {
      usedFallback = true;
      primarySnapshot = await collection.where('deviceId', '==', deviceId).get();
    }

    console.info('[api/messages/my] Snapshot stats', {
      resolvedDeviceId: deviceId,
      docs: primarySnapshot.size,
      usedFallback,
    });

    const getCreatedAtValue = (doc: unknown): number => {
      const value = (doc as { createdAt?: unknown })?.createdAt;
      if (typeof value === 'number') return value;
      if (value && typeof (value as { toMillis?: () => unknown }).toMillis === 'function') {
        const millis = (value as { toMillis: () => unknown }).toMillis();
        if (typeof millis === 'number') return millis;
      }
      return 0;
    };

    const messages = primarySnapshot.docs.map((doc) => {
      const data = doc.data() as AdminMessageDoc;
      return serializeDoc({ id: doc.id, ...data });
    });

    messages.sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));

    if (messages.length === 0) {
      return attachDeviceCookie(NextResponse.json({ messages: [] }), deviceId);
    }

    const responsesCollection = db.collection('responses');
    const messageIds = messages
      .map((message) => message.id)
      .filter((id): id is string => typeof id === 'string');

    const chunkSize = 10;
    const responseSnapshots = await Promise.all(
      Array.from({ length: Math.ceil(messageIds.length / chunkSize) }, (_, index) => {
        const start = index * chunkSize;
        const ids = messageIds.slice(start, start + chunkSize);
        if (ids.length === 0) {
          return Promise.resolve(null);
        }
        return responsesCollection.where('messageId', 'in', ids).get();
      }),
    );

    const responsesByMessageId = new Map<string, Record<string, unknown>[]>();
    responseSnapshots.forEach((snapshot) => {
      if (!snapshot) return;
      snapshot.docs.forEach((doc) => {
        const data = serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
        const messageId = data.messageId as string | undefined;
        if (!messageId) return;
        const bucket = responsesByMessageId.get(messageId) ?? [];
        bucket.push(data);
        responsesByMessageId.set(messageId, bucket);
      });
    });

    responsesByMessageId.forEach((bucket, key) => {
      bucket.sort((a, b) => getCreatedAtValue(a) - getCreatedAtValue(b));
      responsesByMessageId.set(key, bucket);
    });

    const messagesWithResponses = messages.map((message) => ({
      ...message,
      responses: responsesByMessageId.get(message.id as string) ?? [],
    }));

    return attachDeviceCookie(
      NextResponse.json({ messages: messagesWithResponses }),
      deviceId,
    );
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return NextResponse.json(
        { code: 'FIRESTORE_QUOTA_EXCEEDED', message: 'Quota exceeded' },
        { status: 503 },
      );
    }
    console.error('Failed to fetch user messages', error);
    return NextResponse.json({ error: 'Не удалось получить сообщения.' }, { status: 500 });
  }
}
