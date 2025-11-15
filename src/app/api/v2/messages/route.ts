import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prismaClient';
import { resolveDeviceV2 } from '@/lib/deviceV2';
import { validateMessageBody } from '@/lib/validationV2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    const rawDeviceId = request.headers.get('x-device-id')?.trim();
    if (!rawDeviceId) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });
    }

    const body = typeof (payload as { body?: unknown })?.body === 'string' ? (payload as { body: string }).body : '';

    const validation = validateMessageBody(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, code: validation.reason }, { status: 400 });
    }

    const device = await resolveDeviceV2(rawDeviceId);

    const sanitizedBody = body.trim();

    const message = await prisma.message.create({
      data: {
        body: sanitizedBody,
        deviceId: device.id,
        status: 'PUBLISHED',
      },
    });

    try {
      await prisma.userStats.upsert({
        where: { deviceId: device.id },
        update: {
          messagesSent: { increment: 1 },
        },
        create: {
          deviceId: device.id,
          messagesSent: 1,
        },
      });

      await prisma.globalStats.upsert({
        where: { id: 1 },
        update: {
          messagesTotal: { increment: 1 },
        },
        create: {
          id: 1,
          messagesTotal: 1,
        },
      });
    } catch (error) {
      console.error('[api/v2/messages] Failed to update statistics', error);
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/v2/messages] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
