'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ReplyEntry {
  id: string;
  messageId: string | null;
  createdAt: number;
  seenAt: number | null;
  seen: boolean;
}

interface RepliesState {
  replies: ReplyEntry[];
  unseenCount: number;
  initialized: boolean;
  loading: boolean;
  lastSeenAt: number | null;
  replaceReplies: (replies: ReplyEntry[], options?: { lastSeenAt?: number | null }) => void;
  markAllSeenLocal: (timestamp?: number) => void;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setLastSeenAt: (value: number | null) => void;
}

const normalizeReply = (reply: ReplyEntry, lastSeenAt: number | null): ReplyEntry => {
  const createdAt = Number.isFinite(reply.createdAt) ? reply.createdAt : 0;
  const seenAtCandidate = Number.isFinite(reply.seenAt ?? NaN) ? reply.seenAt : null;
  const isSeen = reply.seen || (lastSeenAt != null && createdAt <= lastSeenAt);
  return {
    id: reply.id,
    messageId: reply.messageId ?? null,
    createdAt,
    seen: isSeen,
    seenAt: isSeen ? seenAtCandidate ?? (lastSeenAt ?? createdAt) : null,
  } satisfies ReplyEntry;
};

export const useRepliesStore = create<RepliesState>()(
  subscribeWithSelector((set) => ({
    replies: [],
    unseenCount: 0,
    initialized: false,
    loading: false,
    lastSeenAt: null,
    replaceReplies: (replies, options) =>
      set((state) => {
        const effectiveLastSeen =
          typeof options?.lastSeenAt === 'number' && Number.isFinite(options.lastSeenAt)
            ? options.lastSeenAt
            : state.lastSeenAt;
        const normalized = replies
          .map((reply) => normalizeReply(reply, effectiveLastSeen ?? null))
          .sort((a, b) => a.createdAt - b.createdAt);
        const unseenCount = normalized.reduce((total, entry) => (entry.seen ? total : total + 1), 0);
        return {
          replies: normalized,
          unseenCount,
          lastSeenAt: effectiveLastSeen ?? state.lastSeenAt ?? null,
        } satisfies Partial<RepliesState>;
      }),
    markAllSeenLocal: (timestamp) =>
      set((state) => {
        const effectiveTimestamp =
          typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : Date.now();
        const replies = state.replies.map((reply) => ({
          ...reply,
          seen: true,
          seenAt: effectiveTimestamp,
        }));
        return {
          replies,
          unseenCount: 0,
          lastSeenAt: effectiveTimestamp,
        } satisfies Partial<RepliesState>;
      }),
    setInitialized: (value) => set({ initialized: value }),
    setLoading: (value) => set({ loading: value }),
    setLastSeenAt: (value) =>
      set((state) => {
        const normalized = typeof value === 'number' && Number.isFinite(value) ? value : null;
        if (state.lastSeenAt === normalized) {
          return state;
        }
        const replies = state.replies.map((reply) => normalizeReply(reply, normalized));
        const unseenCount = replies.reduce((total, entry) => (entry.seen ? total : total + 1), 0);
        return {
          replies,
          unseenCount,
          lastSeenAt: normalized,
        } satisfies Partial<RepliesState>;
      }),
  })),
);
