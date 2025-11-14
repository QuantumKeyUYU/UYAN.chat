'use client';

const noopAsync = async (..._args: unknown[]) => {};
const noopSync = (..._args: unknown[]) => {};

export const useRepliesBadge = () => ({
  count: 0,
  hasUnseenReplies: false,
  loading: false,
  refresh: noopAsync,
  markAllSeen: noopAsync,
  syncFromMessages: noopSync,
});
