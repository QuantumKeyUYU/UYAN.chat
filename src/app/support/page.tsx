'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ComposeForm, type ComposeFormFields } from '@/components/forms/ComposeForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import type { MessageCategory } from '@/types/firestore';
import { useSoftMotion } from '@/lib/animation';
import { DEVICE_ID_HEADER, DEVICE_UNIDENTIFIED_ERROR } from '@/lib/device/constants';
import { formatSeconds } from '@/lib/time';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';
import { RESPONSE_LENGTH_WARNING_THRESHOLD } from '@/lib/shareCard';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';

type MessagePayload = {
  id: string;
  text: string;
  category: MessageCategory;
  createdAt: number;
  expiresAt: number;
  status: string;
};

type Phase = 'explore' | 'compose' | 'success';

const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

const pluralizeMinutes = (minutes: number) => {
  if (minutes % 10 === 1 && minutes % 100 !== 11) {
    return 'минуту';
  }
  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) {
    return 'минуты';
  }
  return 'минут';
};

export default function SupportPage() {
  const {
    deviceId,
    status: deviceStatus,
    resolving: deviceResolving,
    error: deviceResolutionError,
    refresh: refreshDevice,
  } =
    useResolvedDeviceId();
  const deviceFailed = deviceStatus === 'error' || deviceStatus === 'failed';
  const { vocabulary } = useVocabulary();
  const router = useRouter();
  const softMotion = useSoftMotion();
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [phase, setPhase] = useState<Phase>('explore');
  const [message, setMessage] = useState<MessagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const form = useForm<ComposeFormFields>({ defaultValues: { text: '', honeypot: '' } });
  const {
    reset,
  } = form;

  const phaseDescriptions = useMemo<Record<Phase, string>>(
    () => ({
      explore: vocabulary.supportPageLookingFor,
      compose: 'Пиши ответ своими словами — спокойно и бережно.',
      success: 'Ответ уже в пути и скоро окажется у автора мысли.',
    }),
    [vocabulary.supportPageLookingFor],
  );

  const errorHeading = useMemo(() => {
    if (deviceError) {
      return 'Не получилось настроить устройство.';
    }
    if (error && error.startsWith('Не удалось загрузить мысль')) {
      return 'Не удалось загрузить мысль.';
    }
    return 'Сейчас нет историй, которые ждут поддержки.';
  }, [deviceError, error]);

  const errorDescription = useMemo(() => {
    if (deviceError) {
      return 'Не получилось настроить это устройство. Попробуй обновить страницу позже.';
    }
    return error ?? '';
  }, [deviceError, error]);

  const fetchRandomMessage = useCallback(async () => {
    if (deviceError) {
      return;
    }

    setLoadingMessage(true);
    setError(null);
    setPhase('explore');
    setSubmissionError(null);
    try {
      const headers: HeadersInit = {};
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }

      const response = await fetch('/api/messages/random', { headers });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const errorCode = typeof data?.['code'] === 'string' ? (data['code'] as string) : null;
        const errorMessage = typeof data?.['message'] === 'string' ? (data['message'] as string) : null;

        if (errorCode === DEVICE_UNIDENTIFIED_ERROR) {
          setDeviceError(true);
          setError('Не получилось настроить это устройство. Попробуй обновить страницу позже.');
          setMessage(null);
          return;
        }

        setError(errorMessage ?? 'Не удалось загрузить мысль.');
        setMessage(null);
        return;
      }

      const payload = data?.['message'];
      if (!payload || typeof payload !== 'object') {
        setDeviceError(false);
        setMessage(null);
        setError('Можно заглянуть позже или поделиться своей.');
        reset({ text: '', honeypot: '' });
        setCooldownSeconds(null);
        return;
      }

      setDeviceError(false);
      setMessage(payload as MessagePayload);
      reset({ text: '', honeypot: '' });
      setCooldownSeconds(null);
    } catch (err) {
      console.error(err);
      setDeviceError(false);
      setError('Не удалось загрузить мысль. Попробуй позже.');
      setMessage(null);
    } finally {
      setLoadingMessage(false);
    }
  }, [deviceError, deviceId, reset]);

  useEffect(() => {
    if (deviceError) {
      return;
    }
    if (deviceStatus !== 'ready' || !deviceId) {
      return;
    }
    if (loadingMessage || message || submitting) {
      return;
    }

    void fetchRandomMessage();
  }, [deviceError, deviceStatus, deviceId, fetchRandomMessage, loadingMessage, message, submitting]);

  useEffect(() => {
    if (!cooldownSeconds || cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const sendResponse = async (text: string, honeypot?: string) => {
    if (!message) {
      setSubmissionError('Не удалось выбрать мысль для ответа. Попробуй обновить страницу.');
      return;
    }
    if (isBanned) {
      setSubmissionError('Доступ к ответам сейчас приостановлен. Мы дадим знать, когда его получится вернуть.');
      return;
    }
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (deviceId) {
        headers[DEVICE_ID_HEADER] = deviceId;
      }
      const response = await fetch('/api/responses/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId: message.id,
          text,
          type: 'custom',
          honeypot,
          deviceId: deviceId ?? null,
        }),
      });
      const result = await response.json();
      if (response.status === 403) {
        setIsBanned(true);
        setSubmissionError('Доступ к ответам сейчас приостановлен. Мы дадим знать, когда его получится вернуть.');
        return;
      }
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = typeof result?.retryAfter === 'number' ? result.retryAfter : 0;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setSubmissionError(
            `Сегодня ты уже поддержал много мыслей. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
          );
          setCooldownSeconds(retryAfter > 0 ? retryAfter : 60);
          return;
        }

        if (result?.suggestion) {
          setSubmissionError(result.suggestion);
          return;
        }

        const reasonMessages: Record<string, string> = {
          contact: 'Мы не публикуем контакты и ссылки — так пространство остаётся безопасным для всех.',
          spam: 'Ответ выглядит как повторяющийся набор символов. Попробуй описать поддержку своими словами.',
          too_short: 'Добавь чуть больше тепла и конкретики, чтобы автор почувствовал твою поддержку.',
          too_long: 'Сократи ответ до 200 символов, чтобы его легко было дочитать.',
          crisis:
            'Если текст задевает кризисную тему, лучше направить автора к специалистам и избегать подробностей.',
        };

        if (result?.reason && reasonMessages[result.reason]) {
          setSubmissionError(reasonMessages[result.reason]);
          return;
        }

        setSubmissionError(result?.error ?? 'Не удалось отправить ответ. Попробуй ещё раз.');
        return;
      }
      reset({ text: '', honeypot: '' });
      setPhase('success');
      setCooldownSeconds(null);
      try {
        triggerGlobalStatsRefresh();
      } catch (error) {
        console.error('[support] Failed to trigger stats refresh', error);
      }
    } catch (err) {
      console.error(err);
      setSubmissionError('Не получилось отправить ответ. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit: SubmitHandler<ComposeFormFields> = async (values) => {
    await sendResponse(values.text, values.honeypot);
  };

  const baseTransition = softMotion.transition;
  const successInitial =
    baseTransition.duration === 0 ? softMotion.initial : { ...softMotion.initial, scale: 0.96 };
  const successAnimate =
    baseTransition.duration === 0 ? softMotion.animate : { ...softMotion.animate, scale: 1 };

  if (phase === 'success') {
    return (
      <motion.div
        className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center"
        initial={successInitial}
        animate={successAnimate}
        transition={baseTransition}
      >
        <Card className="w-full">
          <div className="space-y-4">
            <motion.div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-uyan-light/20 text-3xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.6 }}
            >
              💫
            </motion.div>
            <h2 className="text-2xl font-semibold text-text-primary">Ответ отправлен</h2>
            <p className="text-text-secondary">Ты подарил тёплый ответ. Пусть автор мысли почувствует, что он не один.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => fetchRandomMessage()} className="w-full sm:w-auto">
                Поддержать ещё раз
              </Button>
              <Button variant="secondary" onClick={() => router.push('/my')} className="w-full sm:w-auto">
                Проверить «Мои ответы»
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }


  return (
    <>
      <motion.div
        className="mx-auto flex max-w-4xl flex-col gap-6"
        initial={softMotion.initial}
        animate={softMotion.animate}
        transition={baseTransition}
      >
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-text-primary">{vocabulary.supportTitle}</h1>
          <div className="space-y-2 text-sm text-text-secondary sm:text-base">
            <p>{vocabulary.supportSubtitle}</p>
            <p>{vocabulary.supportPageHelper}</p>
          </div>
          <p className="text-xs text-text-tertiary sm:text-sm">{vocabulary.supportPageAnonNote}</p>
        </div>

        <p className="text-sm text-text-tertiary">{phaseDescriptions[phase]}</p>

        {deviceResolving ? (
          <Notice variant="info">Готовим устройство… ты всё равно можешь выбирать мысли и отправлять поддержку.</Notice>
        ) : null}
        {!deviceResolving && deviceFailed ? (
          <Notice variant="warning">
            {deviceResolutionError ??
              'Не удалось подготовить устройство. Ты всё равно можешь попробовать поддержать кого-то.'}{' '}
            <button type="button" className="underline" onClick={() => { void refreshDevice(); }}>
              Попробовать снова
            </button>
          </Notice>
        ) : null}

        {isBanned ? (
          <Notice variant="info">
            Доступ к ответам сейчас приостановлен. Мы подскажем, когда снова можно будет поддерживать других.
          </Notice>
        ) : null}

        {submissionError && phase !== 'compose' ? <Notice variant="error">{submissionError}</Notice> : null}

        {cooldownSeconds && cooldownSeconds > 0 && phase !== 'compose' ? (
          <Notice variant="info">
            Пауза перед следующей попыткой — осталось {formatSeconds(cooldownSeconds)}.
          </Notice>
        ) : null}

        {error ? (
          <Card className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-text-primary">{errorHeading}</p>
              <p className="text-text-secondary">{errorDescription}</p>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/write')} className="w-full sm:w-auto">
                Написать мысль
              </Button>
              <button
                type="button"
                onClick={fetchRandomMessage}
                className="text-sm font-medium text-text-tertiary underline-offset-4 transition hover:text-text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-60"
                disabled={loadingMessage || deviceError}
              >
                {loadingMessage ? 'Обновляем…' : 'Попробовать ещё раз'}
              </button>
            </div>
          </Card>
        ) : null}

        {message ? (
          <Card className="space-y-4">
            <div className="flex items-center justify-between text-sm text-text-tertiary">
              <span className="rounded-full bg-uyan-darkness/20 px-3 py-1 text-text-secondary">
                Категория: {message.category}
              </span>
              <span>Истекает через 24 часа</span>
            </div>
            <p className="text-lg text-text-primary">{message.text}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  setSubmissionError(null);
                  setPhase('compose');
                }}
                className="w-full sm:w-auto"
                disabled={isBanned}
              >
                💬 Написать тёплый ответ
              </Button>
              <Button
                variant="secondary"
                onClick={fetchRandomMessage}
                className="w-full sm:w-auto"
                disabled={loadingMessage}
              >
                ⏭ Другая мысль
              </Button>
            </div>
          </Card>
        ) : null}

        {phase === 'compose' && message ? (
          <Card className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Твой ответ</h2>
              <p className="text-text-secondary">20–200 символов тепла и поддержки.</p>
            </div>
            <ComposeForm
              form={form}
              onSubmit={handleCustomSubmit}
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              placeholder="Напиши, что ты рядом и слышишь. Делись поддержкой простыми словами…"
              submitLabel="Отправить тёплый ответ"
              loadingLabel="Отправляем…"
              errorMessage={submissionError}
              busy={submitting}
              disabled={isBanned}
              cooldownSeconds={cooldownSeconds}
              onChange={() => setSubmissionError(null)}
              longTextWarningThreshold={RESPONSE_LENGTH_WARNING_THRESHOLD}
              longTextWarningMessage="Текст длинный — шрифт на открытке будет мельче, чтобы всё поместилось."
              mode="support"
            />
            <Button variant="secondary" onClick={() => setPhase('explore')} className="w-full sm:w-auto">
              Назад
            </Button>
          </Card>
        ) : null}
      </motion.div>
    </>
  );
}
