import { NextRequest, NextResponse } from 'next/server';

import { validateResponseBody } from '@/lib/validationV2';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { createResponse } from '@/server/db/messages';
import { RateLimitError, checkResponseRateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const messageId = context.params?.id;

  if (!messageId) {
    return NextResponse.json({ ok: false, code: 'MISSING_MESSAGE_ID' }, { status: 400 });
  }

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });
    }

    const body = typeof (payload as { body?: unknown })?.body === 'string' ? (payload as { body: string }).body : '';

    const validation = validateResponseBody(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, code: validation.reason }, { status: 400 });
    }
    const { deviceHash } = getDeviceFromRequest(request);
    await checkResponseRateLimit(deviceHash);

    const sanitizedBody = body.trim();

    const response = await createResponse({ messageId, deviceHash, body: sanitizedBody });

    return NextResponse.json({
      ok: true,
      response: {
        id: response.id,
        body: response.body,
        createdAt: response.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/v2/messages/[id]/response] Unexpected error', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMIT', retryAfter: error.retryAfterSeconds },
        { status: 429 },
      );
    }
    if (error instanceof Error) {
      if (error.message === 'MESSAGE_NOT_FOUND') {
        return NextResponse.json({ ok: false, code: 'MESSAGE_NOT_FOUND' }, { status: 404 });
      }
      if (error.message === 'CANNOT_ANSWER_OWN_MESSAGE') {
        return NextResponse.json({ ok: false, code: 'CANNOT_ANSWER_OWN_MESSAGE' }, { status: 400 });
      }
      if (error.message === 'MESSAGE_ALREADY_ANSWERED') {
        return NextResponse.json({ ok: false, code: 'MESSAGE_ALREADY_ANSWERED' }, { status: 409 });
      }
      if (error.message === 'DEVICE_ID_SALT is not configured') {
        return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
