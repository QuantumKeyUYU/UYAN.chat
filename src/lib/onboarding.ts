const KEY = 'uyan_onboarding_done';

export const isOnboardingDone = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(KEY) === '1';
};

export const setOnboardingDone = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, '1');
};
