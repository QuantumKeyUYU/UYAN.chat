export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { moderateMessage } from '@/lib/moderation';
import { getOrCreateUserStats, incrementStats } from '@/lib/stats';
import { serializeDoc } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rateLimiter';
import { hashDeviceId } from '@/lib/deviceHash';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';

const CRISIS_RESPONSE = {
  crisis: true,
  message:
    'Кажется, тебе сейчас очень тяжело. Мы рядом сердцем, но лучше всего могут поддержать живые специалисты.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, deviceId: deviceIdFromBody, honeypot } = body as {
      text?: string;
      deviceId?: string;
      honeypot?: string;
    };

    let deviceId: string | null = null;
    try {
      deviceId = await resolveDeviceId(request, deviceIdFromBody);
    } catch (resolutionError) {
      console.error('[api/messages/create] Failed to resolve device id', resolutionError);
    }

    if (!text || typeof text !== 'string' || text.trim().length < 10 || text.trim().length > 280) {
      return NextResponse.json({ error: 'Сообщение должно быть от 10 до 280 символов.' }, { status: 400 });
    }

    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (deviceId) {
      const rateLimit = await checkRateLimit({ deviceId, action: 'message' });
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Ты сегодня уже много поделился. Давай дадим себе паузу и вернёмся чуть позже.',
            retryAfter: rateLimit.retryAfterSeconds ?? 0,
          },
          { status: 429 },
        );
      }
    }

    const moderation = moderateMessage(text);
    if (!moderation.passed) {
      if (moderation.reason === 'crisis') {
        return NextResponse.json(CRISIS_RESPONSE, { status: 200 });
      }

      return NextResponse.json(
        {
          error: 'Сообщение пока не готово к публикации.',
          reason: moderation.reason,
          suggestion: moderation.suggestion,
        },
        { status: 400 },
      );
    }

    const cleanedText = moderation.cleanedText ?? text.trim();
    const category = 'other';
    const deviceHash = deviceId ? hashDeviceId(deviceId) : null;

    const db = getAdminDb();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    const messagePayload = {
      text: cleanedText,
      category,
      createdAt: now,
      status: 'waiting' as const,
      deviceHash,
      moderationPassed: true,
      expiresAt,
    };
    const docRef = await db.collection('messages').add(messagePayload);

    if (deviceId) {
      try {
        await getOrCreateUserStats(deviceId);
        await incrementStats(deviceId, { messagesSent: 1 });
      } catch (statsError) {
        console.error('[api/messages/create] stats failed', statsError);
      }
    }

    const message = serializeDoc({ id: docRef.id, ...messagePayload });

    const response = NextResponse.json({ message }, { status: 201 });
    return deviceId ? attachDeviceCookie(response, deviceId) : response;
  } catch (error) {
    console.error('Failed to create message', error);
    return NextResponse.json({ error: 'Не удалось создать сообщение.' }, { status: 500 });
  }
}
