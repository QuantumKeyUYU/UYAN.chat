export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { getRandomMessageForSupport } from '@/server/db/messages';

const mapStatus = (status: 'waiting' | 'answered' | 'expired') => status;

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);

    const message = await getRandomMessageForSupport({ deviceHash });

    if (!message) {
      return NextResponse.json({ message: null }, { status: 200 });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.body,
        category: 'other',
        status: mapStatus('waiting'),
        createdAt: message.createdAt.getTime(),
      },
    });
  } catch (error: unknown) {
    console.error('[api/messages/random] Failed to fetch message', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
