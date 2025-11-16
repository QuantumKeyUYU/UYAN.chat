export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { MessageStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getMessageById } from '@/server/db/messages';

interface Params {
  params: { id: string };
}

const mapStatus = (status: MessageStatus) => {
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

    const responses = message.responses.map((response) => ({
      id: response.id,
      text: response.body,
      createdAt: response.createdAt.getTime(),
      reportCount: 0,
      hidden: false,
      moderationNote: null,
    }));

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.body,
        category: 'other',
        status: mapStatus(message.status),
        createdAt: message.createdAt.getTime(),
        answeredAt: responses.length > 0 ? responses[0].createdAt : null,
      },
      responses,
    });
  } catch (error: unknown) {
    console.error('[api/messages/[id]] Failed to fetch message detail', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
