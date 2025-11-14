import type { Firestore, Timestamp } from 'firebase-admin/firestore';

const waitingMessagesBaseQuery = (db: Firestore) =>
  db
    .collection('messages')
    .where('status', '==', 'waiting')
    .where('moderationPassed', '==', true);

export const buildWaitingMessagesQuery = (db: Firestore) => waitingMessagesBaseQuery(db);

export const buildActiveWaitingMessagesQuery = (db: Firestore, now: Timestamp) =>
  waitingMessagesBaseQuery(db).where('expiresAt', '>', now);
