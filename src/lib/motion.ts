const KEY = 'uyan_reduced_motion';

export const loadReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(KEY) === '1';
};

export const saveReducedMotion = (value: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, value ? '1' : '0');
};
