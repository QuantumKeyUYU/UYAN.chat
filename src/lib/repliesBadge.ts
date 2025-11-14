'use client';

export const LAST_REPLIES_SEEN_KEY = 'uyan.lastRepliesSeenAt';
export const LAST_REPLIES_SEEN_EVENT = 'uyan:lastRepliesSeenAt';

export function getLastRepliesSeenAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LAST_REPLIES_SEEN_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export function setLastRepliesSeenNow(): number | null {
  if (typeof window === 'undefined') return null;
  const value = Date.now();
  window.localStorage.setItem(LAST_REPLIES_SEEN_KEY, String(value));
  const event = new CustomEvent(LAST_REPLIES_SEEN_EVENT, { detail: { value } });
  window.dispatchEvent(event);
  return value;
}
