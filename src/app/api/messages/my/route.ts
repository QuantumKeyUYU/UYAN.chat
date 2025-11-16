export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { getDeviceContext, DeviceContextError } from '@/server/device/context';
import { getMyMessages } from '@/server/db/messages';

const serializeResponse = (response: { id: string; body: string; createdAt: Date }) => ({
  id: response.id,
  body: response.body,
  createdAt: response.createdAt.toISOString(),
});

const serializeMessage = (message: {
  id: string;
  body: string;
  status: string;
  createdAt: Date;
  responses: { id: string; body: string; createdAt: Date }[];
}) => ({
  id: message.id,
  body: message.body,
  text: message.body,
  status: message.status,
  createdAt: message.createdAt.toISOString(),
  responses: message.responses.map(serializeResponse),
});

export async function GET(request: NextRequest) {
  try {
    const { deviceHash } = getDeviceContext(request);
    const messages = await getMyMessages(deviceHash);
    return NextResponse.json({ messages: messages.map(serializeMessage) });
  } catch (error) {
    if (error instanceof DeviceContextError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[api/messages/my] Failed to fetch messages', error);
    return NextResponse.json({ error: 'Не удалось получить сообщения.' }, { status: 500 });
  }
}
