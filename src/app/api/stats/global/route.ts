import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { isFirestoreQuotaError } from '@/lib/firebase/errors';

interface GlobalStatsDoc {
  messagesToday?: number;
  messagesTotal?: number;
  responsesTotal?: number;
  waitingNow?: number;
}

const COLLECTION = 'stats';
const DOCUMENT_ID = 'global';

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTION).doc(DOCUMENT_ID).get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { code: 'GLOBAL_STATS_UNAVAILABLE' },
        { status: 503 },
      );
    }

    const data = snapshot.data() as GlobalStatsDoc;
    return NextResponse.json(
      {
        messagesToday: data.messagesToday ?? 0,
        messagesTotal: data.messagesTotal ?? 0,
        responsesTotal: data.responsesTotal ?? 0,
        waitingNow: data.waitingNow ?? 0,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      return NextResponse.json(
        { code: 'GLOBAL_STATS_UNAVAILABLE' },
        { status: 503 },
      );
    }
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json({ code: 'GLOBAL_STATS_UNAVAILABLE' }, { status: 503 });
  }
}
