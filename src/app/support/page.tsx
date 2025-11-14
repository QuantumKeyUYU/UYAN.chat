'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';
import { DEVICE_ID_HEADER, DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';

type DeviceStatus = 'idle' | 'resolving' | 'ready' | 'failed';

interface SupportMessage {
  id: string;
  text: string;
  category?: string | null;
  createdAt?: string;
  expiresAt?: string;
}

interface RandomMessageResponse {
  message?: SupportMessage | null;
  code?: string;
  messageText?: string;
  error?: string;
}

interface CreateResponseResult {
  ok?: boolean;
  message?: string;
  error?: string;
  code?: string;
}

// небольшой хелпер, чтобы не дёргать рандомное сообщение без deviceId
function canUseDevice(status: DeviceStatus, deviceId: string | null): boolean {
  return status === 'ready' && !!deviceId;
}

export default function SupportPage() {
  const { deviceId, status: rawStatus, error: deviceHookError } = useResolvedDeviceId();
  const deviceStatus = rawStatus as DeviceStatus;

  const [message, setMessage] = useState<SupportMessage | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [deviceHardError, setDeviceHardError] = useState<string | null>(null);

  const deviceReady = canUseDevice(deviceStatus, deviceId ?? null);
  const isBusy = loadingMessage || submitting;

  const showSkeleton = !message && loadingMessage && !loadError && !deviceHardError;
  const showEmptyState = !message && !loadingMessage && !loadError && !deviceHardError;

  const deviceStatusLabel = useMemo(() => {
    if (deviceHardError) return deviceHardError;
    if (deviceHookError)
      return 'Не получилось настроить это устройство. Попробуй обновить страницу.';
    if (deviceStatus === 'resolving' || deviceStatus === 'idle')
      return 'Готовим страницу, это может занять пару секунд…';
    if (deviceStatus === 'failed')
      return 'Не удалось настроить устройство. Попробуй обновить страницу чуть позже.';
    return null;
  }, [deviceHookError, deviceStatus, deviceHardError]);

  const fetchRandomMessage = useCallback(async () => {
    if (!deviceReady) return;

    setLoadingMessage(true);
    setLoadError(null);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }

      const res = await fetch('/api/messages/random', {
        method: 'GET',
        headers,
      });

      const data = (await res.json()) as RandomMessageResponse;

      if (!res.ok) {
        if (data.code === DEVICE_UNIDENTIFIED_ERROR) {
          setDeviceHardError(
            'Не получилось настроить это устройство. Попробуй обновить страницу или зайти позже.',
          );
          setMessage(null);
          return;
        }

        if (data.code === 'NO_MESSAGES') {
          setMessage(null);
          setLoadError(null);
          return;
        }

        setMessage(null);
        setLoadError(
          data.message ??
            data.error ??
            'Не удалось загрузить мысль. Проверь интернет и попробуй ещё раз.',
        );
        return;
      }

      const payloadMessage: SupportMessage | null =
        (data.message as SupportMessage | null | undefined) ?? null;

      setMessage(payloadMessage);
      setLoadError(null);
    } catch (err) {
      setMessage(null);
      setLoadError('Не удалось загрузить мысль. Проверь интернет и попробуй ещё раз.');
    } finally {
      setLoadingMessage(false);
    }
  }, [deviceReady, deviceId]);

  useEffect(() => {
    if (!deviceReady) return;
    if (deviceHardError) return;
    if (loadingMessage) return;
    if (message) return;

    void fetchRandomMessage();
  }, [deviceReady, deviceHardError, loadingMessage, message, fetchRandomMessage]);

  const handleAnotherMessage = async () => {
    if (isBusy) return;
    setResponseText('');
    await fetchRandomMessage();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message) return;
    const text = responseText.trim();
    if (!text) return;

    if (!deviceReady) {
      setSubmitError('Не получилось настроить устройство. Попробуй обновить страницу.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }

      const res = await fetch('/api/responses/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId: message.id,
          text,
        }),
      });

      const data = (await res.json()) as CreateResponseResult;

      if (!res.ok) {
        if (data.code === 'MESSAGE_ALREADY_ANSWERED') {
          setSubmitError('Кто-то уже поддержал эту мысль. Можно выбрать другую.');
        } else if (data.code === 'CANNOT_ANSWER_OWN_MESSAGE') {
          setSubmitError('Нельзя отвечать на свою мысль. Можно поддержать кого-то ещё.');
        } else {
          setSubmitError(
            data.message ?? data.error ?? 'Не удалось отправить ответ. Попробуй ещё раз.',
          );
        }
        return;
      }

      setSubmitSuccess(true);
      setResponseText('');
      setMessage(null);

      try {
        triggerGlobalStatsRefresh();
      } catch (statsError) {
        console.error('[support] Failed to trigger stats refresh', statsError);
      }

      void fetchRandomMessage();
    } catch (err) {
      setSubmitError('Не удалось отправить ответ. Проверь интернет и попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:py-12">
      {/* Заголовок и описание */}
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          Поддержать
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-300">
          Выбирай мысль другого человека и отвечай на неё с теплом. Иногда один абзац поддержки
          помогает выдержать день.
        </p>
      </section>

      {/* Инфо-блок про анонимность */}
      <section className="rounded-3xl bg-slate-900/60 p-5 text-sm leading-relaxed text-slate-200 shadow-lg shadow-black/30 md:p-6">
        <p>
          Здесь собраны анонимные записи людей, которым сейчас особенно нужна опора. Выбери одну
          мысль и ответь на неё несколькими тёплыми фразами. Один внимательный ответ может выдержать
          чей-то день.
        </p>
        <p className="mt-3 text-slate-400">
          Каждая история анонимна. Ответ тоже остаётся без имени.
        </p>
      </section>

      {/* Ошибка устройства / статуса */}
      {deviceStatusLabel && (
        <section className="rounded-3xl border border-red-500/40 bg-red-950/40 px-5 py-4 text-sm text-red-100">
          {deviceStatusLabel}
        </section>
      )}

      {/* Ошибка загрузки мысли */}
      {loadError && !deviceHardError && (
        <section className="rounded-3xl border border-red-500/40 bg-red-950/40 px-5 py-4 text-sm text-red-100">
          <p className="mb-2">{loadError}</p>
          <button
            type="button"
            onClick={fetchRandomMessage}
            disabled={loadingMessage || !!deviceHardError}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
          >
            Попробовать ещё раз
          </button>
        </section>
      )}

      {/* Основная карточка */}
      <section className="rounded-3xl bg-slate-900/70 p-5 shadow-xl shadow-black/40 md:p-6">
        {/* Скелетон */}
        {showSkeleton && (
          <div className="flex flex-col gap-4">
            <div className="h-4 w-24 rounded-full bg-slate-700/60" />
            <div className="h-5 w-48 rounded-full bg-slate-700/60" />
            <div className="mt-2 space-y-3">
              <div className="h-4 w-full rounded-full bg-slate-800/60" />
              <div className="h-4 w-full rounded-full bg-slate-800/60" />
              <div className="h-4 w-2/3 rounded-full bg-slate-800/60" />
            </div>
            <div className="mt-6 h-32 w-full rounded-2xl bg-slate-800/60" />
          </div>
        )}

        {/* Пустое состояние */}
        {showEmptyState && (
          <div className="flex flex-col items-start gap-4">
            <h2 className="text-xl font-semibold text-slate-50">
              Сейчас нет мыслей, которые ждут внимания.
            </h2>
            <p className="text-sm text-slate-300">
              Можно заглянуть позже или поделиться своей историей.
            </p>
            <Link
              href="/write"
              className="mt-2 inline-flex items-center rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-sky-500/30 hover:bg-sky-300"
            >
              Написать мысль
            </Link>
          </div>
        )}

        {/* Контент с мыслью + форма ответа */}
        {message && (
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              {message.category && (
                <div className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                  Категория: {message.category}
                </div>
              )}
              <h2 className="text-lg font-semibold text-slate-50">Мысль для поддержки</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                {message.text}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">Твой тёплый ответ</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={5}
                  maxLength={600}
                  placeholder="Напиши несколько тёплых фраз. Как бы ты поддержал друга в такой ситуации?"
                  className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  disabled={submitting || !!deviceHardError}
                />
                <p className="text-xs text-slate-400">
                  Лучше один-два честных абзаца, чем большое эссе.
                </p>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-100">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-100">
                  Спасибо. Твои слова отправлены человеку, который сейчас в них нуждается.
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center">
                <button
                  type="submit"
                  disabled={submitting || !responseText.trim() || !!deviceHardError}
                  className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-md shadow-sky-500/40 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Отправляем…' : 'Отправить тёплый ответ'}
                </button>

                <button
                  type="button"
                  onClick={handleAnotherMessage}
                  disabled={isBusy || !!deviceHardError}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Другая мысль
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
