import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { isAdminRequest } from '@/lib/adminAuth';

type HideResponseBody = {
  responseId?: string;
  hidden?: boolean;
  moderationNote?: string;
};

type ReportStatus = 'pending' | 'reviewed' | 'action_taken';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as HideResponseBody;
    const { responseId, hidden, moderationNote } = body;

    if (!responseId || typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const db = getAdminDb();
    const responseRef = db.collection('responses').doc(responseId);
    const note =
      typeof moderationNote === 'string' && moderationNote.trim().length > 0 ? moderationNote.trim() : null;

    await responseRef.set({ hidden, moderationNote: note }, { merge: true });

    const newStatus: ReportStatus = hidden ? 'action_taken' : 'reviewed';
    const reportsSnapshot = await db.collection('reports').where('responseId', '==', responseId).get();

    if (!reportsSnapshot.empty) {
      const batch = db.batch();
      reportsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: newStatus });
      });
      await batch.commit();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] Failed to update response visibility', error);
    return NextResponse.json({ error: 'Не удалось обновить ответ.' }, { status: 500 });
  }
}
