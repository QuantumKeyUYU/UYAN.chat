import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolveDeviceIdDebugInfo } from '@/lib/device/server';

const extractBodyDeviceId = (body: unknown): string | undefined => {
  if (typeof body === 'string') {
    return body;
  }

  if (body && typeof body === 'object' && 'deviceId' in body) {
    const value = (body as { deviceId?: unknown }).deviceId;
    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
};

const readBodyDeviceId = async (request: NextRequest): Promise<string | undefined> => {
  if (request.method !== 'POST') {
    return undefined;
  }

  try {
    const body = await request.json();
    return extractBodyDeviceId(body);
  } catch (error) {
    console.warn('[device/debug] Failed to parse request body', error);
    return undefined;
  }
};

const buildDebugResponse = async (request: NextRequest, bodyDeviceId?: string) =>
  NextResponse.json(await resolveDeviceIdDebugInfo(request, bodyDeviceId));

export const GET = async (request: NextRequest) => buildDebugResponse(request);

export const POST = async (request: NextRequest) => {
  const bodyDeviceId = await readBodyDeviceId(request);
  return buildDebugResponse(request, bodyDeviceId);
};
