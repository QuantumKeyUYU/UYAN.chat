'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useResolvedDeviceId } from './useResolvedDeviceId';

export type UserStats = {
  answersUnread: number;
  answersTotal: number;
  messagesWritten: number;
  responsesGiven: number;
  lastRepliesSeenAt?: number | null;
};

export type UserStatsState =
  | { status: 'idle' | 'loading'; data: null; error: null; quotaExceeded?: boolean }
  | { status: 'ready'; data: UserStats; error: null; quotaExceeded?: boolean }
  | { status: 'error'; data: UserStats | null; error: string; quotaExceeded?: boolean };

interface UserStatsContextValue {
  state: UserStatsState;
  refresh: () => Promise<void>;
  applyPatch: (patch: Partial<UserStats>) => void;
  markRepliesSeenLocal: () => void;
}

const UserStatsContext = createContext<UserStatsContextValue | undefined>(undefined);

const defaultContextState: UserStatsState = { status: 'idle', data: null, error: null };

const defaultContext: UserStatsContextValue = {
  state: defaultContextState,
  refresh: async () => {},
  applyPatch: () => {},
  markRepliesSeenLocal: () => {},
};

interface ProviderProps {
  children: ReactNode;
}

const buildInitialState = (): UserStatsState => ({ status: 'idle', data: null, error: null });

const normalizeStats = (payload: unknown): UserStats => {
  const value = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const toNumber = (input: unknown): number => {
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input === 'string') {
      const parsed = Number(input);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };

  const answersUnread = Math.max(0, toNumber(value.answersUnread));
  const answersTotal = Math.max(0, toNumber(value.answersTotal));
  const messagesWritten = Math.max(0, toNumber(value.messagesWritten));
  const responsesGiven = Math.max(0, toNumber(value.responsesGiven));
  const lastRepliesSeenAtRaw = value.lastRepliesSeenAt;
  const lastRepliesSeenAt =
    typeof lastRepliesSeenAtRaw === 'number' && Number.isFinite(lastRepliesSeenAtRaw)
      ? lastRepliesSeenAtRaw
      : null;

  return {
    answersUnread,
    answersTotal,
    messagesWritten,
    responsesGiven,
    lastRepliesSeenAt,
  };
};

export const UserStatsProvider = ({ children }: ProviderProps) => {
  const { deviceId, status: deviceStatus, resolving: deviceResolving } = useResolvedDeviceId();
  const [state, setState] = useState<UserStatsState>(buildInitialState);
  const pendingRef = useRef<Promise<void> | null>(null);
  const fetchedForRef = useRef<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchStats = useCallback(
    async (force = false) => {
      if (!deviceId) {
        hasFetchedRef.current = false;
        fetchedForRef.current = null;
        setState(buildInitialState());
        return;
      }

      const shouldSkip =
        !force &&
        hasFetchedRef.current &&
        fetchedForRef.current === deviceId &&
        (state.status === 'ready' || state.status === 'error');
      if (shouldSkip) {
        return;
      }

      if (pendingRef.current) {
        return pendingRef.current;
      }

      hasFetchedRef.current = true;
      fetchedForRef.current = deviceId;

      if (state.status === 'idle') {
        setState({ status: 'loading', data: null, error: null });
      }

      const promise = (async () => {
        try {
          const headers: HeadersInit = {};
          if (deviceId) {
            headers[DEVICE_ID_HEADER] = deviceId;
          }

          const response = await fetch('/api/stats/user', {
            headers,
            cache: 'no-store',
          });

          const payload = (await response.json().catch(() => null)) as
            | { stats?: unknown; code?: string; message?: string }
            | null;

          if (!response.ok) {
            const code = payload?.code ?? null;
            const message =
              typeof payload?.message === 'string'
                ? payload?.message
                : typeof payload?.code === 'string'
                  ? payload.code
                  : 'Не удалось загрузить статистику.';
            setState({
              status: 'error',
              data: state.status === 'ready' ? state.data : null,
              error: message,
              quotaExceeded: code === 'FIRESTORE_QUOTA_EXCEEDED',
            });
            return;
          }

          const stats = normalizeStats(payload?.stats);
          setState({ status: 'ready', data: stats, error: null });
        } catch (error) {
          console.warn('[useUserStats] Failed to fetch stats', error);
          setState({
            status: 'error',
            data: state.status === 'ready' ? state.data : null,
            error: 'Не удалось загрузить статистику.',
          });
        } finally {
          pendingRef.current = null;
        }
      })();

      pendingRef.current = promise;
      await promise;
    },
    [deviceId, state],
  );

  useEffect(() => {
    if (!deviceId) {
      hasFetchedRef.current = false;
      fetchedForRef.current = null;
    } else if (fetchedForRef.current !== deviceId) {
      hasFetchedRef.current = false;
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    if (deviceStatus !== 'ready' || deviceResolving) return;
    if (pendingRef.current) return;
    if (hasFetchedRef.current && fetchedForRef.current === deviceId) return;
    void fetchStats();
  }, [deviceId, deviceResolving, deviceStatus, fetchStats]);

  const refresh = useCallback(async () => {
    await fetchStats(true);
  }, [fetchStats]);

  const applyPatch = useCallback((patch: Partial<UserStats>) => {
    setState((prev) => {
      if (prev.status !== 'ready' || !prev.data) {
        return prev;
      }
      return { ...prev, data: { ...prev.data, ...patch } };
    });
  }, []);

  const markRepliesSeenLocal = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'ready' || !prev.data) {
        return prev;
      }
      return {
        ...prev,
        data: { ...prev.data, answersUnread: 0, lastRepliesSeenAt: Date.now() },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      state,
      refresh,
      applyPatch,
      markRepliesSeenLocal,
    }),
    [applyPatch, markRepliesSeenLocal, refresh, state],
  );

  return <UserStatsContext.Provider value={value}>{children}</UserStatsContext.Provider>;
};

export const useUserStats = () => {
  const context = useContext(UserStatsContext);
  if (!context) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useUserStats called outside of UserStatsProvider; returning default context');
    }
    return defaultContext;
  }
  return context;
};
