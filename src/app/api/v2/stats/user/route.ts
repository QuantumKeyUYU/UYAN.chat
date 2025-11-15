import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prismaClient';
import { resolveDeviceV2 } from '@/lib/deviceV2';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const emptyStats = {
  messagesSent: 0,
  responsesSent: 0,
  responsesReceived: 0,
  lastResponseReceivedAt: null as string | null,
};

export async function GET(request: NextRequest) {
  try {
    const rawDeviceId = request.headers.get(DEVICE_ID_HEADER)?.trim();
    if (!rawDeviceId) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }

    const device = await resolveDeviceV2(rawDeviceId);

    const stats = await prisma.userStats.findUnique({
      where: { deviceId: device.id },
    });

    if (!stats) {
      return NextResponse.json({ ok: true, stats: { ...emptyStats } }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        stats: {
          messagesSent: stats.messagesSent,
          responsesSent: stats.responsesSent,
          responsesReceived: stats.responsesReceived,
          lastResponseReceivedAt: stats.lastResponseReceivedAt
            ? stats.lastResponseReceivedAt.toISOString()
            : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[stats/user] Failed to load stats', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
