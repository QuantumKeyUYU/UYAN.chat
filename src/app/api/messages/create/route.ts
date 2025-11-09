import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { moderateText } from '@/lib/moderation';
import { getOrCreateUserStats, incrementStats } from '@/lib/stats';
import { serializeDoc } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, deviceId } = body as { text?: string; deviceId?: string };

    if (!text || typeof text !== 'string' || text.trim().length < 10 || text.trim().length > 280) {
      return NextResponse.json({ error: 'Сообщение должно быть от 10 до 280 символов.' }, { status: 400 });
    }

    if (!deviceId) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    const allowed = await checkRateLimit(deviceId, 'message', 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Ты уже поделился сегодня достаточно, попробуй позже.' },
        { status: 429 },
      );
    }

    const moderation = await moderateText(text);
    if (moderation.crisis) {
      return NextResponse.json({ crisis: true }, { status: 200 });
    }
    if (!moderation.approved) {
      return NextResponse.json(
        {
          error: 'Сообщение не прошло модерацию.',
          reasons: moderation.reasons ?? [],
        },
        { status: 400 },
      );
    }

    const cleanedText = moderation.cleanedText ?? text.trim();
    const category = moderation.emotion ?? 'other';

    const db = getAdminDb();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    const docRef = await db.collection('messages').add({
      text: cleanedText,
      category,
      createdAt: now,
      status: 'waiting',
      deviceId,
      moderationPassed: true,
      expiresAt,
    });

    await getOrCreateUserStats(deviceId);
    await incrementStats(deviceId, { messagesSent: 1 });

    const message = serializeDoc({
      id: docRef.id,
      text: cleanedText,
      category,
      createdAt: now,
      status: 'waiting',
      deviceId,
      moderationPassed: true,
      expiresAt,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Failed to create message', error);
    return NextResponse.json({ error: 'Не удалось создать сообщение.' }, { status: 500 });
  }
}
