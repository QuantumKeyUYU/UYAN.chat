export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { prisma } from '@/server/db/client';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const [unreadCount, lastSeen] = await Promise.all([
      prisma.response.count({ where: { message: { deviceHash }, seenAt: null } }),
      prisma.response.findFirst({
        where: { message: { deviceHash }, seenAt: { not: null } },
        orderBy: { seenAt: 'desc' },
        select: { seenAt: true },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      lastRepliesSeenAt: lastSeen?.seenAt ? lastSeen.seenAt.getTime() : null,
    });
  } catch (error) {
    console.error('[responses/unread] Failed to compute unread responses', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'DEVICE_ID_SALT is not configured') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Не удалось загрузить ответы.' }, { status: 500 });
  }
}
