const FIREBASE_QUOTA_CODE = 8; // RESOURCE_EXHAUSTED

type FirestoreLikeError = {
  code?: number | string;
  message?: unknown;
  details?: unknown;
};

const extractMessage = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value);
};

export const isFirestoreQuotaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message, details } = error as FirestoreLikeError;

  if (code === FIREBASE_QUOTA_CODE || code === 'RESOURCE_EXHAUSTED' || code === '8') {
    return true;
  }

  const combinedMessage = `${extractMessage(message)} ${extractMessage(details)}`.trim();
  if (!combinedMessage) {
    return false;
  }

  return combinedMessage.includes('Quota exceeded') || combinedMessage.includes('RESOURCE_EXHAUSTED');
};
