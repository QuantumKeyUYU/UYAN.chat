'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { ApiClientV2Error, getRandomMessageV2, postResponseV2 } from '@/lib/apiClientV2';
import type { MessageV2 } from '@/lib/apiClientV2';
import { useSoftMotion } from '@/lib/animation';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';
import { useUserStats } from '@/lib/hooks/useUserStats';
import { formatSeconds } from '@/lib/time';
import type { MessageCategory } from '@/types/firestore';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';

type DeviceStatus = 'idle' | 'resolving' | 'ready' | 'failed' | 'error';

type SupportMessage = MessageV2 & {
  category?: MessageCategory | null;
};

type SupportState =
  | { status: 'loading' }
  | { status: 'ready'; message: SupportMessage }
  | { status: 'empty' }
  | { status: 'error'; errorMessage: string };

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
  const { refresh: refreshUserStats } = useUserStats();

  const {
    deviceId,
    status: rawStatus,
    error: deviceHookError,
  } = useResolvedDeviceId();
  const deviceStatus = (rawStatus ?? 'idle') as DeviceStatus;

  const [state, setState] = useState<SupportState>({ status: 'loading' });
  const [deviceHardError, setDeviceHardError] = useState<string | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const message = state.status === 'ready' ? state.message : null;
  const deviceReady = deviceStatus === 'ready' && !!deviceId;
  const isLoadingMessage = state.status === 'loading';
  const isBusy = isLoadingMessage || submitting;

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

  const loadMessage = useCallback(async () => {
    if (!deviceReady) return;

    setState({ status: 'loading' });
    setSubmitError(null);
    setSubmitSuccess(false);
    setDeviceHardError(null);

    try {
      const randomMessage = await getRandomMessageV2();

      if (!randomMessage) {
        setState({ status: 'empty' });
        return;
      }

      const normalizedMessage: SupportMessage = {
        ...randomMessage,
        category: (randomMessage as { category?: MessageCategory | null }).category ?? null,
      };

      setState({ status: 'ready', message: normalizedMessage });
    } catch (error) {
      console.error('[support] failed to load message', error);

      if (error instanceof ApiClientV2Error) {
        if (error.code === 'MISSING_DEVICE_ID') {
          const hardErrorMessage =
            'Не получилось настроить это устройство. Попробуй обновить страницу или зайти позже.';
          setDeviceHardError(hardErrorMessage);
          setState({ status: 'error', errorMessage: hardErrorMessage });
          return;
        }

        if (error.code === 'NO_MESSAGES_AVAILABLE' || error.status === 404) {
          setState({ status: 'empty' });
          return;
        }
      }

      setState({
        status: 'error',
        errorMessage: 'Сейчас не получается загрузить истории. Попробуй чуть позже.',
      });
    }
  }, [deviceReady]);

  // авто-загрузка первой мысли
  useEffect(() => {
    if (!deviceReady) return;
    if (deviceHardError) return;

    void loadMessage();
  }, [deviceReady, deviceHardError, loadMessage]);

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

    // Legacy Firestore API call (kept for reference during migration):
    /*
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
    */

    try {
      await postResponseV2(message.id, text);

      setSubmitSuccess(true);
      setResponseText('');
      setCooldownSeconds(null);

      try {
        triggerGlobalStatsRefresh();
        void refreshUserStats();
      } catch (statsError) {
        console.error('[support] Failed to trigger stats refresh', statsError);
      }

      void loadMessage();
    } catch (error) {
      console.error('[support] Failed to send response', error);

      if (error instanceof ApiClientV2Error) {
        if (error.status === 403) {
          setSubmitError(
            'Доступ к ответам сейчас приостановлен. Мы дадим знать, когда его получится вернуть.',
          );
          return;
        }

        if (error.status === 429) {
          const retryAfter =
            typeof (error.details as { retryAfter?: unknown } | null | undefined)?.retryAfter === 'number'
              ? (error.details as { retryAfter: number }).retryAfter
              : 60;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));

          setSubmitError(
            `Сегодня ты уже поддержал много людей. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
          );
          setCooldownSeconds(retryAfter);
          return;
        }

        const suggestion =
          typeof (error.details as { suggestion?: unknown } | null | undefined)?.suggestion === 'string'
            ? (error.details as { suggestion: string }).suggestion
            : null;
        if (suggestion) {
          setSubmitError(suggestion);
          return;
        }

        const reasonMessages: Record<string, string> = {
          contact: 'Мы не публикуем контакты и ссылки — так пространство остаётся безопасным для всех.',
          spam: 'Ответ выглядит как набор повторяющихся символов. Попробуй описать поддержку простыми словами.',
          too_short: 'Добавь ещё немного тепла и конкретики, чтобы автор почувствовал твою поддержку.',
          too_long: 'Сократи ответ — так его легче дочитать до конца.',
          crisis:
            'Если текст цепляет кризисные темы, лучше мягко направить автора к специалистам и избегать подробностей.',
          TOO_SHORT: 'Добавь ещё немного тепла и конкретики, чтобы автор почувствовал твою поддержку.',
          TOO_LONG: 'Сократи ответ — так его легче дочитать до конца.',
        };

        if (error.code && reasonMessages[error.code]) {
          setSubmitError(reasonMessages[error.code]);
          return;
        }

        const codeMessages: Record<string, string> = {
          CANNOT_ANSWER_OWN_MESSAGE: 'Нельзя отвечать на собственную историю — выбери другую.',
          MESSAGE_ALREADY_ANSWERED: 'Кто-то уже поддержал эту историю. Давай найдём следующую.',
          MESSAGE_NOT_FOUND: 'История больше недоступна. Попробуй загрузить новую.',
        };

        if (error.code && codeMessages[error.code]) {
          setSubmitError(codeMessages[error.code]);
          if (error.code !== 'CANNOT_ANSWER_OWN_MESSAGE') {
            void loadMessage();
          }
          return;
        }

        setSubmitError(error.message || 'Не удалось отправить ответ. Попробуй ещё раз.');
        return;
      }

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
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          {vocabulary.supportTitle}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          {vocabulary.supportSubtitle}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          {vocabulary.supportPageHelper}
        </p>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          {vocabulary.supportPageAnonNote}
        </p>
      </section>

      {/* Статус устройства */}
      {deviceStatusLabel && <Notice variant="info">{deviceStatusLabel}</Notice>}

      <Card className="space-y-6 bg-slate-900/70 shadow-xl shadow-black/40">
        {(isLoadingMessage || message) && (
          <p className="text-xs leading-relaxed text-slate-400">
            Когда история загрузится, прочитай её полностью и сделай паузу на пару секунд — это помогает ответить бережнее.
          </p>
        )}
        {/* Скелетон */}
        {isLoadingMessage && (
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
        {state.status === 'empty' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-50">
              Сейчас нет историй для поддержки.
            </h2>
            <p className="text-sm text-slate-300">
              Можно вернуться позже или сначала поделиться своей мыслью.
            </p>
            <Link
              href="/write"
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-sky-500/30 hover:bg-sky-300 sm:w-auto"
            >
              {vocabulary.ctaWrite}
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
              <h2 className="text-lg font-semibold text-slate-50">История для поддержки</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                {message.body}
              </p>
              <p className="text-xs text-slate-400">История исчезнет через 24 часа.</p>
              <p className="text-xs text-slate-400">{vocabulary.supportPageLookingFor}</p>
            </header>

            {submitError && <Notice variant="error">{submitError}</Notice>}
            {submitSuccess && (
              <Notice variant="success">Спасибо. Твои слова уже рядом с человеком, которому сейчас особенно нужны тёплые строки.</Notice>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-slate-200">Твой ответ поддержки</label>
                <textarea
                  value={responseText}
                  onChange={(e) => {
                    setResponseText(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  rows={5}
                  maxLength={600}
                  placeholder="Напиши несколько тёплых фраз — как поддержал(а) бы друга в такой ситуации?"
                  className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
                  disabled={submitting || !!deviceHardError || !deviceReady}
                />
                <p className="text-xs text-slate-400">
                  20–200 символов тепла. Лучше один-два честных абзаца, чем большой монолог. Пиши так, как поддержал(а) бы друга.
                </p>
                <p className="text-xs text-slate-500">
                  Например: «То, через что ты проходишь, правда непросто. Ты уже прошёл большой путь, и это заметно».
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
                  {submitting ? 'Отправляем…' : 'Отправить слова поддержки'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setResponseText('');
                    setSubmitError(null);
                    setSubmitSuccess(false);
                    void loadMessage();
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

        {state.status === 'error' && (
          <div className="flex flex-col gap-4">
            <Notice variant="error">{state.errorMessage}</Notice>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void loadMessage();
              }}
              className="w-full sm:w-auto"
              disabled={isLoadingMessage || !deviceReady}
            >
              {isLoadingMessage ? 'Обновляем…' : 'Попробовать ещё раз'}
            </Button>
          </div>
        )}
      </Card>
    </motion.main>
  );
}
