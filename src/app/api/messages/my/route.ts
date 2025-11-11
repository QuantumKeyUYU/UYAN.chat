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
    const [hashSnapshot, legacySnapshot] = await Promise.all([
      collection.where('deviceHash', '==', deviceHash).get(),
      collection.where('deviceId', '==', deviceId).get(),
    ]);

    console.info('[api/messages/my] Snapshot stats', {
      resolvedDeviceId: deviceId,
      hashDocs: hashSnapshot.size,
      legacyDocs: legacySnapshot.size,
    });

    const seen = new Set<string>();
    const allDocs = [...hashSnapshot.docs, ...legacySnapshot.docs].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
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

    const messages = allDocs.map((doc) => {
      const data = doc.data() as AdminMessageDoc;
      return serializeDoc({ id: doc.id, ...data });
    });

    messages.sort((a, b) => getCreatedAtValue(b) - getCreatedAtValue(a));

    if (messages.length === 0) {
      return attachDeviceCookie(NextResponse.json({ messages: [] }), deviceId);
    }

    const responsesCollection = db.collection('responses');
    const responseSnapshots = await Promise.all(
      messages.map((message) =>
        responsesCollection.where('messageId', '==', message.id as string).get(),
      ),
    );

    const responsesByMessageId = new Map<string, Record<string, unknown>[]>();
    responseSnapshots.forEach((snapshot, index) => {
      const messageId = messages[index].id as string;
      const responses = snapshot.docs
        .map((doc) =>
          serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
        )
        .sort((a, b) => getCreatedAtValue(a) - getCreatedAtValue(b));
      responsesByMessageId.set(messageId, responses);
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
    console.error('Failed to fetch user messages', error);
    return NextResponse.json({ error: 'Не удалось получить сообщения.' }, { status: 500 });
  }
}
