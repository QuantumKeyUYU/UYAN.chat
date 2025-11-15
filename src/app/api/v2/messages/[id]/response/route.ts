import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prismaClient';
import { resolveDeviceV2 } from '@/lib/deviceV2';
import { validateResponseBody } from '@/lib/validationV2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const messageId = context.params?.id;

  if (!messageId) {
    return NextResponse.json({ ok: false, code: 'MISSING_MESSAGE_ID' }, { status: 400 });
  }

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

    const validation = validateResponseBody(body);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, code: validation.reason }, { status: 400 });
    }

    const device = await resolveDeviceV2(rawDeviceId);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ ok: false, code: 'MESSAGE_NOT_FOUND' }, { status: 404 });
    }

    if (message.deviceId === device.id) {
      return NextResponse.json({ ok: false, code: 'CANNOT_ANSWER_OWN_MESSAGE' }, { status: 400 });
    }

    if (message.hasResponse) {
      return NextResponse.json({ ok: false, code: 'MESSAGE_ALREADY_ANSWERED' }, { status: 409 });
    }

    const sanitizedBody = body.trim();

    try {
      const response = await prisma.$transaction(async (tx: any) => {
        const createdResponse = await tx.response.create({
          data: {
            body: sanitizedBody,
            messageId: message.id,
            authorDeviceId: device.id,
          },
        });

        await tx.message.update({
          where: { id: message.id },
          data: { hasResponse: true },
        });

        const now = new Date();

        await tx.userStats.upsert({
          where: { deviceId: device.id },
          update: {
            responsesSent: { increment: 1 },
          },
          create: {
            deviceId: device.id,
            responsesSent: 1,
          },
        });

        await tx.userStats.upsert({
          where: { deviceId: message.deviceId },
          update: {
            responsesReceived: { increment: 1 },
            lastResponseReceivedAt: now,
          },
          create: {
            deviceId: message.deviceId,
            responsesReceived: 1,
            lastResponseReceivedAt: now,
          },
        });

        await tx.globalStats.upsert({
          where: { id: 1 },
          update: {
            responsesTotal: { increment: 1 },
          },
          create: {
            id: 1,
            responsesTotal: 1,
          },
        });

        return createdResponse;
      });

      return NextResponse.json({
        ok: true,
        response: {
          id: response.id,
          body: response.body,
          createdAt: response.createdAt.toISOString(),
        },
      });
    } catch (transactionError) {
      console.error('[api/v2/messages/[id]/response] Transaction failed', transactionError);
      if (
        typeof transactionError === 'object' &&
        transactionError !== null &&
        'code' in transactionError &&
        typeof (transactionError as { code?: string }).code === 'string'
      ) {
        const code = (transactionError as { code?: string }).code;
        if (code === 'P2002') {
          return NextResponse.json({ ok: false, code: 'MESSAGE_ALREADY_ANSWERED' }, { status: 409 });
        }
        if (code === 'P2003') {
          return NextResponse.json({ ok: false, code: 'MESSAGE_NOT_FOUND' }, { status: 404 });
        }
      }
      return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
    }
  } catch (error) {
    console.error('[api/v2/messages/[id]/response] Unexpected error', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
