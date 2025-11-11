import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/rateLimiter';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseId, reason, description, deviceId: deviceIdFromBody } = body as {
      responseId?: string;
      reason?: string;
      description?: string;
      deviceId?: string;
    };

    const deviceId = await resolveDeviceId(request, deviceIdFromBody);

    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    if (!responseId || !reason) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit({ deviceId, action: 'report' });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Ты уже оставил несколько жалоб. Давай передохнём и вернёмся позже.',
          retryAfter: rateLimit.retryAfterSeconds ?? 0,
        },
        { status: 429 },
      );
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    const deviceHash = hashDeviceId(deviceId);
    const reportPayload = {
      responseId,
      reason,
      description: description ?? null,
      reportedAt: now,
      status: 'pending' as const,
      deviceHash,
    };

    await db.collection('reports').add(reportPayload);

    await db
      .collection('responses')
      .doc(responseId)
      .set(
        {
          reportCount: FieldValue.increment(1),
        },
        { merge: true },
      );

    return attachDeviceCookie(NextResponse.json({ ok: true }, { status: 201 }), deviceId);
  } catch (error) {
    console.error('Failed to create report', error);
    return NextResponse.json({ error: 'Не удалось отправить жалобу.' }, { status: 500 });
  }
}
