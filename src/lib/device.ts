import { DEVICE_COOKIE_MAX_AGE, DEVICE_COOKIE_NAME, DEVICE_STORAGE_KEY } from './device/constants';

const generateDeviceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `device_${timestamp}_${random}`;
};

const readCookie = (): string | null => {
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

const writeCookie = (deviceId: string) => {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${DEVICE_COOKIE_NAME}=${encodeURIComponent(deviceId)}; path=/; max-age=${DEVICE_COOKIE_MAX_AGE}; samesite=lax`;
  } catch (error) {
    console.warn('[device] Failed to set device cookie', error);
  }
};

const readLocalStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch (error) {
    console.warn('[device] Failed to read device from localStorage', error);
    return null;
  }
};

const writeLocalStorage = (deviceId: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch (error) {
    console.warn('[device] Failed to set device in localStorage', error);
  }
};

export interface DeviceStorageSnapshot {
  localStorageId: string | null;
  cookieId: string | null;
}

export const readPersistedDeviceId = (): DeviceStorageSnapshot => ({
  localStorageId: readLocalStorage(),
  cookieId: readCookie(),
});

export const persistDeviceId = (deviceId: string) => {
  const { localStorageId, cookieId } = readPersistedDeviceId();

  if (localStorageId && localStorageId !== deviceId && cookieId && cookieId !== deviceId) {
    console.warn('[device] Conflicting stored identifiers detected', {
      localStorageId,
      cookieId,
      nextDeviceId: deviceId,
    });
  }

  if (localStorageId !== deviceId) {
    writeLocalStorage(deviceId);
  }

  if (cookieId !== deviceId) {
    writeCookie(deviceId);
  }
};

export const clearPersistedDeviceId = () => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(DEVICE_STORAGE_KEY);
    } catch (error) {
      console.warn('[device] Failed to clear device from localStorage', error);
    }
  }

  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${DEVICE_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    } catch (error) {
      console.warn('[device] Failed to clear device cookie', error);
    }
  }
};

export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') {
    console.warn('[device] getOrCreateDeviceId called on the server. Returning ephemeral identifier.');
    return generateDeviceId();
  }

  const { localStorageId, cookieId } = readPersistedDeviceId();

  if (localStorageId && cookieId && localStorageId !== cookieId) {
    console.warn('[device] Conflicting device identifiers detected', {
      localStorageId,
      cookieId,
    });
  }

  const resolved = localStorageId ?? cookieId;

  if (resolved) {
    persistDeviceId(resolved);
    return resolved;
  }

  const deviceId = generateDeviceId();
  persistDeviceId(deviceId);
  return deviceId;
};

export const clearDeviceId = () => {
  clearPersistedDeviceId();
};
