import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { clearDeviceCookie, resolveDeviceId } from '@/lib/device/server';

const BATCH_LIMIT = 500;

const deleteByField = async (collection: string, field: string, value: string) => {
  const db = getAdminDb();
  let removed = 0;

  while (true) {
    const snapshot = await db.collection(collection).where(field, '==', value).limit(BATCH_LIMIT).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    removed += snapshot.size;
  }

  return removed;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const deviceId = resolveDeviceId(request, body?.deviceId);

    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    const deviceHash = hashDeviceId(deviceId);
    const db = getAdminDb();

    const [
      messagesDeletedLegacy,
      messagesDeletedHashed,
      responsesDeletedLegacy,
      responsesDeletedHashed,
      reportsDeletedLegacy,
      reportsDeletedHashed,
      rateLimitsDeletedLegacy,
      rateLimitsDeletedHashed,
    ] = await Promise.all([
      deleteByField('messages', 'deviceId', deviceId),
      deleteByField('messages', 'deviceHash', deviceHash),
      deleteByField('responses', 'deviceId', deviceId),
      deleteByField('responses', 'deviceHash', deviceHash),
      deleteByField('reports', 'deviceId', deviceId),
      deleteByField('reports', 'deviceHash', deviceHash),
      deleteByField('rate_limits', 'deviceId', deviceId),
      deleteByField('rate_limits', 'deviceHash', deviceHash),
    ]);

    const statsRefs = [
      db.collection('user_stats').doc(deviceId),
      db.collection('user_stats').doc(deviceHash),
    ];

    let statsDeleted = 0;
    for (const ref of statsRefs) {
      const snap = await ref.get();
      if (snap.exists) {
        await ref.delete();
        statsDeleted += 1;
      }
    }

    const response = NextResponse.json(
      {
        ok: true,
        removed: {
          messages: messagesDeletedLegacy + messagesDeletedHashed,
          responses: responsesDeletedLegacy + responsesDeletedHashed,
          reports: reportsDeletedLegacy + reportsDeletedHashed,
          userStats: statsDeleted,
          rateLimits: rateLimitsDeletedLegacy + rateLimitsDeletedHashed,
        },
      },
      { status: 200 },
    );
    return clearDeviceCookie(response);
  } catch (error) {
    console.error('[device/purge] Failed to purge device data', error);
    return NextResponse.json(
      { error: 'Не получилось очистить данные. Попробуй ещё раз позже.' },
      { status: 500 },
    );
  }
}
