'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { useSoftMotion } from '@/lib/animation';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';
import { DEVICE_ID_HEADER, DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { formatSeconds } from '@/lib/time';
import type { MessageCategory } from '@/types/firestore';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';

type DeviceStatus = 'idle' | 'resolving' | 'ready' | 'failed' | 'error';

interface SupportMessage {
  id: string;
  text: string;
  category?: MessageCategory | null;
  createdAt?: number | string;
  expiresAt?: number | string;
  status?: string;
}

interface RandomMessageResponse {
  message?: unknown;
  code?: string;
  messageText?: string;
  error?: string;
}

interface CreateResponseResult {
  error?: string;
  message?: string;
  suggestion?: string;
  reason?: string;
  retryAfter?: number;
}

const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

function pluralizeMinutes(minutes: number): string {
  if (minutes % 10 === 1 && minutes % 100 !== 11) return 'минуту';
  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return 'минуты';
  return 'минут';
}

export default function SupportPage() {
  const { vocabulary } = useVocabulary();
  const softMotion = useSoftMotion();

  const {
    deviceId,
    status: rawStatus,
    error: deviceHookError,
  } = useResolvedDeviceId();
  const deviceStatus = (rawStatus ?? 'idle') as DeviceStatus;

  const [message, setMessage] = useState<SupportMessage | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceHardError, setDeviceHardError] = useState<string | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const deviceReady = deviceStatus === 'ready' && !!deviceId;
  const isBusy = loadingMessage || submitting;

  const showSkeleton = !message && loadingMessage && !loadError && !deviceHardError;
  const showEmptyState =
    !message && !loadingMessage && !loadError && !deviceHardError && !deviceHookError;

  const deviceStatusLabel = useMemo(() => {
    if (deviceHardError) return deviceHardError;
    if (deviceHookError)
      return 'Не получилось настроить это устройство. Попробуй обновить страницу.';

    if (deviceStatus === 'resolving' || deviceStatus === 'idle')
      return 'Готовим страницу, это может занять пару секунд…';

    if (deviceStatus === 'failed' || deviceStatus === 'error')
      return 'Не удалось настроить устройство. Попробуй обновить страницу чуть позже.';

    return null;
  }, [deviceHardError, deviceHookError, deviceStatus]);

  const fetchRandomMessage = useCallback(async () => {
    if (!deviceReady) return;

    setLoadingMessage(true);
    setLoadError(null);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const headers: HeadersInit = {};
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }

      const res = await fetch('/api/messages/random', {
        method: 'GET',
        headers,
      });

      const data = (await res.json().catch(() => ({}))) as RandomMessageResponse;

      if (!res.ok) {
        const code = data.code;

        // спец-ошибка: девайс не распознан — прекращаем попытки
        if (code === DEVICE_UNIDENTIFIED_ERROR) {
          setDeviceHardError(
            'Не получилось настроить это устройство. Попробуй обновить страницу или зайти позже.',
          );
          setMessage(null);
          return;
        }

        // нормальное пустое состояние — мыслей сейчас нет
        if (code === 'NO_MESSAGES') {
          setMessage(null);
          setLoadError(null);
          return;
        }

        const text =
          typeof data.messageText === 'string'
            ? data.messageText
            : typeof data.error === 'string'
              ? data.error
              : 'Не удалось загрузить мысль. Проверь интернет и попробуй ещё раз.';

        setLoadError(text);
        setMessage(null);
        return;
      }

      const raw = data.message;

      if (!raw || typeof raw !== 'object') {
        setMessage(null);
        setLoadError(null);
        return;
      }

      setMessage(raw as SupportMessage);
      setLoadError(null);
    } catch (error) {
      console.error('[support] Failed to load message', error);
      setMessage(null);
      setLoadError('Не удалось загрузить мысль. Проверь интернет и попробуй ещё раз.');
    } finally {
      setLoadingMessage(false);
    }
  }, [deviceReady, deviceId]);

  // авто-загрузка первой мысли
  useEffect(() => {
    if (!deviceReady) return;
    if (deviceHardError) return;
    if (loadingMessage) return;
    if (message) return;

    void fetchRandomMessage();
  }, [deviceReady, deviceHardError, loadingMessage, message, fetchRandomMessage]);

  // тикаем кулдаун
  useEffect(() => {
    if (!cooldownSeconds || cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message) {
      setSubmitError('Не удалось выбрать мысль для ответа. Попробуй обновить страницу.');
      return;
    }

    const text = responseText.trim();
    if (!text) return;

    if (text.length < MIN_LENGTH) {
      setSubmitError(`Добавь ещё несколько слов, минимум ${MIN_LENGTH} символов.`);
      return;
    }

    if (text.length > MAX_LENGTH) {
      setSubmitError(`Сократи ответ до ${MAX_LENGTH} символов — так его легче дочитать.`);
      return;
    }

    if (!deviceReady) {
      setSubmitError('Не получилось настроить устройство. Попробуй обновить страницу.');
      return;
    }

    if (cooldownSeconds && cooldownSeconds > 0) {
      // на всякий случай — не отправляем во время паузы
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
          type: 'custom',
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateResponseResult;

      if (res.status === 403) {
        setSubmitError(
          'Доступ к ответам сейчас приостановлен. Мы дадим знать, когда его получится вернуть.',
        );
        return;
      }

      if (!res.ok) {
        // слишком много ответов за день
        if (res.status === 429) {
          const retryAfter = typeof data.retryAfter === 'number' ? data.retryAfter : 60;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));

          setSubmitError(
            `Сегодня ты уже поддержал много мыслей. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(
              minutes,
            )}.`,
          );
          setCooldownSeconds(retryAfter);
          return;
        }

        // если бэкенд прислал подсказку
        if (data.suggestion && typeof data.suggestion === 'string') {
          setSubmitError(data.suggestion);
          return;
        }

        // маппинг reason → текст
        if (data.reason) {
          const reasonMessages: Record<string, string> = {
            contact:
              'Мы не публикуем контакты и ссылки — так пространство остаётся безопасным для всех.',
            spam: 'Ответ выглядит как повторяющийся набор символов. Попробуй описать поддержку своими словами.',
            too_short:
              'Добавь чуть больше тепла и конкретики, чтобы автор почувствовал твою поддержку.',
            too_long: 'Сократи ответ до 200 символов, чтобы его легко было дочитать.',
            crisis:
              'Если текст задевает кризисную тему, лучше мягко направить автора к специалистам и избегать подробностей.',
          };

          const mapped = reasonMessages[data.reason];
          if (mapped) {
            setSubmitError(mapped);
            return;
          }
        }

        const textError =
          typeof data.message === 'string'
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : 'Не удалось отправить ответ. Попробуй ещё раз.';

        setSubmitError(textError);
        return;
      }

      // успех
      setSubmitSuccess(true);
      setResponseText('');
      setCooldownSeconds(null);

      try {
        triggerGlobalStatsRefresh();
      } catch (statsError) {
        console.error('[support] Failed to trigger stats refresh', statsError);
      }

      // сразу загружаем следующую мысль
      setMessage(null);
      void fetchRandomMessage();
    } catch (error) {
      console.error('[support] Failed to send response', error);
      setSubmitError('Не удалось отправить ответ. Проверь интернет и попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.main
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 md:py-12"
      initial={softMotion.initial}
      animate={softMotion.animate}
      transition={softMotion.transition}
    >
      {/* Заголовок */}
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          {vocabulary.supportTitle}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          {vocabulary.supportSubtitle}
        </p>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          {vocabulary.supportPageAnonNote}
        </p>
      </section>

      {/* Статус устройства */}
      {deviceStatusLabel && <Notice variant="info">{deviceStatusLabel}</Notice>}

      {/* Ошибка загрузки мысли */}
      {loadError && !deviceHardError && (
        <Notice variant="error">
          <div className="flex flex-col gap-2">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLoadError(null);
                void fetchRandomMessage();
              }}
              className="w-full sm:w-auto"
              disabled={loadingMessage}
            >
              {loadingMessage ? 'Обновляем…' : 'Попробовать ещё раз'}
            </Button>
          </div>
        </Notice>
      )}

      <Card className="space-y-6 bg-slate-900/70 shadow-xl shadow-black/40">
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
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-50">
              Сейчас нет мыслей, которые ждут внимания.
            </h2>
            <p className="text-sm text-slate-300">
              Можно заглянуть позже или поделиться своей историей.
            </p>
            <Link
              href="/write"
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-sky-500/30 hover:bg-sky-300 sm:w-auto"
            >
              Написать мысль
            </Link>
          </div>
        )}

        {/* Основное состояние с мыслью и формой */}
        {message && (
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              {message.category && (
                <div className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                  Категория: {String(message.category)}
                </div>
              )}
              <h2 className="text-lg font-semibold text-slate-50">Мысль для поддержки</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                {message.text}
              </p>
              <p className="text-xs text-slate-400">Истекает через 24 часа.</p>
            </header>

            {submitError && <Notice variant="error">{submitError}</Notice>}
            {submitSuccess && (
              <Notice variant="success">
                Спасибо. Твои слова отправлены человеку, который сейчас в них нуждается.
              </Notice>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-200">Твой тёплый ответ</label>
                <textarea
                  value={responseText}
                  onChange={(e) => {
                    setResponseText(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  rows={5}
                  maxLength={600}
                  placeholder="Напиши несколько тёплых фраз. Как бы ты поддержал друга в такой ситуации?"
                  className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  disabled={submitting || !!deviceHardError || !deviceReady}
                />
                <p className="text-xs text-slate-400">
                  20–200 символов тепла и поддержки. Лучше один-два честных абзаца, чем большое
                  эссе.
                </p>
                {cooldownSeconds && cooldownSeconds > 0 && (
                  <p className="text-xs text-slate-400">
                    Пауза перед следующей попыткой — осталось {formatSeconds(cooldownSeconds)}.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={
                    submitting ||
                    !responseText.trim() ||
                    !!deviceHardError ||
                    !deviceReady ||
                    (cooldownSeconds !== null && cooldownSeconds > 0)
                  }
                >
                  {submitting ? 'Отправляем…' : 'Отправить тёплый ответ'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setResponseText('');
                    setSubmitError(null);
                    setSubmitSuccess(false);
                    setMessage(null);
                    void fetchRandomMessage();
                  }}
                  className="w-full sm:w-auto"
                  disabled={isBusy || !!deviceHardError}
                >
                  Другая мысль
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </motion.main>
  );
}
