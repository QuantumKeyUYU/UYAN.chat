import { DEVICE_COOKIE_MAX_AGE, DEVICE_COOKIE_NAME, DEVICE_STORAGE_KEY } from './device/constants';

const generateDeviceId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `device_${timestamp}_${random}`;
};

const getCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [rawName, ...rest] = cookie.trim().split('=');
      if (rawName === DEVICE_COOKIE_NAME) {
        return decodeURIComponent(rest.join('='));
      }
    }
  } catch (error) {
    console.warn('[device] Failed to read device cookie', error);
  }
  return null;
};

const setCookie = (deviceId: string) => {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${DEVICE_COOKIE_NAME}=${encodeURIComponent(deviceId)}; path=/; max-age=${DEVICE_COOKIE_MAX_AGE}; samesite=lax`;
  } catch (error) {
    console.warn('[device] Failed to set device cookie', error);
  }
};

const getLocalStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch (error) {
    console.warn('[device] Failed to read device from localStorage', error);
    return null;
  }
};

const setLocalStorage = (deviceId: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch (error) {
    console.warn('[device] Failed to set device in localStorage', error);
  }
};

const persistDeviceId = (deviceId: string) => {
  setLocalStorage(deviceId);
  setCookie(deviceId);
};

export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return generateDeviceId();
  }

  const stored = getLocalStorage();
  const cookie = getCookie();
  const existing = stored || cookie;
  if (existing) {
    if (!stored) {
      setLocalStorage(existing);
    }
    if (!cookie) {
      setCookie(existing);
    }
    return existing;
  }

  const id = generateDeviceId();
  persistDeviceId(id);
  return id;
};

export const clearDeviceId = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch (error) {
    console.warn('[device] Failed to clear device from localStorage', error);
  }
  try {
    document.cookie = `${DEVICE_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  } catch (error) {
    console.warn('[device] Failed to clear device cookie', error);
  }
};
