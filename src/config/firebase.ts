import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';

export type FirebaseStatus = 'idle' | 'initializing' | 'ready' | 'error';

type FirebaseEnvMap = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'apiKey';
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'authDomain';
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'projectId';
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'storageBucket';
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId';
  NEXT_PUBLIC_FIREBASE_APP_ID: 'appId';
};

const firebaseEnvMap: FirebaseEnvMap = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'apiKey',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'authDomain',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'projectId',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'appId',
};

export type FirebaseEnvKey = keyof FirebaseEnvMap;

export interface FirebaseEnvReportEntry {
  key: FirebaseEnvKey;
  present: boolean;
}

interface FirebaseInitState {
  app: FirebaseApp | null;
  status: FirebaseStatus;
  error: Error | null;
  demoMode: boolean;
  envReport: FirebaseEnvReportEntry[];
}

const readEnvValue = (key: FirebaseEnvKey): string => process.env[key]?.trim() ?? '';

const buildFirebaseConfig = () => {
  const config: Record<string, string> = {};
  (Object.keys(firebaseEnvMap) as FirebaseEnvKey[]).forEach((key) => {
    const targetKey = firebaseEnvMap[key];
    config[targetKey] = readEnvValue(key);
  });
  return config;
};

export const getFirebaseEnvReport = (): FirebaseEnvReportEntry[] =>
  (Object.keys(firebaseEnvMap) as FirebaseEnvKey[]).map((key) => ({
    key,
    present: Boolean(readEnvValue(key)),
  }));

let cachedApp: FirebaseApp | null = null;
let cachedStatus: FirebaseStatus = 'idle';
let cachedError: Error | null = null;
let cachedDemoMode = true;

export const initializeFirebaseClient = async (): Promise<FirebaseInitState> => {
  const envReport = getFirebaseEnvReport();
  const configComplete = envReport.every((entry) => entry.present);

  if (cachedApp) {
    return {
      app: cachedApp,
      status: cachedStatus,
      error: cachedError,
      demoMode: cachedDemoMode,
      envReport,
    };
  }

  if (typeof window === 'undefined') {
    return {
      app: null,
      status: cachedStatus,
      error: cachedError,
      demoMode: cachedDemoMode || !configComplete,
      envReport,
    };
  }

  if (!configComplete) {
    cachedStatus = 'error';
    cachedError = new Error('Firebase config is incomplete. Using demo mode.');
    cachedDemoMode = true;
    return {
      app: null,
      status: cachedStatus,
      error: cachedError,
      demoMode: true,
      envReport,
    };
  }

  try {
    cachedStatus = 'initializing';
    const config = buildFirebaseConfig();
    const [existing] = getApps();
    cachedApp = existing ?? initializeApp(config);
    cachedStatus = 'ready';
    cachedError = null;
    cachedDemoMode = false;
  } catch (error) {
    cachedStatus = 'error';
    cachedError = error instanceof Error ? error : new Error('Unknown Firebase init error');
    cachedApp = null;
    cachedDemoMode = true;
    console.error('[firebase] Failed to initialize Firebase client', error);
  }

  return {
    app: cachedApp,
    status: cachedStatus,
    error: cachedError,
    demoMode: cachedDemoMode,
    envReport,
  };
};

export const getFirebaseDiagnostics = () => ({
  status: cachedStatus,
  error: cachedError ? cachedError.message : null,
  demoMode: cachedDemoMode,
  envReport: getFirebaseEnvReport(),
});
