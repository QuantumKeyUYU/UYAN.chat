'use client';

const noopAsync = async () => {};
const noopSync = () => {};

export const useRepliesBadge = () => ({
  count: 0,
  hasUnseenReplies: false,
  loading: false,
  refresh: noopAsync,
  markAllSeen: noopAsync,
  syncFromMessages: noopSync,
});
