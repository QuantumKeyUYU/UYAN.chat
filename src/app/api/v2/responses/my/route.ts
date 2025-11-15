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

    const responses = await prisma.response.findMany({
      where: { authorDeviceId: device.id },
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
      responses: responses.map((response: {
        id: string;
        body: string;
        createdAt: Date;
        message: { id: string; body: string } | null;
      }) => ({
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
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
