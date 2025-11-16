export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { moderateResponse } from '@/lib/moderation';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { createResponse } from '@/server/db/messages';
import { RateLimitError, checkResponseRateLimit } from '@/server/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const payload = (await request.json().catch(() => null)) as {
      messageId?: string;
      text?: string;
      honeypot?: string;
    } | null;

    const messageId = typeof payload?.messageId === 'string' ? payload.messageId : '';
    const text = typeof payload?.text === 'string' ? payload.text : '';
    const honeypot = typeof payload?.honeypot === 'string' ? payload.honeypot : '';

    if (!messageId) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (text.trim().length < 20 || text.trim().length > 200) {
      return NextResponse.json({ error: 'Ответ должен быть от 20 до 200 символов.' }, { status: 400 });
    }

    await checkResponseRateLimit(deviceHash);

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
    const response = await createResponse({ messageId, deviceHash, body: cleanedText });

    return NextResponse.json(
      {
        response: {
          id: response.id,
          text: response.body,
          createdAt: response.createdAt.getTime(),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('[api/responses/create] Failed to create response', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        { status: 429 },
      );
    }

    if (error instanceof Error) {
      if (error.message === 'MESSAGE_ALREADY_ANSWERED') {
        return NextResponse.json({ error: 'Кто-то уже поддержал это сообщение.' }, { status: 400 });
      }
      if (error.message === 'CANNOT_ANSWER_OWN_MESSAGE') {
        return NextResponse.json({ error: 'Нельзя отвечать на своё сообщение.' }, { status: 400 });
      }
      if (error.message === 'MESSAGE_NOT_FOUND') {
        return NextResponse.json({ error: 'Сообщение не найдено.' }, { status: 404 });
      }
      if (error.message === 'DEVICE_ID_SALT is not configured') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
