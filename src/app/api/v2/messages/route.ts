import { NextRequest, NextResponse } from 'next/server';

import { validateMessageBody } from '@/lib/validationV2';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { createMessage } from '@/server/db/messages';
import { RateLimitError, checkMessageRateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });
    }

    const body = typeof (payload as { body?: unknown })?.body === 'string' ? (payload as { body: string }).body : '';

    const validation = validateMessageBody(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, code: validation.reason }, { status: 400 });
    }

    const { deviceHash } = getDeviceFromRequest(request);
    await checkMessageRateLimit(deviceHash);

    const sanitizedBody = body.trim();

    const message = await createMessage({ deviceHash, body: sanitizedBody });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        hasResponse: false,
      },
    });
  } catch (error) {
    console.error('[api/v2/messages] Unexpected error', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMIT', retryAfter: error.retryAfterSeconds },
        { status: 429 },
      );
    }

    if (error instanceof Error && error.message === 'DEVICE_ID_SALT is not configured') {
      return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
