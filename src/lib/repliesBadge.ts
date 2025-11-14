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

export function setLastRepliesSeenAt(value: number | null): number | null {
  if (typeof window === 'undefined') return null;
  if (value == null || !Number.isFinite(value)) {
    window.localStorage.removeItem(LAST_REPLIES_SEEN_KEY);
    const event = new CustomEvent(LAST_REPLIES_SEEN_EVENT, { detail: { value: null } });
    window.dispatchEvent(event);
    return null;
  }
  const normalized = Number(value);
  window.localStorage.setItem(LAST_REPLIES_SEEN_KEY, String(normalized));
  const event = new CustomEvent(LAST_REPLIES_SEEN_EVENT, { detail: { value: normalized } });
  window.dispatchEvent(event);
  return normalized;
}

export function setLastRepliesSeenNow(): number | null {
  return setLastRepliesSeenAt(Date.now());
}
