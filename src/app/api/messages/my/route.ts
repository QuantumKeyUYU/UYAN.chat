export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { MessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { DeviceHeaderMissingError, getDeviceFromRequest } from '@/server/device/context';
import { getMessagesForDevice } from '@/server/db/messages';

type LegacyStatus = 'waiting' | 'answered' | 'expired';

const mapStatus = (status: MessageStatus): LegacyStatus => {
  switch (status) {
    case MessageStatus.ANSWERED:
      return 'answered';
    case MessageStatus.BLOCKED:
    case MessageStatus.DELETED:
      return 'expired';
    case MessageStatus.PENDING:
    default:
      return 'waiting';
  }
};

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceFromRequest(request);
    const messages = await getMessagesForDevice(deviceHash);

    const normalized = messages.map((message) => {
      const responses = message.responses.map((response) => ({
        id: response.id,
        text: response.body,
        createdAt: response.createdAt.getTime(),
        reportCount: 0,
        hidden: false,
        moderationNote: null,
      }));

      const answeredAt = responses.length > 0 ? responses[0].createdAt : null;

      return {
        id: message.id,
        text: message.body,
        category: 'other',
        status: mapStatus(message.status),
        createdAt: message.createdAt.getTime(),
        answeredAt,
        responses,
      };
    });

    return NextResponse.json({ messages: normalized });
  } catch (error: unknown) {
    console.error('[api/messages/my] Failed to fetch messages', error);

    if (error instanceof DeviceHeaderMissingError) {
      return NextResponse.json({ error: 'Не удалось определить устройство.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
