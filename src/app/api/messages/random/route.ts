export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { getRandomMessageForSupport } from '@/server/db/messages';
import { getDeviceContext, DeviceContextError } from '@/server/device/context';

const serialize = (message: { id: string; body: string; createdAt: Date }) => ({
  id: message.id,
  body: message.body,
  text: message.body,
  createdAt: message.createdAt.toISOString(),
});

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceContext(request, { requireSalt: true });

    const message = await getRandomMessageForSupport({ deviceHash });
    if (!message) {
      return NextResponse.json({ status: 'empty' });
    }

    return NextResponse.json({ message: serialize(message) });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/messages/random] Failed to fetch random message', error);
    return NextResponse.json({ error: 'Не удалось получить сообщение.' }, { status: 500 });
  }
}
