import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { createReport } from '@/server/db/messages';
import { RateLimitError, checkReportRateLimit } from '@/server/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);
    const payload = (await request.json().catch(() => null)) as {
      responseId?: string;
      messageId?: string;
      reason?: string;
      description?: string;
    } | null;

    const reason = typeof payload?.reason === 'string' ? payload.reason : '';
    const responseId = typeof payload?.responseId === 'string' ? payload.responseId : undefined;
    const messageId = typeof payload?.messageId === 'string' ? payload.messageId : undefined;
    const description = typeof payload?.description === 'string' ? payload.description : undefined;

    if (!reason || (!responseId && !messageId)) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    await checkReportRateLimit(deviceHash);

    await createReport({
      deviceHash,
      reason,
      responseId,
      messageId,
      description,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    console.error('[api/reports/create] Failed to create report', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfterSeconds },
        { status: 429 },
      );
    }

    if (error instanceof Error && error.message === 'REPORT_TARGET_REQUIRED') {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
