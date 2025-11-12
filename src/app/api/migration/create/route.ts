import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import { createMigrationTokenForDevice } from '@/lib/migration';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);

  if (!deviceId) {
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  try {
    const { token, expiresAt } = await createMigrationTokenForDevice(deviceId);
    const response = NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
    });
    return attachDeviceCookie(response, deviceId);
  } catch (error) {
    console.error('[api/migration/create] Failed to create token', error);
    return NextResponse.json({ error: 'Не получилось подготовить ссылку для переноса.' }, { status: 500 });
  }
}
