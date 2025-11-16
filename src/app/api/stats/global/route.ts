import { NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';

export async function GET() {
  try {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [messagesToday, messagesTotal, responsesTotal, waitingNow] = await Promise.all([
      prisma.message.count({ where: { createdAt: { gte: windowStart } } }),
      prisma.message.count(),
      prisma.response.count(),
      prisma.message.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({ messagesToday, messagesTotal, responsesTotal, waitingNow });
  } catch (error) {
    console.error('[stats/global] Failed to load stats', error);
    return NextResponse.json({ code: 'GLOBAL_STATS_UNAVAILABLE' }, { status: 503 });
  }
}
