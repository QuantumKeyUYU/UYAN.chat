import crypto from 'crypto';

import { prisma } from './prismaClient';

export function getDeviceHashV2(rawDeviceId: string): string {
  const salt = process.env.DEVICE_ID_SALT;
  if (!salt) {
    throw new Error('DEVICE_ID_SALT is not set');
  }
  return crypto.createHash('sha256').update(salt + rawDeviceId).digest('hex');
}

export async function resolveDeviceV2(rawDeviceId: string) {
  const deviceHash = getDeviceHashV2(rawDeviceId);

  const existing = await prisma.device.findUnique({
    where: { deviceHash },
  });

  if (existing) {
    try {
      return await prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    } catch (error) {
      console.error('[deviceV2] Failed to update lastSeenAt', error);
      return existing;
    }
  }

  const device = await prisma.$transaction(async (tx: any) => {
    const created = await tx.device.create({
      data: {
        deviceHash,
      },
    });

    await tx.globalStats.upsert({
      where: { id: 1 },
      update: {
        devicesTotal: { increment: 1 },
      },
      create: {
        id: 1,
        devicesTotal: 1,
      },
    });

    return created;
  });

  return device;
}
