export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { moderateResponse } from '@/lib/moderation';
import { createResponse as createResponseRecord } from '@/server/db/messages';
import { getDeviceContext, DeviceContextError } from '@/server/device/context';
import { checkRateLimit } from '@/server/rate-limit';

const serializeResponse = (response: { id: string; body: string; createdAt: Date; messageId: string }) => ({
  id: response.id,
  body: response.body,
  text: response.body,
  messageId: response.messageId,
  createdAt: response.createdAt.toISOString(),
});

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ ok: true });
    }

    if (text.trim().length < 20 || text.trim().length > 200) {
      return NextResponse.json({ error: 'Ответ должен быть от 20 до 200 символов.' }, { status: 400 });
    }

    const { deviceHash } = getDeviceContext(request);

    const rateLimit = await checkRateLimit('response', deviceHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMIT', retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 },
      );
    }

    const moderation = moderateResponse(text);
    if (!moderation.passed) {
      return NextResponse.json(
        {
          error:
            moderation.reason === 'crisis'
              ? 'Ответ касается темы, которую лучше обсудить с профессионалом.'
              : 'Ответ пока не готов к публикации.',
          reason: moderation.reason,
          suggestion: moderation.suggestion,
        },
        { status: 400 },
      );
    }

    const cleanedText = moderation.cleanedText ?? text.trim();

    try {
      const { response } = await createResponseRecord({
        messageId,
        deviceHash,
        body: cleanedText,
      });

      return NextResponse.json({ response: serializeResponse(response) }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      if (message === 'MESSAGE_ALREADY_ANSWERED') {
        return NextResponse.json({ error: 'Кто-то уже поддержал это сообщение.' }, { status: 400 });
      }
      if (message === 'SELF_RESPONSE') {
        return NextResponse.json({ error: 'Нельзя отвечать на своё сообщение.' }, { status: 400 });
      }
      if (message === 'MESSAGE_NOT_FOUND') {
        return NextResponse.json({ error: 'Сообщение не найдено.' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/responses/create] Failed to create response', error);
    return NextResponse.json({ error: 'Не удалось создать ответ.' }, { status: 500 });
  }
}
