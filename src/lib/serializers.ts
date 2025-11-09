import { Timestamp } from 'firebase-admin/firestore';

export const serializeTimestamp = (timestamp: Timestamp | undefined | null) => {
  if (!timestamp) return null;
  return timestamp.toMillis();
};

export const serializeDoc = (data: Record<string, unknown> & { id?: string }) => {
  const result: Record<string, unknown> = { ...data };
  Object.entries(result).forEach(([key, value]) => {
    if (value instanceof Timestamp) {
      result[key] = serializeTimestamp(value);
    }
  });
  return result;
};
