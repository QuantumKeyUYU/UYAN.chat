'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import Providers from '@/components/layout/Providers';
import { getFirebaseEnvReport, initializeFirebaseClient, type FirebaseEnvReportEntry, type FirebaseStatus } from '@/config/firebase';
import { useDeviceStore } from '@/store/device';

interface FirebaseContextValue {
  status: FirebaseStatus;
  demoMode: boolean;
  error: string | null;
  app: FirebaseApp | null;
  envReport: FirebaseEnvReportEntry[];
  refresh: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const useFirebaseContext = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebaseContext must be used within ClientProviders');
  }
  return context;
};

const ClientProviders = ({ children }: { children: ReactNode }) => {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [status, setStatus] = useState<FirebaseStatus>('idle');
  const [demoMode, setDemoMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envReport, setEnvReport] = useState<FirebaseEnvReportEntry[]>(() => getFirebaseEnvReport());

  const setFirebaseStatus = useDeviceStore((state) => state.setFirebaseStatus);
  const setFirebaseError = useDeviceStore((state) => state.setFirebaseError);
  const setDeviceDemoMode = useDeviceStore((state) => state.setDemoMode);

  const syncState = useCallback(
    (nextStatus: FirebaseStatus, nextDemoMode: boolean, nextError: string | null, nextEnvReport: FirebaseEnvReportEntry[]) => {
      setStatus(nextStatus);
      setDemoMode(nextDemoMode);
      setError(nextError);
      setEnvReport(nextEnvReport);
      setFirebaseStatus(nextStatus);
      setFirebaseError(nextError);
      setDeviceDemoMode(nextDemoMode);
    },
    [setDeviceDemoMode, setFirebaseError, setFirebaseStatus],
  );

  const refresh = useCallback(async () => {
    const result = await initializeFirebaseClient();
    setApp(result.app);
    syncState(result.status, result.demoMode, result.error ? result.error.message : null, result.envReport);
  }, [syncState]);

  useEffect(() => {
    refresh().catch((refreshError) => {
      console.error('[client-providers] Unable to initialize Firebase', refreshError);
      syncState(
        'error',
        true,
        refreshError instanceof Error ? refreshError.message : 'Unknown error',
        getFirebaseEnvReport(),
      );
    });
  }, [refresh, syncState]);

  const value = useMemo(
    () => ({
      status,
      demoMode,
      error,
      app,
      envReport,
      refresh,
    }),
    [app, demoMode, envReport, error, refresh, status],
  );

  return (
    <FirebaseContext.Provider value={value}>
      <Providers>{children}</Providers>
    </FirebaseContext.Provider>
  );
};

export default ClientProviders;
