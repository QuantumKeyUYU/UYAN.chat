import { MessageStatus, type Message, type Response } from '@prisma/client';

import { prisma } from './client';

export interface CreateMessageInput {
  deviceHash: string;
  body: string;
}

export interface CreateResponseInput {
  messageId: string;
  deviceHash: string;
  body: string;
}

export interface CreateReportInput {
  messageId?: string | null;
  responseId?: string | null;
  deviceHash: string;
  reason: string;
}

export async function createMessage({ deviceHash, body }: CreateMessageInput) {
  return prisma.message.create({
    data: {
      deviceHash,
      body,
      status: MessageStatus.PENDING,
    },
  });
}

export async function getRandomMessageForSupport({
  deviceHash,
}: {
  deviceHash: string;
}): Promise<(Message & { responses: Response[] }) | null> {
  const candidates = await prisma.message.findMany({
    where: {
      status: MessageStatus.PENDING,
      deviceHash: { not: deviceHash },
      responses: {
        none: {
          deviceHash,
        },
      },
    },
    include: {
      responses: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (!candidates.length) {
    return null;
  }

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}

export async function getMyMessages(deviceHash: string) {
  return prisma.message.findMany({
    where: { deviceHash },
    include: { responses: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMessageById(id: string) {
  return prisma.message.findUnique({
    where: { id },
    include: { responses: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function createResponse({ messageId, deviceHash, body }: CreateResponseInput) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.findUnique({
      where: { id: messageId },
      include: { responses: true },
    });

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    if (message.deviceHash === deviceHash) {
      throw new Error('SELF_RESPONSE');
    }

    if (message.status !== MessageStatus.PENDING) {
      throw new Error('MESSAGE_ALREADY_ANSWERED');
    }

    const response = await tx.response.create({
      data: {
        messageId,
        deviceHash,
        body,
      },
    });

    await tx.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.ANSWERED,
      },
    });

    return { response, message };
  });
}

export async function createReport({ messageId, responseId, deviceHash, reason }: CreateReportInput) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        messageId: messageId ?? null,
        responseId: responseId ?? null,
        deviceHash,
        reason,
      },
    });

    if (responseId) {
      try {
        await tx.response.update({
          where: { id: responseId },
          data: { isReported: true },
        });
      } catch (error) {
        console.warn('[db] Failed to update response report flag', error);
      }
    }

    return report;
  });
}
