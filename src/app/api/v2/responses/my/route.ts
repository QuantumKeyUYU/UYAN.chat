import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';
import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const responses = await prisma.response.findMany({
      where: { deviceHash },
      include: {
        message: {
          select: {
            id: true,
            body: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      responses: responses.map((response) => ({
        id: response.id,
        body: response.body,
        createdAt: response.createdAt.toISOString(),
        message: response.message
          ? {
              id: response.message.id,
              body: response.message.body,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[api/v2/responses/my] Unexpected error', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
