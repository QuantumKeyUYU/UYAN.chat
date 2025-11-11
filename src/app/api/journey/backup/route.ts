import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import { createJourneyKeyForDevice, getJourneyStatus } from '@/lib/journey';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);

  if (!deviceId) {
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  try {
    const { identityKey, journey } = await createJourneyKeyForDevice(deviceId);
    const status = await getJourneyStatus(journey.primaryDeviceId);
    const response = NextResponse.json({ identityKey, journey, status }, { status: 201 });
    return attachDeviceCookie(response, status.effectiveDeviceId);
  } catch (error) {
    console.error('[journey/backup] Failed to create identity key', error);
    return NextResponse.json({ error: 'Не удалось сохранить путь устройства.' }, { status: 500 });
  }
}
