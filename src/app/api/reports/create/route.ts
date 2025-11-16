export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { createReport } from '@/server/db/messages';
import { getDeviceContext, DeviceContextError } from '@/server/device/context';
import { checkRateLimit } from '@/server/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      messageId?: string;
      responseId?: string;
      reason?: string;
    } | null;

    const messageId = typeof payload?.messageId === 'string' ? payload?.messageId : undefined;
    const responseId = typeof payload?.responseId === 'string' ? payload?.responseId : undefined;
    const reason = typeof payload?.reason === 'string' ? payload?.reason.trim() : '';

    if (!reason) {
      return NextResponse.json({ error: 'Нужно указать причину' }, { status: 400 });
    }

    if (!messageId && !responseId) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const { deviceHash } = getDeviceContext(request);

    const rateLimit = await checkRateLimit('report', deviceHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMIT', retryAfterSeconds: rateLimit.retryAfterSeconds },
        { status: 429 },
      );
    }

    await createReport({ messageId, responseId, deviceHash, reason });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/reports/create] Failed to create report', error);
    return NextResponse.json({ error: 'Не удалось отправить жалобу.' }, { status: 500 });
  }
}
