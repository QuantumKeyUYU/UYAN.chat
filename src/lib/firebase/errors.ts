import { Status } from '@google-cloud/firestore';

const RESOURCE_EXHAUSTED_CODE = Status.RESOURCE_EXHAUSTED ?? 8;

const normalizeErrorCode = (error: unknown): number | string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'number' || typeof code === 'string') {
    return code;
  }

  return null;
};

const normalizeErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
};

export const isFirestoreQuotaError = (error: unknown): boolean => {
  const code = normalizeErrorCode(error);
  if (typeof code === 'number' && code === RESOURCE_EXHAUSTED_CODE) {
    return true;
  }

  if (typeof code === 'string' && (code === 'RESOURCE_EXHAUSTED' || code === '8')) {
    return true;
  }

  const message = normalizeErrorMessage(error);
  return message ? message.includes('RESOURCE_EXHAUSTED') : false;
};
