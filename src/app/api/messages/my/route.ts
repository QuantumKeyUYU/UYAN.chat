export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import type { AdminMessageDoc } from '@/types/firestoreAdmin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, readDeviceIdFromRequest } from '@/lib/device/server';

export async function GET(request: NextRequest) {
  try {
    const deviceId = readDeviceIdFromRequest(request);
    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const db = getAdminDb();
    const deviceHash = hashDeviceId(deviceId);

    const collection = db.collection('messages');
    const [hashSnapshot, legacySnapshot] = await Promise.all([
      collection.where('deviceHash', '==', deviceHash).orderBy('createdAt', 'desc').get(),
      collection.where('deviceId', '==', deviceId).orderBy('createdAt', 'desc').get(),
    ]);

    const seen = new Set<string>();
    const allDocs = [...hashSnapshot.docs, ...legacySnapshot.docs].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });

    const messages = allDocs.map((doc) => {
      const data = doc.data() as AdminMessageDoc;
      return serializeDoc({ id: doc.id, ...data });
    });

    if (messages.length === 0) {
      return attachDeviceCookie(NextResponse.json({ messages: [] }), deviceId);
    }

    const responsesCollection = db.collection('responses');
    const responseSnapshots = await Promise.all(
      messages.map((message) =>
        responsesCollection.where('messageId', '==', message.id).orderBy('createdAt', 'asc').get(),
      ),
    );

    const responsesByMessageId = new Map<string, Record<string, unknown>[]>();
    responseSnapshots.forEach((snapshot, index) => {
      const messageId = messages[index].id as string;
      const responses = snapshot.docs.map((doc) =>
        serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
      );
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
