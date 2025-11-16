export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';

import { getMessageById } from '@/server/db/messages';

interface Params {
  params: { id: string };
}

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

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }

    const message = await getMessageById(id);
    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
    }

    return NextResponse.json({ message: serializeMessage(message) });
  } catch (error) {
    console.error('[api/messages/[id]] Failed to load message', error);
    return NextResponse.json({ error: 'Не удалось получить данные сообщения.' }, { status: 500 });
  }
}
