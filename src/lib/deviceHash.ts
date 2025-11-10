import crypto from 'crypto';

const SALT = process.env.DEVICE_ID_SALT;

if (!SALT) {
  console.warn('[deviceHash] DEVICE_ID_SALT is not set. Falling back to insecure development salt.');
}

const effectiveSalt = SALT ?? 'dev-salt';

export function hashDeviceId(deviceId: string): string {
  return crypto.createHash('sha256').update(`${effectiveSalt}:${deviceId}`).digest('hex');
}
