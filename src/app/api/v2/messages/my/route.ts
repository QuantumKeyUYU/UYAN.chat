import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { getMessagesForDevice } from '@/server/db/messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);
    const messages = await getMessagesForDevice(deviceHash);

    return NextResponse.json({
      ok: true,
      messages: messages.map((message) => {
        const response = message.responses[0] ?? null;
        return {
          id: message.id,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          hasResponse: Boolean(response),
          response: response
            ? {
                id: response.id,
                body: response.body,
                createdAt: response.createdAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('[api/v2/messages/my] Unexpected error', error);
    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ ok: false, code: 'MISSING_DEVICE_ID' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
