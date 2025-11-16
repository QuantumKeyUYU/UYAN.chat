import { NextRequest } from 'next/server';

import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { hashDeviceId } from '@/lib/deviceHash';

export type DeviceContext = {
  deviceId: string;
  deviceHash: string;
};

export class DeviceContextError extends Error {
  code: 'MISSING_DEVICE_ID' | 'MISSING_DEVICE_SALT';
  status: number;

  constructor(code: DeviceContextError['code'], message: string, status = 400) {
    super(message);
    this.name = 'DeviceContextError';
    this.code = code;
    this.status = status;
  }
}

interface ResolveOptions {
  requireSalt?: boolean;
}

const resolveDeviceId = (request: NextRequest): string | null => {
  const raw = request.headers.get(DEVICE_ID_HEADER);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function getDeviceContext(request: NextRequest, options?: ResolveOptions): DeviceContext {
  const deviceId = resolveDeviceId(request);
  if (!deviceId) {
    throw new DeviceContextError('MISSING_DEVICE_ID', 'Device identifier is required.', 400);
  }

  if (!process.env.DEVICE_ID_SALT && options?.requireSalt && process.env.NODE_ENV === 'production') {
    throw new DeviceContextError('MISSING_DEVICE_SALT', 'DEVICE_ID_SALT is not configured.', 500);
  }

  const deviceHash = hashDeviceId(deviceId);
  return { deviceId, deviceHash };
}
