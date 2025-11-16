import { NextRequest, NextResponse } from 'next/server';

import { getDeviceContext, DeviceContextError } from '@/server/device/context';
import { prisma } from '@/server/db/client';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceContext(request);

    const [messagesWritten, responsesGiven, responsesReceived, latestResponse] = await Promise.all([
      prisma.message.count({ where: { deviceHash } }),
      prisma.response.count({ where: { deviceHash } }),
      prisma.response.count({ where: { message: { deviceHash } } }),
      prisma.response.findFirst({
        where: { message: { deviceHash } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        answersUnread: responsesReceived,
        answersTotal: responsesReceived,
        messagesWritten,
        responsesGiven,
        lastRepliesSeenAt: null,
        lastResponseReceivedAt: latestResponse?.createdAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[stats/user] Failed to load stats', error);
    return NextResponse.json({ error: 'Не удалось загрузить статистику.' }, { status: 500 });
  }
}
