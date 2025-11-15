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

    const messages = await prisma.message.findMany({
      where: { deviceId: device.id },
      include: {
        response: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      messages: messages.map((message: {
        id: string;
        body: string;
        createdAt: Date;
        hasResponse: boolean;
        response: { id: string; body: string; createdAt: Date } | null;
      }) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        hasResponse: message.hasResponse,
        response: message.response
          ? {
              id: message.response.id,
              body: message.response.body,
              createdAt: message.response.createdAt.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[api/v2/messages/my] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
