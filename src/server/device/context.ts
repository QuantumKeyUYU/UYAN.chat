import { createHash } from 'crypto';

import { NextRequest } from 'next/server';

import { DEVICE_ID_HEADER } from '@/lib/device/constants';

export class DeviceHeaderMissingError extends Error {
  constructor() {
    super('Device identifier is required');
    this.name = 'DeviceHeaderMissingError';
  }
}

export function getDeviceFromRequest(request: NextRequest) {
  const deviceId = request.headers.get(DEVICE_ID_HEADER)?.trim();
  if (!deviceId) {
    throw new DeviceHeaderMissingError();
  }

  const salt = process.env.DEVICE_ID_SALT;
  if (!salt) {
    throw new Error('DEVICE_ID_SALT is not configured');
  }

  const deviceHash = createHash('sha256').update(`${salt}:${deviceId}`).digest('hex');

  return { deviceId, deviceHash };
}
