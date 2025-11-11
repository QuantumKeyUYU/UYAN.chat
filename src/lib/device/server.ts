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

export const readDeviceIdFromRequest = (request: NextRequest): string | null => {
  const headerId = sanitize(request.headers.get(DEVICE_ID_HEADER));
  if (headerId) return headerId;

  const cookieId = sanitize(request.cookies.get(DEVICE_COOKIE_NAME)?.value);
  if (cookieId) return cookieId;

  const queryId = sanitize(request.nextUrl.searchParams.get('deviceId'));
  if (queryId) return queryId; // Legacy support for older clients sending deviceId via query.

  return null;
};

export const resolveDeviceId = (
  request: NextRequest,
  bodyDeviceId?: unknown,
): string | null => {
  const fromRequest = readDeviceIdFromRequest(request);
  if (fromRequest) {
    return fromRequest;
  }

  return sanitize(typeof bodyDeviceId === 'string' ? bodyDeviceId : undefined);
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
