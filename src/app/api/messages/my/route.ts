import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';

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
      .where('deviceId', '==', deviceId)
      .orderBy('createdAt', 'desc')
      .get();

    const messages = snapshot.docs.map((doc) => serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to fetch user messages', error);
    return NextResponse.json({ error: 'Не удалось получить сообщения.' }, { status: 500 });
  }
}
