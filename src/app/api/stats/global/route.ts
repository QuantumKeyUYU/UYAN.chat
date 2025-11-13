import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const db = getAdminDb();
    const now = Date.now();
    const nowTimestamp = Timestamp.fromMillis(now);
    const dayAgo = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    const waitingQuery = db
      .collection('messages')
      .where('status', '==', 'waiting')
      .where('moderationPassed', '==', true);

    const [totalMessagesSnap, totalResponsesSnap, lightsTodaySnap] = await Promise.all([
      db.collection('messages').count().get(),
      db.collection('responses').count().get(),
      db.collection('responses').where('createdAt', '>', dayAgo).count().get(),
    ]);

    let activeWaitingCount = 0;

    try {
      const waitingSnap = await waitingQuery.get();
      activeWaitingCount = waitingSnap.docs.filter((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt as Timestamp | undefined;
        return !expiresAt || expiresAt > nowTimestamp;
      }).length;
    } catch (error) {
      console.error('[stats/global] Failed to load waiting messages count', error);
    }

    const result = {
      totalMessages: totalMessagesSnap.data().count ?? 0,
      totalResponses: totalResponsesSnap.data().count ?? 0,
      messagesWaiting: activeWaitingCount,
      lightsToday: lightsTodaySnap.data().count ?? 0,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json(
      {
        totalMessages: 0,
        totalResponses: 0,
        messagesWaiting: 0,
        lightsToday: 0,
      },
      { status: 200 },
    );
  }
}
