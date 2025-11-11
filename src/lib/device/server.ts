import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  DEVICE_COOKIE_MAX_AGE,
  DEVICE_COOKIE_NAME,
  DEVICE_ID_HEADER,
} from './constants';

const sanitize = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

interface DeviceIdSources {
  headerDeviceId: string | null;
  cookieDeviceId: string | null;
  queryDeviceId: string | null;
  bodyDeviceId: string | null;
}

export type DeviceIdResolvedFrom = 'header' | 'cookie' | 'query' | 'body';

type DeviceIdResolvedSourceKey = keyof DeviceIdSources;

const RESOLUTION_ORDER: ReadonlyArray<DeviceIdResolvedSourceKey> = [
  'headerDeviceId',
  'cookieDeviceId',
  'queryDeviceId',
  'bodyDeviceId',
];

const SOURCE_LABELS: Record<DeviceIdResolvedSourceKey, DeviceIdResolvedFrom> = {
  headerDeviceId: 'header',
  cookieDeviceId: 'cookie',
  queryDeviceId: 'query',
  bodyDeviceId: 'body',
};

const readDeviceIdSources = (
  request: NextRequest,
  bodyDeviceId?: unknown,
): DeviceIdSources => ({
  headerDeviceId: sanitize(request.headers.get(DEVICE_ID_HEADER)),
  cookieDeviceId: sanitize(request.cookies.get(DEVICE_COOKIE_NAME)?.value),
  queryDeviceId: sanitize(request.nextUrl.searchParams.get('deviceId')),
  bodyDeviceId: sanitize(typeof bodyDeviceId === 'string' ? bodyDeviceId : undefined),
});

const resolveFromSources = (
  sources: DeviceIdSources,
): { resolvedDeviceId: string | null; resolvedFrom: DeviceIdResolvedFrom | null } => {
  for (const key of RESOLUTION_ORDER) {
    const value = sources[key];
    if (value) {
      const resolvedFrom = SOURCE_LABELS[key];
      return { resolvedDeviceId: value, resolvedFrom };
    }
  }
  return { resolvedDeviceId: null, resolvedFrom: null };
};

const detectConflicts = (sources: DeviceIdSources): string[] => {
  const conflicts: string[] = [];
  for (let i = 0; i < RESOLUTION_ORDER.length; i += 1) {
    const sourceKeyA = RESOLUTION_ORDER[i];
    const valueA = sources[sourceKeyA];
    if (!valueA) continue;

    for (let j = i + 1; j < RESOLUTION_ORDER.length; j += 1) {
      const sourceKeyB = RESOLUTION_ORDER[j];
      const valueB = sources[sourceKeyB];
      if (!valueB || valueA === valueB) continue;

      const labelA = SOURCE_LABELS[sourceKeyA];
      const labelB = SOURCE_LABELS[sourceKeyB];
      conflicts.push(`${labelA} vs ${labelB}: ${valueA} ≠ ${valueB}`);
    }
  }

  return conflicts;
};

export const readDeviceIdFromRequest = (request: NextRequest): string | null =>
  resolveFromSources(readDeviceIdSources(request)).resolvedDeviceId;

export const resolveDeviceId = (
  request: NextRequest,
  bodyDeviceId?: unknown,
): string | null => {
  const sources = readDeviceIdSources(request, bodyDeviceId);
  const { resolvedDeviceId } = resolveFromSources(sources);
  const conflicts = detectConflicts(sources);

  if (conflicts.length > 0) {
    console.warn('[device/resolve] Conflicting device identifiers detected', {
      conflicts,
      sources,
    });
  }

  return resolvedDeviceId;
};

export interface DeviceIdDebugInfo extends DeviceIdSources {
  resolvedDeviceId: string | null;
  resolvedFrom?: DeviceIdResolvedFrom | null;
  conflicts: string[];
}

export const resolveDeviceIdDebugInfo = (
  request: NextRequest,
  bodyDeviceId?: unknown,
): DeviceIdDebugInfo => {
  const sources = readDeviceIdSources(request, bodyDeviceId);
  const { resolvedDeviceId, resolvedFrom } = resolveFromSources(sources);

  return {
    ...sources,
    resolvedDeviceId,
    resolvedFrom,
    conflicts: detectConflicts(sources),
  };
};

export const attachDeviceCookie = (response: NextResponse, deviceId: string) => {
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: deviceId,
    maxAge: DEVICE_COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  });
  return response;
};

export const clearDeviceCookie = (response: NextResponse) => {
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: '',
    maxAge: 0,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  });
  return response;
};
