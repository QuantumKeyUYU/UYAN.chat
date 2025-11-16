import { MessageStatus, Prisma } from '@prisma/client';

import { prisma } from '@/server/db/client';

export type MessageWithResponses = Prisma.MessageGetPayload<{
  include: { responses: true };
}>;

export async function createMessage(params: { deviceHash: string; body: string }) {
  const { deviceHash, body } = params;
  return prisma.message.create({
    data: {
      deviceHash,
      body,
      status: MessageStatus.PENDING,
    },
  });
}

export async function getRandomMessageForSupport(params: { deviceHash: string }) {
  const { deviceHash } = params;
  const candidates = await prisma.message.findMany({
    where: {
      deviceHash: { not: deviceHash },
      status: MessageStatus.PENDING,
      responses: { none: {} },
    },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  if (candidates.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

export function getMessageById(id: string) {
  return prisma.message.findUnique({
    where: { id },
    include: {
      responses: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export function getMessagesForDevice(deviceHash: string) {
  return prisma.message.findMany({
    where: { deviceHash },
    include: {
      responses: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createResponse(params: {
  messageId: string;
  deviceHash: string;
  body: string;
}) {
  const { messageId, deviceHash, body } = params;

  return prisma.$transaction(async (tx) => {
    const message = await tx.message.findUnique({
      where: { id: messageId },
      select: { deviceHash: true, status: true },
    });

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    if (message.deviceHash === deviceHash) {
      throw new Error('CANNOT_ANSWER_OWN_MESSAGE');
    }

    if (message.status !== MessageStatus.PENDING) {
      throw new Error('MESSAGE_ALREADY_ANSWERED');
    }

    const response = await tx.response.create({
      data: {
        body,
        deviceHash,
        messageId,
      },
    });

    await tx.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.ANSWERED },
    });

    return response;
  });
}

export function createReport(params: {
  messageId?: string;
  responseId?: string;
  deviceHash: string;
  reason: string;
  description?: string;
}) {
  const { messageId, responseId, deviceHash, reason, description } = params;

  if (!messageId && !responseId) {
    throw new Error('REPORT_TARGET_REQUIRED');
  }

  return prisma.report.create({
    data: {
      messageId,
      responseId,
      deviceHash,
      reason,
      description,
    },
  });
}
