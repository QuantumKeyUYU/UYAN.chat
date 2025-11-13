import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const db = getAdminDb();
    const now = Date.now();
    const dayAgo = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    const activeWaitingQuery = db
      .collection('messages')
      .where('status', '==', 'waiting')
      .where('moderationPassed', '==', true)
      .where('expiresAt', '>', Timestamp.fromMillis(now));

    const [totalMessagesSnap, totalResponsesSnap, waitingSnap, lightsTodaySnap] = await Promise.all([
      db.collection('messages').count().get(),
      db.collection('responses').count().get(),
      activeWaitingQuery.count().get(),
      db.collection('responses').where('createdAt', '>', dayAgo).count().get(),
    ]);

    const result = {
      totalMessages: totalMessagesSnap.data().count ?? 0,
      totalResponses: totalResponsesSnap.data().count ?? 0,
      messagesWaiting: waitingSnap.data().count ?? 0,
      lightsToday: lightsTodaySnap.data().count ?? 0,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить статистику.' },
      { status: 500 },
    );
  }
}
