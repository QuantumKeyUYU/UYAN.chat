'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useBackendStore } from '@/store/backend';
import { useDeviceStore } from '@/store/device';
import { useWeekCrewStore } from '@/store/weekcrew';

export default function DebugPage() {
  const backendState = useBackendStore();
  const setBackendState = useBackendStore((state) => state.setState);
  const deviceState = useDeviceStore();
  const weekCrewState = useWeekCrewStore();

  const envSummary = useMemo(
    () => [
      { key: 'DATABASE_URL', present: backendState.db === 'ok' },
      { key: 'OPENAI_API_KEY', present: backendState.moderation === 'ok' },
    ],
    [backendState.db, backendState.moderation],
  );

  const refreshBackend = async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('Health check failed');
      const payload = (await response.json().catch(() => null)) as {
        db?: 'ok' | 'error';
        moderation?: 'ok' | 'error';
      } | null;
      const db = payload?.db === 'ok' ? 'ok' : 'error';
      const moderation = payload?.moderation === 'ok' ? 'ok' : 'error';
      setBackendState({
        status: db === 'ok' && moderation === 'ok' ? 'online' : 'degraded',
        db,
        moderation,
        error: null,
        lastCheckedAt: Date.now(),
      });
    } catch (error) {
      setBackendState({
        status: 'offline',
        db: null,
        moderation: null,
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheckedAt: Date.now(),
      });
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">debug</p>
        <h1 className="text-3xl font-semibold text-text-primary">Диагностика среды</h1>
        <p className="text-sm text-text-secondary">
          Страница помогает понять, почему интерфейс может казаться пустым. Здесь есть статус бэкенда, состояние Zustand-сторов и
          наличие ключевых переменных окружения.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Backend health</h2>
            <p className="text-sm text-text-secondary">
              Статус: <span className="font-mono text-text-primary">{backendState.status}</span>
            </p>
            <p className="text-xs text-text-tertiary">DB: {backendState.db ?? 'unknown'} · Moderation: {backendState.moderation ?? 'unknown'}</p>
            {backendState.error ? <p className="text-sm text-rose-200">{backendState.error}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refreshBackend()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-text-primary transition hover:border-white/50"
            >
              Обновить статус
            </button>
            <Link
              href="/healthz"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-text-primary transition hover:border-white/50"
            >
              /healthz
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-text-secondary md:grid-cols-2">
          {envSummary.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
              <span className="font-mono text-xs">{entry.key}</span>
              <span className={`text-xs font-semibold ${entry.present ? 'text-emerald-300' : 'text-rose-300'}`}>
                {entry.present ? 'есть' : 'нет'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-bg-secondary/70 p-5">
          <h2 className="text-lg font-semibold text-text-primary">Zustand · device</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-emerald-100">
            {JSON.stringify(deviceState, null, 2)}
          </pre>
        </article>
        <article className="rounded-3xl border border-white/10 bg-bg-secondary/70 p-5">
          <h2 className="text-lg font-semibold text-text-primary">Zustand · weekcrew</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-emerald-100">
            {JSON.stringify(weekCrewState, null, 2)}
          </pre>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text-secondary">
        <p>
          Если страница внезапно белая, сначала открой `/healthz` (сервер работает?), затем эту страницу. Даже при пустой `env` сервис
          включит demo-режим и не упадёт. Если что-то всё ещё ломается, скопируй JSON выше в issue.
        </p>
      </section>
    </div>
  );
}
