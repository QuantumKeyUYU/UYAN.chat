import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceIdDebugInfo } from '@/lib/device/server';
import { attachDeviceToJourney, getJourneyStatus, mergeDevicePath } from '@/lib/journey';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface AttachRequestBody {
  identityKey?: string;
}

export async function POST(request: NextRequest) {
  const { identityKey } = (await request.json()) as AttachRequestBody;

  if (!identityKey || typeof identityKey !== 'string') {
    return NextResponse.json({ error: 'Нужен ключ пути.' }, { status: 400 });
  }

  const debugInfo = await resolveDeviceIdDebugInfo(request);
  const resolvedDeviceId = debugInfo.resolvedDeviceId ?? debugInfo.effectiveDeviceId;

  if (!resolvedDeviceId) {
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  try {
    const attachment = await attachDeviceToJourney(identityKey, resolvedDeviceId);
    let merge = null;

    if (!attachment.alreadyAttached && attachment.journey.primaryDeviceId !== resolvedDeviceId) {
      merge = await mergeDevicePath(resolvedDeviceId, attachment.journey.primaryDeviceId);
    }

    const status = await getJourneyStatus(attachment.journey.primaryDeviceId);
    const response = NextResponse.json(
      {
        ok: true,
        alreadyAttached: attachment.alreadyAttached,
        status,
        merge,
      },
      { status: 200 },
    );

    return attachDeviceCookie(response, status.effectiveDeviceId);
  } catch (error) {
    console.warn('[journey/attach] Failed to attach journey', error);
    const isNotFound = error instanceof Error && error.message === 'Identity key not found';
    const message = isNotFound
      ? 'Не удалось найти такой ключ. Проверь, всё ли верно ввёл.'
      : 'Не получилось восстановить путь. Попробуй ещё раз.';
    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : 500 });
  }
}
