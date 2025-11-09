import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';
import type { AdminMessage, AdminMessageDoc } from '@/types/firestoreAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId обязателен' }, { status: 400 });
    }

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
      .filter((doc) => doc.deviceId !== deviceId)
      .filter((doc) => doc.expiresAt.toMillis() > now.toMillis());

    if (!messages.length) {
      return NextResponse.json({ message: null }, { status: 200 });
    }

    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];

    return NextResponse.json({ message: serializeDoc(message) });
  } catch (error) {
    console.error('Failed to fetch random message', error);
    return NextResponse.json({ error: 'Не удалось получить сообщение.' }, { status: 500 });
  }
}
