import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(_request: NextRequest) {
  try {
    let stats = await prisma.globalStats.findUnique({
      where: { id: 1 },
    });

    if (!stats) {
      stats = await prisma.globalStats.create({
        data: { id: 1 },
      });
    }

    return NextResponse.json({
      ok: true,
      stats: {
        devicesTotal: stats.devicesTotal,
        messagesTotal: stats.messagesTotal,
        responsesTotal: stats.responsesTotal,
      },
    });
  } catch (error) {
    console.error('[api/v2/stats/global] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
