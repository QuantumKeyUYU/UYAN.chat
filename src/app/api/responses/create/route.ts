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
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import type { ResponseType } from '@/types/firestore';
import { serializeDoc } from '@/lib/serializers';

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

    let deviceId: string | null = null;
    try {
      deviceId = await resolveDeviceId(request, deviceIdFromBody);
    } catch (resolutionError) {
      console.error('[api/responses/create] Failed to resolve device id', resolutionError);
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

    if (deviceId) {
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
    }

    let bannedUntilMillis: number | null = null;
    if (deviceId) {
      try {
        const responderStats = await getOrCreateUserStats(deviceId);
        const bannedUntil = responderStats.bannedUntil;
        if (bannedUntil) {
          try {
            bannedUntilMillis = bannedUntil.toMillis();
          } catch (serializeError) {
            console.error('[api/responses/create] Failed to parse ban timestamp', serializeError);
          }
        }
      } catch (statsError) {
        console.error('[api/responses/create] Failed to load responder stats', statsError);
      }
    }

    if (bannedUntilMillis && bannedUntilMillis > Timestamp.now().toMillis()) {
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
    const responderHash = deviceId ? hashDeviceId(deviceId) : null;
    const responseType: ResponseType =
      type === 'quick' || type === 'ai-assisted' || type === 'custom' ? (type as ResponseType) : 'custom';

    const db = getAdminDb();
    const messageRef = db.collection('messages').doc(messageId);

    let authorDeviceHash: string | null = null;

    let responseDoc: Record<string, unknown> | null = null;

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

      if (messageDeviceHash && responderHash && messageDeviceHash === responderHash) {
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

      responseDoc = { id: responseRef.id, ...responsePayload };
    });

    const serializedResponse = responseDoc ? serializeDoc(responseDoc) : null;

    if (authorDeviceHash) {
      try {
        await incrementStatsByHash(authorDeviceHash, { lightsReceived: 1, repliesUnread: 1 });
      } catch (statsError) {
        console.error('[api/responses/create] stats failed for author', statsError);
      }
    }

    if (deviceId) {
      try {
        await incrementStats(deviceId, { lightsGiven: 1 });
      } catch (statsError) {
        console.error('[api/responses/create] stats failed for responder', statsError);
      }
    }

    const responseBody = serializedResponse ? { response: serializedResponse } : { ok: true };
    const response = NextResponse.json(responseBody, { status: 201 });
    return deviceId ? attachDeviceCookie(response, deviceId) : response;
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
