export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { moderateMessage } from '@/lib/moderation';
import { getDeviceContext, DeviceContextError } from '@/server/device/context';
import { createMessage } from '@/server/db/messages';
import { checkRateLimit } from '@/server/rate-limit';

const CRISIS_RESPONSE = {
  crisis: true,
  message:
    'Кажется, тебе сейчас очень тяжело. Мы рядом сердцем, но лучше всего могут поддержать живые специалисты.',
};

const serializeMessage = (message: { id: string; body: string; createdAt: Date; status: string }) => ({
  id: message.id,
  body: message.body,
  text: message.body,
  status: message.status,
  createdAt: message.createdAt.toISOString(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      text?: string;
      honeypot?: string;
    } | null;

    const text = typeof payload?.text === 'string' ? payload.text : '';
    const honeypot = typeof payload?.honeypot === 'string' ? payload?.honeypot : '';

    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    if (text.trim().length < 10 || text.trim().length > 280) {
      return NextResponse.json(
        { error: 'Сообщение должно быть от 10 до 280 символов.' },
        { status: 400 },
      );
    }

    const { deviceHash } = getDeviceContext(request);

    const rateLimit = await checkRateLimit('message', deviceHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMIT', retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 },
      );
    }

    const moderation = moderateMessage(text);
    if (!moderation.passed) {
      if (moderation.reason === 'crisis') {
        return NextResponse.json(CRISIS_RESPONSE);
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
    const message = await createMessage({ deviceHash, body: cleanedText });

    return NextResponse.json({ message: serializeMessage(message) }, { status: 201 });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/messages/create] Failed to create message', error);
    return NextResponse.json({ error: 'Не удалось создать сообщение.' }, { status: 500 });
  }
}
