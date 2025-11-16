export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { moderateMessage } from '@/lib/moderation';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { createMessage } from '@/server/db/messages';
import { RateLimitError, checkMessageRateLimit } from '@/server/rate-limit';

const CRISIS_RESPONSE = {
  crisis: true,
  message:
    'Кажется, тебе сейчас очень тяжело. Мы рядом сердцем, но лучше всего могут поддержать живые специалисты.',
};

const mapStatus = () => 'waiting';

export async function POST(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    await checkMessageRateLimit(deviceHash);

    const payload = (await request.json().catch(() => null)) as {
      text?: string;
      honeypot?: string;
    } | null;

    const text = typeof payload?.text === 'string' ? payload.text : '';
    const honeypot = typeof payload?.honeypot === 'string' ? payload.honeypot : '';

    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (text.trim().length < 10 || text.trim().length > 280) {
      return NextResponse.json({ error: 'Сообщение должно быть от 10 до 280 символов.' }, { status: 400 });
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
    const message = await createMessage({ deviceHash, body: cleanedText });

    return NextResponse.json(
      {
        message: {
          id: message.id,
          text: message.body,
          category: 'other',
          status: mapStatus(),
          createdAt: message.createdAt.getTime(),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('[api/messages/create] Failed to create message', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        { status: 429 },
      );
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
