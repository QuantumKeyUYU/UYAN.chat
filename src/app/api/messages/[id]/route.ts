export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { serializeDoc } from '@/lib/serializers';

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }

    const db = getAdminDb();
    const messageDoc = await db.collection('messages').doc(id).get();

    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    const responseSnapshot = await db
      .collection('responses')
      .where('messageId', '==', id)
      .orderBy('createdAt', 'asc')
      .get();

    const responses = responseSnapshot.docs.map((doc) =>
      serializeDoc({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    );

    return NextResponse.json({
      message: serializeDoc({ id: messageDoc.id, ...(messageDoc.data() as Record<string, unknown>) }),
      responses,
    });
  } catch (error) {
    console.error('Failed to fetch message detail', error);
    return NextResponse.json({ error: 'Не удалось получить данные сообщения.' }, { status: 500 });
  }
}
