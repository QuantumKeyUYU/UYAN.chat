export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { moderateResponse } from '@/lib/moderation';
import { getOrCreateUserStats, incrementStats, incrementStatsByHash } from '@/lib/stats';
import { checkRateLimit } from '@/lib/rateLimiter';
import { hashDeviceId } from '@/lib/deviceHash';
import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import type { ResponseType } from '@/types/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, text, type, deviceId: deviceIdFromBody, honeypot } = body as {
      messageId?: string;
      text?: string;
      type?: string;
      deviceId?: string;
      honeypot?: string;
    };

    const deviceId = await resolveDeviceId(request, deviceIdFromBody);

    if (!deviceId) {
      return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
    }

    if (!messageId || !text) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    if (text.trim().length < 20 || text.trim().length > 200) {
      return NextResponse.json({ error: 'Ответ должен быть от 20 до 200 символов.' }, { status: 400 });
    }

    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const rateLimit = await checkRateLimit({ deviceId, action: 'response' });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Сегодня ты уже осветил много историй. Сделай вдох, вернись чуть позже.',
          retryAfter: rateLimit.retryAfterSeconds ?? 0,
        },
        { status: 429 },
      );
    }

    const responderStats = await getOrCreateUserStats(deviceId);
    const bannedUntil = responderStats.bannedUntil;
    if (bannedUntil && bannedUntil.toMillis() > Timestamp.now().toMillis()) {
      return NextResponse.json(
        { error: 'Твой доступ к ответам временно ограничен.' },
        { status: 403 },
      );
    }

    const moderation = moderateResponse(text);
    if (!moderation.passed) {
      return NextResponse.json(
        {
          error:
            moderation.reason === 'crisis'
              ? 'Похоже, текст касается острой боли. Здесь мы бережно отвечаем и избегаем таких деталей.'
              : 'Ответ пока не готов к публикации.',
          reason: moderation.reason,
          suggestion: moderation.suggestion,
        },
        { status: 400 },
      );
    }

    const cleanedText = moderation.cleanedText ?? text.trim();
    const responderHash = hashDeviceId(deviceId);
    const responseType: ResponseType =
      type === 'quick' || type === 'ai-assisted' || type === 'custom' ? (type as ResponseType) : 'custom';

    const db = getAdminDb();
    const messageRef = db.collection('messages').doc(messageId);

    let authorDeviceHash: string | null = null;

    await db.runTransaction(async (transaction) => {
      const messageSnap = await transaction.get(messageRef);
      if (!messageSnap.exists) {
        throw new Error('Message not found');
      }
      const messageData = messageSnap.data() as Record<string, any>;
      if (messageData.status !== 'waiting') {
        throw new Error('Message already answered');
      }
      const messageDeviceHash = typeof messageData.deviceHash === 'string' && messageData.deviceHash.length > 0
        ? messageData.deviceHash
        : typeof messageData.deviceId === 'string' && messageData.deviceId.length > 0
          ? hashDeviceId(String(messageData.deviceId))
          : null;

      if (messageDeviceHash && messageDeviceHash === responderHash) {
        throw new Error('Cannot answer own message');
      }

      authorDeviceHash = messageDeviceHash;

      const now = Timestamp.now();
      const responsePayload = {
        messageId,
        text: cleanedText,
        createdAt: now,
        deviceHash: responderHash,
        moderationPassed: true,
        type: responseType,
        reportCount: 0,
        hidden: false,
        moderationNote: null,
      };
      const responseRef = db.collection('responses').doc();
      transaction.set(responseRef, responsePayload);

      transaction.update(messageRef, {
        status: 'answered',
        answeredAt: now,
      });
    });

    if (authorDeviceHash) {
      try {
        await incrementStatsByHash(authorDeviceHash, { lightsReceived: 1 });
      } catch (statsError) {
        console.error('[api/responses/create] Failed to update author stats', statsError);
      }
    }

    try {
      await incrementStats(deviceId, { lightsGiven: 1 });
    } catch (statsError) {
      console.error('[api/responses/create] Failed to update responder stats', statsError);
    }

    return attachDeviceCookie(NextResponse.json({ ok: true }, { status: 201 }), deviceId);
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
