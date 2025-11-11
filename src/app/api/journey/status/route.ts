import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import { getJourneyStatus } from '@/lib/journey';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const debugInfo = await resolveDeviceIdDebugInfo(request);
  const effectiveDeviceId = debugInfo.effectiveDeviceId ?? debugInfo.resolvedDeviceId;

  if (!effectiveDeviceId) {
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  try {
    const status = await getJourneyStatus(effectiveDeviceId);
    const response = NextResponse.json({ status, debug: debugInfo });
    return attachDeviceCookie(response, status.effectiveDeviceId);
  } catch (error) {
    console.error('[journey/status] Failed to load status', error);
    return NextResponse.json({ error: 'Не удалось получить состояние пути устройства.' }, { status: 500 });
  }
}
