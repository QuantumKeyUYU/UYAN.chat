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
      where: {
        status: 'PUBLISHED',
        hasResponse: false,
        deviceId: { not: device.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (messages.length === 0) {
      return NextResponse.json({ ok: false, code: 'NO_MESSAGES_AVAILABLE' }, { status: 404 });
    }

    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        hasResponse: message.hasResponse,
      },
    });
  } catch (error) {
    console.error('[api/v2/messages/random] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
