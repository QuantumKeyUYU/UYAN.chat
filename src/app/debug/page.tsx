'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useFirebaseContext } from '@/components/providers/client-providers';
import { useDeviceStore } from '@/store/device';
import { useWeekCrewStore } from '@/store/weekcrew';

export default function DebugPage() {
  const firebase = useFirebaseContext();
  const deviceState = useDeviceStore();
  const weekCrewState = useWeekCrewStore();

  const envSummary = useMemo(
    () =>
      firebase.envReport.map((entry) => ({
        key: entry.key,
        present: entry.present,
      })),
    [firebase.envReport],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">debug</p>
        <h1 className="text-3xl font-semibold text-text-primary">Диагностика среды</h1>
        <p className="text-sm text-text-secondary">
          Страница помогает понять, почему интерфейс может казаться пустым. Здесь есть статус Firebase, состояние Zustand-сторов и
          наличие переменных окружения.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Firebase</h2>
            <p className="text-sm text-text-secondary">
              Текущий статус: <span className="font-mono text-text-primary">{firebase.status}</span>
            </p>
            {firebase.error ? <p className="text-sm text-rose-200">{firebase.error}</p> : null}
            <p className="text-xs text-text-tertiary">Demo mode: {firebase.demoMode ? 'yes' : 'no'}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => firebase.refresh()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-text-primary transition hover:border-white/50"
            >
              Повторить init
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
