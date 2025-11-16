import { MessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(_request: NextRequest) {
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [messagesTotal, responsesTotal, messagesToday, waitingNow] = await Promise.all([
      prisma.message.count(),
      prisma.response.count(),
      prisma.message.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.message.count({ where: { status: MessageStatus.PENDING } }),
    ]);

    return NextResponse.json({
      ok: true,
      stats: {
        devicesTotal: 0,
        messagesTotal,
        responsesTotal,
        messagesToday,
        waitingNow,
      },
    });
  } catch (error) {
    console.error('[api/v2/stats/global] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
