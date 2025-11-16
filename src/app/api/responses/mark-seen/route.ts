export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { prisma } from '@/server/db/client';

export async function POST(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);
    const now = new Date();

    await prisma.response.updateMany({
      where: { message: { deviceHash }, seenAt: null },
      data: { seenAt: now },
    });

    const latest = await prisma.response.findFirst({
      where: { message: { deviceHash }, seenAt: { not: null } },
      orderBy: { seenAt: 'desc' },
      select: { seenAt: true },
    });

    return NextResponse.json({
      ok: true,
      lastRepliesSeenAt: latest?.seenAt ? latest.seenAt.getTime() : now.getTime(),
    });
  } catch (error) {
    console.error('[responses/mark-seen] Failed to update lastRepliesSeenAt', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'DEVICE_ID_SALT is not configured') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Не удалось обновить статус ответов.' }, { status: 500 });
  }
}
