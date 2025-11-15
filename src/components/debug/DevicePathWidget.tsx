'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEVICE_ID_HEADER, DEVICE_STORAGE_KEY } from '@/lib/device/constants';
import { readPersistedDeviceId } from '@/lib/device';
import type { DeviceIdDebugInfo } from '@/lib/device/server';
import { useDeviceStore } from '@/store/device';
import { useDeviceJourney } from '@/lib/hooks/useDeviceJourney';
import { useUserStats } from '@/lib/hooks/useUserStats';

const isDebugFlagEnabled = (): boolean => {
  const value = String(process.env.NEXT_PUBLIC_DEBUG_DEVICE ?? '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
};

const DEBUG_ENABLED = isDebugFlagEnabled();
const DEBUG_WIDGET_STATE_KEY = `${DEVICE_STORAGE_KEY}:debug-widget`;
const ENVIRONMENT = process.env.NODE_ENV ?? 'development';

const formatId = (value: string | null) => {
  if (!value) return '—';
  if (value.length <= 16) return value;
  return `${value.slice(0, 12)}…${value.slice(-4)}`;
};

const useClientMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

type StorageSnapshot = ReturnType<typeof readPersistedDeviceId>;

type StorageState = 'match' | 'mismatch' | 'missing';

interface StorageStatusEntry {
  label: string;
  value: string | null;
  state: StorageState;
}

interface StorageStatusMap {
  localStorage: StorageStatusEntry;
  cookie: StorageStatusEntry;
}

const DevicePathWidgetInner = () => {
  const mounted = useClientMounted();

  const deviceId = useDeviceStore((state) => state.id);
  const { state: statsState, refresh: refreshStats } = useUserStats();
  const { refresh } = useDeviceJourney({ autoloadStats: false });

  const [requestedStatsFor, setRequestedStatsFor] = useState<string | null>(null);
  const [storageSnapshot, setStorageSnapshot] = useState<StorageSnapshot>({
    localStorageId: null,
    cookieId: null,
  });
  const [copied, setCopied] = useState(false);
  const [serverInfo, setServerInfo] = useState<DeviceIdDebugInfo | null>(null);
  const [serverInfoError, setServerInfoError] = useState<string | null>(null);
  const [serverInfoLoading, setServerInfoLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refreshStorageSnapshot = useCallback(() => {
    setStorageSnapshot(readPersistedDeviceId());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refreshStorageSnapshot();
  }, [mounted, refreshStorageSnapshot, deviceId]);

  useEffect(() => {
    if (!mounted) return;

    try {
      const stored = window.localStorage.getItem(DEBUG_WIDGET_STATE_KEY);
      if (stored === 'expanded') {
        setExpanded(true);
      } else if (stored === 'collapsed') {
        setExpanded(false);
      }
    } catch (error) {
      console.warn('[device/debug-widget] Failed to read widget state', error);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(DEBUG_WIDGET_STATE_KEY, expanded ? 'expanded' : 'collapsed');
    } catch (error) {
      console.warn('[device/debug-widget] Failed to persist widget state', error);
    }
  }, [expanded, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleStorage = () => refreshStorageSnapshot();
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [mounted, refreshStorageSnapshot]);

  useEffect(() => {
    if (!mounted || !deviceId || requestedStatsFor === deviceId) return;
    if (statsState.status === 'ready' || statsState.status === 'error') return;

    setRequestedStatsFor(deviceId);
    void refreshStats();
  }, [deviceId, mounted, refreshStats, requestedStatsFor, statsState.status]);

  useEffect(() => {
    if (!deviceId) {
      setServerInfo(null);
      setServerInfoError(null);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!expanded) {
      setServerInfoLoading(false);
    }
  }, [expanded]);

  const fetchServerInfo = useCallback(async () => {
    if (!deviceId) {
      setServerInfo(null);
      setServerInfoError(null);
      return;
    }

    setServerInfoLoading(true);
    setServerInfoError(null);
    try {
      const response = await fetch('/api/device/debug', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = (await response.json()) as DeviceIdDebugInfo;
      setServerInfo(data);
    } catch (error) {
      console.warn('[device/debug-widget] Failed to load server info', error);
      setServerInfoError(error instanceof Error ? error.message : 'Unknown error');
      setServerInfo(null);
    } finally {
      setServerInfoLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!mounted || !expanded || !deviceId) return;
    void fetchServerInfo();
  }, [expanded, fetchServerInfo, mounted, deviceId]);

  const handleCopy = useCallback(async () => {
    if (!deviceId) return;
    if (!navigator.clipboard) {
      console.warn('[device/debug-widget] Clipboard API is not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn('[device/debug-widget] Failed to copy deviceId', error);
    }
  }, [deviceId]);

  const storageStatus = useMemo<StorageStatusMap>(() => {
    const { localStorageId, cookieId } = storageSnapshot;
    const localMatch = localStorageId === deviceId;
    const cookieMatch = cookieId === deviceId;
    return {
      localStorage: {
        label: 'localStorage',
        value: localStorageId,
        state: localStorageId ? (localMatch ? 'match' : 'mismatch') : 'missing',
      },
      cookie: {
        label: 'cookie',
        value: cookieId,
        state: cookieId ? (cookieMatch ? 'match' : 'mismatch') : 'missing',
      },
    };
  }, [deviceId, storageSnapshot]);

  const statsSummary = statsState.status === 'ready'
    ? `${statsState.data.messagesWritten} sent / ${statsState.data.responsesGiven} given / ${statsState.data.answersTotal} received`
    : '—';

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const serverSources = useMemo(
    () =>
      serverInfo
        ? (
            [
              { key: 'headerDeviceId', label: 'header', value: serverInfo.headerDeviceId },
              { key: 'cookieDeviceId', label: 'cookie', value: serverInfo.cookieDeviceId },
              { key: 'queryDeviceId', label: 'query', value: serverInfo.queryDeviceId },
              { key: 'bodyDeviceId', label: 'body', value: serverInfo.bodyDeviceId },
            ] as const
          ).map((entry) => ({
            ...entry,
            isResolved: serverInfo.resolvedFrom === entry.label,
          }))
        : [],
    [serverInfo],
  );

  const resolvedSourceLabel = serverInfo?.resolvedFrom ?? null;
  const effectiveDeviceId = serverInfo?.effectiveDeviceId ?? serverInfo?.resolvedDeviceId ?? null;
  const journeyDevices = serverInfo?.journeyDevices ?? null;
  const journeyIsAlias = serverInfo?.journeyIsAlias ?? false;

  if (!mounted) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-3 text-xs">
      <div className="pointer-events-auto">
        {expanded ? (
          <div className="rounded-lg border border-border-primary bg-bg-secondary/95 p-4 shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary">DeviceId</div>
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="text-[10px] uppercase tracking-wide text-text-secondary transition hover:text-text-primary"
                  >
                    Свернуть
                  </button>
                </div>
                <div className="font-mono text-sm text-text-primary">{formatId(deviceId)}</div>
                {effectiveDeviceId && effectiveDeviceId !== deviceId ? (
                  <div className="mt-1 text-[11px] font-mono text-emerald-300">
                    ↳ effective {formatId(effectiveDeviceId)}
                  </div>
                ) : null}
                <div className="mt-1 text-[10px] uppercase tracking-wide text-text-secondary">env: {ENVIRONMENT}</div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!deviceId}
                className="rounded bg-bg-tertiary px-3 py-1 text-[11px] font-medium text-text-primary transition hover:bg-bg-tertiary/80 disabled:cursor-not-allowed disabled:bg-bg-tertiary/40"
              >
                {copied ? 'Скопировано' : 'Скопировать'}
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Хранилище</div>
                <div className="mt-1 space-y-1 font-mono">
                  {Object.values(storageStatus).map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between gap-2">
                      <span>{entry.label}</span>
                      <span
                        className={
                          entry.state === 'match'
                            ? 'text-emerald-400'
                            : entry.state === 'mismatch'
                              ? 'text-amber-400'
                              : 'text-text-secondary'
                        }
                      >
                        {entry.state === 'match'
                          ? '✓'
                          : entry.state === 'mismatch'
                            ? '⚠'
                            : '—'}{' '}
                        {formatId(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Статистика</div>
                <div className="mt-1 font-mono text-text-primary">{statsSummary}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Портативный путь</div>
                {journeyDevices && journeyDevices.length > 0 ? (
                  <div className="mt-1 space-y-1 font-mono">
                    <div className={journeyIsAlias ? 'text-amber-300' : 'text-text-primary'}>
                      {journeyIsAlias ? 'alias' : 'primary'} · {journeyDevices.length} devices
                    </div>
                    <div className="text-text-secondary">{journeyDevices.map((value) => formatId(value)).join(', ')}</div>
                    {serverInfo?.journeyKeyPreview ? (
                      <div className="text-text-secondary">key: {serverInfo.journeyKeyPreview}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-1 font-mono text-text-secondary">—</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-text-secondary">
                  <span>Сервер</span>
                  <button
                    type="button"
                    onClick={() => void fetchServerInfo()}
                    disabled={serverInfoLoading || !deviceId}
                    className="text-[10px] uppercase tracking-wide text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Обновить
                  </button>
                </div>
                <div className="mt-1 space-y-1 font-mono">
                  {serverInfoLoading && <div className="text-text-secondary">Загрузка…</div>}
                  {serverInfoError && !serverInfoLoading && (
                    <div className="text-amber-400">Ошибка: {serverInfoError}</div>
                  )}
                  {serverInfo && !serverInfoLoading && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span>resolved</span>
                        <span className="text-text-primary">{formatId(serverInfo.resolvedDeviceId)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-text-secondary">
                        <span>source</span>
                        <span className="text-text-primary">{resolvedSourceLabel ?? '—'}</span>
                      </div>
                      {serverSources.map((entry) => (
                        <div
                          key={entry.key}
                          className={`flex items-center justify-between gap-2 ${
                            entry.isResolved ? 'text-emerald-300' : 'text-text-primary'
                          }`}
                        >
                          <span>{entry.label}</span>
                          <span>{formatId(entry.value)}</span>
                        </div>
                      ))}
                      {serverInfo.conflicts.length > 0 && (
                        <div className="mt-1 space-y-1 text-amber-400">
                          {serverInfo.conflicts.map((conflict) => (
                            <div key={conflict}>{conflict}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex w-full items-center justify-between rounded-full border border-border-primary bg-bg-secondary/80 px-4 py-2 text-[11px] font-medium text-text-primary shadow backdrop-blur transition hover:bg-bg-secondary"
          >
            <span className="uppercase tracking-wide text-text-secondary">Device debug</span>
            <span className="font-mono text-text-primary">{formatId(deviceId)}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const DevicePathWidget = () => {
  if (!DEBUG_ENABLED) {
    return null;
  }

  return <DevicePathWidgetInner />;
};

export default DevicePathWidget;
