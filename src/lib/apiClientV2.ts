'use client';

import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { getOrCreateDeviceId } from '@/lib/device';
import { useDeviceStore } from '@/store/device';

export interface MessageV2 {
  id: string;
  body: string;
  createdAt: string;
  hasResponse?: boolean;
}

export interface ResponseV2 {
  id: string;
  body: string;
  createdAt: string;
  message?: {
    id: string;
    body: string;
  };
}

export interface UserStatsV2 {
  messagesSent: number;
  responsesSent: number;
  responsesReceived: number;
  lastResponseReceivedAt: string | null;
}

export class ApiClientV2Error extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiClientV2Error';
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

const resolveDeviceId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const state = useDeviceStore.getState();
    if (state?.id) {
      return state.id;
    }

    const resolved = getOrCreateDeviceId();
    if (resolved && state?.setId) {
      state.setId(resolved);
    }
    return resolved;
  } catch (error) {
    console.warn('[apiClientV2] Failed to resolve device id', error);
    return null;
  }
};

const buildHeaders = (initHeaders?: HeadersInit): Headers => {
  const headers = new Headers(initHeaders);
  const deviceId = resolveDeviceId();
  if (deviceId) {
    headers.set(DEVICE_ID_HEADER, deviceId);
  }
  headers.set('Accept', 'application/json');
  return headers;
};

const parsePayload = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    console.warn('[apiClientV2] Failed to parse JSON response', error);
    return null;
  }
};

const request = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const headers = buildHeaders(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const payload = await parsePayload(response);
  const ok = typeof payload === 'object' && payload !== null ? (payload as { ok?: unknown }).ok : undefined;
  const code = typeof payload === 'object' && payload !== null ? ((payload as { code?: unknown }).code as string | undefined) : undefined;
  const message =
    typeof payload === 'object' && payload !== null
      ? ((payload as { message?: unknown }).message as string | undefined)
      : undefined;

  if (!response.ok || ok === false) {
    const errorMessage =
      message ||
      (code ? `Запрос завершился с ошибкой: ${code}` : `Запрос завершился с ошибкой (${response.status}).`);
    throw new ApiClientV2Error(errorMessage, {
      code,
      status: response.status,
      details: payload ?? undefined,
    });
  }

  if (ok !== true) {
    throw new ApiClientV2Error('Некорректный ответ от сервера.', {
      status: response.status,
      details: payload ?? undefined,
    });
  }

  return payload as T;
};

export async function postMessageV2(body: string): Promise<MessageV2> {
  const result = await request<{ ok: true; message: MessageV2 }>('/api/v2/messages', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return result.message;
}

export async function getRandomMessageV2(): Promise<MessageV2 | null> {
  try {
    const result = await request<{ ok: true; message: MessageV2 }>('/api/v2/messages/random');
    return result.message;
  } catch (error) {
    if (
      error instanceof ApiClientV2Error &&
      (error.code === 'NO_MESSAGES_AVAILABLE' || error.status === 404)
    ) {
      return null;
    }
    throw error;
  }
}

export async function postResponseV2(messageId: string, body: string): Promise<ResponseV2> {
  const result = await request<{ ok: true; response: ResponseV2 }>(`/api/v2/messages/${encodeURIComponent(messageId)}/response`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return result.response;
}

export async function getUserStatsV2(): Promise<UserStatsV2> {
  const result = await request<{ ok: true; stats: UserStatsV2 }>('/api/v2/stats/user');
  return result.stats;
}
