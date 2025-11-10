import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

/** --- простая авторизация для крона --- */
function checkAuth(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  return auth === expected
}

/** --- инициализация Admin SDK --- */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}
const db = admin.firestore()

/** --- batched delete для больших коллекций --- */
async function deleteByQuery(
  colPath: string,
  whereField: string,
  op: FirebaseFirestore.WhereFilterOp,
  value: any,
  batchSize = 300
) {
  let total = 0
  while (true) {
    const snap = await db
      .collection(colPath)
      .where(whereField, op, value)
      .orderBy(whereField)
      .limit(batchSize)
      .get()

    if (snap.empty) break

    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    total += snap.size
    if (snap.size < batchSize) break
  }
  return total
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const now = admin.firestore.Timestamp.now()

  // 1) чистим просроченные сообщения
  const deletedMessages = await deleteByQuery('messages', 'expiresAt', '<=', now)

  // 2) (опционально) чистим старые ответы, если хочешь хранить не дольше 90 дней:
  // const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 90*24*60*60*1000))
  // const deletedResponses = await deleteByQuery('responses', 'createdAt', '<=', cutoff)

  return NextResponse.json({
    ok: true,
    deleted: { messages: deletedMessages /*, responses: deletedResponses */ },
  })
}
