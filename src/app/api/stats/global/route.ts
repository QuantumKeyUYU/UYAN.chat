import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const db = getAdminDb();
    const now = Date.now();
    const nowTimestamp = Timestamp.fromMillis(now);
    const dayAgo = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    const waitingTotalQuery = db.collection('messages').where('status', '==', 'waiting').count();
    const waitingVisibleBaseQuery = db
      .collection('messages')
      .where('status', '==', 'waiting')
      .where('moderationPassed', '==', true)
      .where('expiresAt', '>', nowTimestamp);

    const [totalMessagesSnap, totalRepliesSnap, todayMessagesSnap, waitingTotalSnap] = await Promise.all([
      db.collection('messages').count().get(),
      db.collection('responses').count().get(),
      db.collection('messages').where('createdAt', '>', dayAgo).count().get(),
      waitingTotalQuery.get(),
    ]);

    let waitingVisible = 0;

    try {
      const visibleSnap = await waitingVisibleBaseQuery.count().get();
      waitingVisible = visibleSnap.data().count ?? 0;
    } catch (error) {
      console.warn('[stats/global] Failed to load visible waiting count via aggregate query', error);
      try {
        const fallbackQuery = db
          .collection('messages')
          .where('status', '==', 'waiting')
          .where('moderationPassed', '==', true);
        const fallbackSnap = await fallbackQuery.get();
        waitingVisible = fallbackSnap.docs.filter((doc) => {
          const data = doc.data();
          const expiresAt = data.expiresAt as Timestamp | undefined;
          return !expiresAt || expiresAt > nowTimestamp;
        }).length;
      } catch (fallbackError) {
        console.error('[stats/global] Fallback failed to load visible waiting count', fallbackError);
      }
    }

    const result = {
      todayCount: todayMessagesSnap.data().count ?? 0,
      totalMessages: totalMessagesSnap.data().count ?? 0,
      totalReplies: totalRepliesSnap.data().count ?? 0,
      waitingTotal: waitingTotalSnap.data().count ?? 0,
      waitingVisible,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json(
      {
        todayCount: 0,
        totalMessages: 0,
        totalReplies: 0,
        waitingTotal: 0,
        waitingVisible: 0,
      },
      { status: 200 },
    );
  }
}
