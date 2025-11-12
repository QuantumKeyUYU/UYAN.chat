import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import { applyMigrationToken } from '@/lib/migration';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);

  if (!deviceId) {
    return NextResponse.json({ error: DEVICE_UNIDENTIFIED_ERROR }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const token = (body?.token ?? null) as string | null;

    if (!token) {
      return NextResponse.json({ error: 'Не хватает токена переноса.' }, { status: 400 });
    }

    const result = await applyMigrationToken(token, deviceId);

    const response = NextResponse.json({
      migratedDeviceId: result.migratedDeviceId,
    });

    return attachDeviceCookie(response, result.migratedDeviceId);
  } catch (error) {
    console.error('[api/migration/apply] Failed to apply migration token', error);

    const message =
      error instanceof Error ? error.message : 'migration/unknown';

    switch (message) {
      case 'migration/invalid-token':
        return NextResponse.json({ error: 'Некорректный токен переноса.' }, { status: 400 });
      case 'migration/not-found':
        return NextResponse.json({ error: 'Мы не нашли такой токен. Проверь ссылку.' }, { status: 404 });
      case 'migration/already-used':
        return NextResponse.json({ error: 'Эта ссылка уже использована.' }, { status: 400 });
      case 'migration/expired':
        return NextResponse.json({ error: 'Срок действия ссылки закончился. Создай новую.' }, { status: 410 });
      default:
        return NextResponse.json({ error: 'Не получилось перенести архив. Попробуй ещё раз.' }, { status: 500 });
    }
  }
}
