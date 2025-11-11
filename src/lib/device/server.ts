import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DEVICE_COOKIE_MAX_AGE, DEVICE_COOKIE_NAME, DEVICE_ID_HEADER } from './constants';
import { getJourneyDebugSnapshot, resolveJourneyForDevice } from '../journey';

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

// Device resolution intentionally stays decoupled from any future identityKey logic.
// We can replace the raw deviceId with another key without restructuring the API surface.
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

export interface DeviceIdDebugInfo extends DeviceIdSources {
  resolvedDeviceId: string | null;
  resolvedFrom?: DeviceIdResolvedFrom | null;
  conflicts: string[];
  effectiveDeviceId?: string | null;
  journeyId?: string | null;
  journeyDevices?: string[];
  journeyDeviceHashes?: string[];
  journeyIsAlias?: boolean;
  journeyKeyPreview?: string | null;
}

export interface DeviceIdentityResolution extends DeviceIdDebugInfo {
  effectiveDeviceId: string | null;
  journeyId: string | null;
  journeyIsAlias: boolean;
}

export const resolveDeviceIdentity = async (
  request: NextRequest,
  bodyDeviceId?: unknown,
): Promise<DeviceIdentityResolution> => {
  const sources = readDeviceIdSources(request, bodyDeviceId);
  const { resolvedDeviceId, resolvedFrom } = resolveFromSources(sources);
  const conflicts = detectConflicts(sources);

  if (conflicts.length > 0) {
    console.warn('[device/resolve] Conflicting device identifiers detected', {
      conflicts,
      sources,
    });
  }

  let effectiveDeviceId: string | null = resolvedDeviceId;
  let journeyId: string | null = null;
  let journeyDevices: string[] | undefined;
  let journeyDeviceHashes: string[] | undefined;
  let journeyIsAlias = false;
  let journeyKeyPreview: string | null | undefined;

  if (resolvedDeviceId) {
    const resolution = await resolveJourneyForDevice(resolvedDeviceId);
    if (resolution) {
      effectiveDeviceId = resolution.effectiveDeviceId;
      journeyId = resolution.journeyId;
      journeyDevices = resolution.attachedDevices;
      journeyDeviceHashes = resolution.attachedDeviceHashes;
      journeyIsAlias = resolution.isAlias;

      if (journeyIsAlias) {
        const debugSnapshot = await getJourneyDebugSnapshot(resolvedDeviceId);
        journeyKeyPreview = debugSnapshot?.lastKeyPreview ?? null;
      }
    }
  }

  return {
    ...sources,
    resolvedDeviceId,
    resolvedFrom,
    conflicts,
    effectiveDeviceId,
    journeyId,
    journeyDevices,
    journeyDeviceHashes,
    journeyIsAlias,
    journeyKeyPreview,
  };
};

export const resolveDeviceId = async (
  request: NextRequest,
  bodyDeviceId?: unknown,
): Promise<string | null> => {
  const resolution = await resolveDeviceIdentity(request, bodyDeviceId);
  return resolution.effectiveDeviceId ?? resolution.resolvedDeviceId;
};

export const resolveDeviceIdDebugInfo = (
  request: NextRequest,
  bodyDeviceId?: unknown,
): Promise<DeviceIdDebugInfo> => resolveDeviceIdentity(request, bodyDeviceId);

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
