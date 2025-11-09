import type { Timestamp } from 'firebase-admin/firestore';
import type { Message } from '@/types/firestore';

export type AdminMessageDoc = Omit<Message, 'id' | 'createdAt' | 'answeredAt' | 'expiresAt'> & {
  createdAt: Timestamp;
  answeredAt?: Timestamp;
  expiresAt: Timestamp;
  [key: string]: unknown;
};

export type AdminMessage = AdminMessageDoc & { id: string };
