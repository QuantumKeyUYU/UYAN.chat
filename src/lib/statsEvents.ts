export const GLOBAL_STATS_REFRESH_EVENT = 'global-stats:refresh';

type Listener = () => void;

export const triggerGlobalStatsRefresh = () => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(GLOBAL_STATS_REFRESH_EVENT));
  } catch (error) {
    console.error('[statsEvents] Failed to dispatch global stats refresh event', error);
  }
};

export const addGlobalStatsRefreshListener = (listener: Listener) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(GLOBAL_STATS_REFRESH_EVENT, listener);

  return () => {
    window.removeEventListener(GLOBAL_STATS_REFRESH_EVENT, listener);
  };
};
