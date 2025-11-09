import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { moderateText } from '@/lib/moderation';
import { getOrCreateUserStats, incrementStats } from '@/lib/stats';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, text, type, deviceId } = body as {
      messageId?: string;
      text?: string;
      type?: string;
      deviceId?: string;
    };

    if (!messageId || !text || !deviceId) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    if (text.trim().length < 20 || text.trim().length > 200) {
      return NextResponse.json({ error: 'Ответ должен быть от 20 до 200 символов.' }, { status: 400 });
    }

    const allowed = await checkRateLimit(deviceId, 'response', 10, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Ты уже поделился достаточно ответами сегодня, попробуй позже.' },
        { status: 429 },
      );
    }

    const moderation = await moderateText(text);
    if (!moderation.approved) {
      return NextResponse.json(
        {
          error: 'Ответ не прошёл модерацию.',
          reasons: moderation.reasons ?? [],
        },
        { status: 400 },
      );
    }

    const cleanedText = moderation.cleanedText ?? text.trim();

    const db = getAdminDb();
    const messageRef = db.collection('messages').doc(messageId);

    let authorDeviceId: string | null = null;

    await db.runTransaction(async (transaction) => {
      const messageSnap = await transaction.get(messageRef);
      if (!messageSnap.exists) {
        throw new Error('Message not found');
      }
      const messageData = messageSnap.data() as Record<string, any>;
      if (messageData.status !== 'waiting') {
        throw new Error('Message already answered');
      }
      if (messageData.deviceId === deviceId) {
        throw new Error('Cannot answer own message');
      }

      authorDeviceId = messageData.deviceId as string;

      const now = Timestamp.now();
      const responseRef = db.collection('responses').doc();
      transaction.set(responseRef, {
        messageId,
        text: cleanedText,
        createdAt: now,
        deviceId,
        moderationPassed: true,
        type: type ?? 'custom',
        reportCount: 0,
      });

      transaction.update(messageRef, {
        status: 'answered',
        answeredAt: now,
      });
    });

    if (authorDeviceId) {
      await getOrCreateUserStats(authorDeviceId);
      await incrementStats(authorDeviceId, { lightsReceived: 1 });
    }

    await getOrCreateUserStats(deviceId);
    await incrementStats(deviceId, { lightsGiven: 1 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to create response', error);
    const rawMessage = error instanceof Error ? error.message : 'Не удалось создать ответ.';
    let status = 500;
    let message = 'Не удалось создать ответ.';

    if (rawMessage === 'Message already answered') {
      status = 400;
      message = 'Кто-то уже поддержал это сообщение.';
    } else if (rawMessage === 'Cannot answer own message') {
      status = 400;
      message = 'Нельзя отвечать на своё сообщение.';
    } else if (rawMessage === 'Message not found') {
      status = 404;
      message = 'Сообщение не найдено.';
    }

    return NextResponse.json({ error: message }, { status });
  }
}
