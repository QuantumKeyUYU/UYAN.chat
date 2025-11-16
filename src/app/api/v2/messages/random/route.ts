import { MessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { getRandomMessageForSupport } from '@/server/db/messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const message = await getRandomMessageForSupport({ deviceHash });

    if (!message) {
      return NextResponse.json({ ok: false, code: 'NO_MESSAGES_AVAILABLE' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        hasResponse: message.status !== MessageStatus.PENDING,
      },
    });
  } catch (error) {
    console.error('[api/v2/messages/random] Unexpected error', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'DEVICE_ID_SALT is not configured') {
      return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
