import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prismaClient';
import { resolveDeviceV2 } from '@/lib/deviceV2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const rawDeviceId = request.headers.get('x-device-id')?.trim();
    if (!rawDeviceId) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }

    const device = await resolveDeviceV2(rawDeviceId);

    const stats = await prisma.userStats.findUnique({
      where: { deviceId: device.id },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        messagesSent: stats?.messagesSent ?? 0,
        responsesSent: stats?.responsesSent ?? 0,
        responsesReceived: stats?.responsesReceived ?? 0,
        lastResponseReceivedAt: stats?.lastResponseReceivedAt
          ? stats.lastResponseReceivedAt.toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error('[api/v2/stats/user] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
