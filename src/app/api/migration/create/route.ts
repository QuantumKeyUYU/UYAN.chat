import { NextRequest, NextResponse } from 'next/server';

import { DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device/server';
import { createMigrationTokenForDevice } from '@/lib/migration';

type MigrationCreateResponse =
  | {
      ok: true;
      token: string;
      expiresAt: string;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  const deviceId = await resolveDeviceId(request);

  try {
    if (!deviceId) {
      return NextResponse.json<MigrationCreateResponse>(
        { ok: false, error: { code: 'device/not-identified', message: DEVICE_UNIDENTIFIED_ERROR } },
        { status: 400 },
      );
    }

    const { token, expiresAt } = await createMigrationTokenForDevice(deviceId);
    const response = NextResponse.json<MigrationCreateResponse>({
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
    });
    return attachDeviceCookie(response, deviceId);
  } catch (error) {
    console.error('[api/migration/create] Failed to create token', error);
    return NextResponse.json<MigrationCreateResponse>(
      {
        ok: false,
        error: {
          code: 'migration/create-failed',
          message: 'Не получилось подготовить ссылку для переноса.',
        },
      },
      { status: 500 },
    );
  }
}
