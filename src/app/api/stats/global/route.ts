import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { buildActiveWaitingMessagesQuery, buildWaitingMessagesQuery } from '@/lib/messagesQueue';

export async function GET() {
  try {
    const db = getAdminDb();
    const now = Date.now();
    const nowTimestamp = Timestamp.fromMillis(now);
    const dayAgo = Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    const waitingActiveQuery = buildActiveWaitingMessagesQuery(db, nowTimestamp);

    const [totalMessagesSnap, totalRepliesSnap, todayMessagesSnap] = await Promise.all([
      db.collection('messages').count().get(),
      db.collection('responses').count().get(),
      db.collection('messages').where('createdAt', '>', dayAgo).count().get(),
    ]);

    let waitingCount = 0;

    try {
      const waitingCountSnapshot = await waitingActiveQuery.count().get();
      waitingCount = waitingCountSnapshot.data().count ?? 0;
    } catch (error) {
      console.warn('[stats/global] Failed to load waiting count via aggregate query', error);
      try {
        const fallbackSnapshot = await buildWaitingMessagesQuery(db).get();
        waitingCount = fallbackSnapshot.docs.filter((doc) => {
          const data = doc.data();
          const expiresAt = data.expiresAt as Timestamp | undefined;
          return !expiresAt || expiresAt > nowTimestamp;
        }).length;
      } catch (fallbackError) {
        console.error('[stats/global] Fallback failed to load waiting count', fallbackError);
      }
    }

    const result = {
      todayCount: todayMessagesSnap.data().count ?? 0,
      totalMessages: totalMessagesSnap.data().count ?? 0,
      totalReplies: totalRepliesSnap.data().count ?? 0,
      waitingCount,
      waitingVisible: waitingCount,
    };

    // waitingCount должен совпадать с количеством мыслей на странице "Поддержать" для консистентности UI

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json(
      {
        todayCount: 0,
        totalMessages: 0,
        totalReplies: 0,
        waitingCount: 0,
        waitingVisible: 0,
      },
      { status: 200 },
    );
  }
}
