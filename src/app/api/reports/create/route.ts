import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseId, reason, description, deviceId } = body as {
      responseId?: string;
      reason?: string;
      description?: string;
      deviceId?: string;
    };

    if (!responseId || !reason || !deviceId) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    await db.collection('reports').add({
      responseId,
      reason,
      description: description ?? null,
      reportedAt: now,
      status: 'pending',
      deviceId,
    });

    await db
      .collection('responses')
      .doc(responseId)
      .set(
        {
          reportCount: FieldValue.increment(1),
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to create report', error);
    return NextResponse.json({ error: 'Не удалось отправить жалобу.' }, { status: 500 });
  }
}
