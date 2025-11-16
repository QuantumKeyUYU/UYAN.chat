import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [messagesSent, responsesSent, responsesReceived, lastResponse] = await Promise.all([
      prisma.message.count({ where: { deviceHash } }),
      prisma.response.count({ where: { deviceHash } }),
      prisma.response.count({ where: { message: { deviceHash } } }),
      prisma.response.findFirst({
        where: { message: { deviceHash } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        stats: {
          messagesSent,
          responsesSent,
          responsesReceived,
          lastResponseReceivedAt: lastResponse?.createdAt?.toISOString() ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[stats/user] Failed to load stats', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'DEVICE_ID_SALT is not configured') {
      return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
    }
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
