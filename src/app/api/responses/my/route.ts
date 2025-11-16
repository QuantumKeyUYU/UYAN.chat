export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/server/db/client';
import { getDeviceContext, DeviceContextError } from '@/server/device/context';

const serializeResponse = (response: {
  id: string;
  body: string;
  createdAt: Date;
  messageId: string;
  message: { id: string; body: string } | null;
}) => ({
  id: response.id,
  body: response.body,
  text: response.body,
  createdAt: response.createdAt.toISOString(),
  messageId: response.messageId,
  message: response.message
    ? {
        id: response.message.id,
        text: response.message.body,
      }
    : null,
});

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceContext(request);

    const responses = await prisma.response.findMany({
      where: { deviceHash },
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          select: {
            id: true,
            body: true,
          },
        },
      },
    });

    return NextResponse.json({ responses: responses.map(serializeResponse) });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/responses/my] Failed to fetch responses', error);
    return NextResponse.json({ error: 'Не удалось получить отправленные ответы.' }, { status: 500 });
  }
}
