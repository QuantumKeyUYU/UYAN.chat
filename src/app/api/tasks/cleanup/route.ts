import { NextRequest, NextResponse } from 'next/server';
import type { Firestore, WhereFilterOp } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const getExpectedBearer = () => {
  const secret = process.env.CRON_SECRET;
  return secret ? `Bearer ${secret}` : null;
};

const isAuthorized = (request: NextRequest): boolean => {
  const provided = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const expected = getExpectedBearer();

  if (!expected) {
    console.warn('[tasks/cleanup] CRON_SECRET is not configured. Rejecting request.');
    return false;
  }

  return provided === expected;
};

const deleteByQuery = async (
  db: Firestore,
  collectionPath: string,
  field: string,
  operator: WhereFilterOp,
  value: unknown,
  batchSize = 300,
): Promise<number> => {
  let total = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await db
      .collection(collectionPath)
      .where(field, operator, value)
      .orderBy(field)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      hasMore = false;
      continue;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    total += snapshot.size;
    hasMore = snapshot.size === batchSize;
  }

  return total;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = Timestamp.now();

    const deletedMessages = await deleteByQuery(db, 'messages', 'expiresAt', '<=', now);

    return NextResponse.json({
      ok: true,
      deleted: { messages: deletedMessages },
    });
  } catch (error) {
    console.error('[tasks/cleanup] Failed to run cleanup job', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
