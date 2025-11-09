const DEVICE_KEY = 'uyan_device_id';

const generateDeviceId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `device_${timestamp}_${random}`;
};

export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return generateDeviceId();
  }

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const id = generateDeviceId();
  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
};

export const clearDeviceId = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEVICE_KEY);
};
