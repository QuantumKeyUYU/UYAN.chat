export const GLOBAL_STATS_REFRESH_EVENT = 'global-stats:refresh';

type Listener = () => void;

export const triggerGlobalStatsRefresh = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GLOBAL_STATS_REFRESH_EVENT));
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
