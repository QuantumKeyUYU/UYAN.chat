'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ComposeForm, type ComposeFormFields } from '@/components/forms/ComposeForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Stepper } from '@/components/stepper';
import { MobileStickyActions } from '@/components/cta/MobileStickyActions';
import { useDeviceStore } from '@/store/device';
import type { MessageCategory, ResponseType } from '@/types/firestore';
import { useSoftMotion } from '@/lib/animation';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { getFlowSteps } from '@/lib/flowSteps';
import { formatSeconds } from '@/lib/time';
import { useStepState } from '@/lib/hooks/useStepState';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

type MessagePayload = {
  id: string;
  text: string;
  category: MessageCategory;
  createdAt: number;
  expiresAt: number;
  status: string;
};

type Phase = 'explore' | 'select' | 'custom' | 'quick' | 'ai' | 'success';

const phaseDescriptions: Record<Phase, string> = {
  explore: 'Ищем мысль, которой сейчас особенно нужен тёплый отклик.',
  select: 'Выбираем, каким способом ответить: своими словами или через подсказки.',
  custom: 'Пишем отклик своими словами — бережно и по-человечески.',
  quick: 'Можно выбрать короткий готовый отклик и дополнить его.',
  ai: 'ИИ подскажет идеи, но финальные слова всегда за тобой.',
  success: 'Отклик уже летит к автору и скоро его согреет.',
};

interface AiVariant {
  tone: 'empathy' | 'hope';
  text: string;
}

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
  const deviceId = useDeviceStore((state) => state.id);
  const { preset, vocabulary } = useVocabulary();
  const steps = useMemo(() => getFlowSteps(preset), [preset]);
  const stepState = useStepState({ total: steps.length, initial: 1 });
  const { active: stepIndex, setActive: setStep } = stepState;
  const router = useRouter();
  const softMotion = useSoftMotion();
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [phase, setPhase] = useState<Phase>('explore');
  const [message, setMessage] = useState<MessagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const [aiVariants, setAiVariants] = useState<AiVariant[]>([]);
  const [selectedAi, setSelectedAi] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const form = useForm<ComposeFormFields>({ defaultValues: { text: '', honeypot: '' } });
  const {
    reset,
  } = form;

  useEffect(() => {
    setStep(phase === 'success' ? 2 : 1);
  }, [phase, setStep]);

  const fetchRandomMessage = async () => {
    if (!deviceId) return;
    setLoadingMessage(true);
    setError(null);
    setPhase('explore');
    setQuickSuggestions([]);
    setSelectedQuick(null);
    setAiVariants([]);
    setSelectedAi(null);
    setSubmissionError(null);
    try {
      const response = await fetch('/api/messages/random', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
      });
      if (!response.ok) {
        throw new Error('Не удалось получить мысль');
      }
      const data = await response.json();
      if (!data.message) {
        setMessage(null);
        setError('Все мысли уже получили отклики. Загляни позже или поделись своей мыслью.');
        reset({ text: '', honeypot: '' });
        setCooldownSeconds(null);
        return;
      }
      setMessage(data.message as MessagePayload);
      reset({ text: '', honeypot: '' });
      setCooldownSeconds(null);
    } catch (err) {
      console.error(err);
      setError('Кажется, сейчас нет свободных мыслей для отклика. Попробуй заглянуть позже.');
      setMessage(null);
    } finally {
      setLoadingMessage(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchRandomMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

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

  const sendResponse = async (text: string, type: ResponseType, honeypot?: string) => {
    if (!deviceId || !message) return;
    if (isBanned) {
      setSubmissionError('Доступ к откликам временно ограничен. Мы дадим знать, когда его получится вернуть.');
      return;
    }
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const response = await fetch('/api/responses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({
          messageId: message.id,
          text,
          type,
          honeypot,
        }),
      });
      const result = await response.json();
      if (response.status === 403) {
        setIsBanned(true);
        setSubmissionError('Доступ к откликам временно ограничен. Мы дадим знать, когда его получится вернуть.');
        return;
      }
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = typeof result?.retryAfter === 'number' ? result.retryAfter : 0;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setSubmissionError(
            `Сегодня ты уже много откликался. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
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
          spam: 'Текст выглядит как повторяющийся набор символов. Попробуй описать поддержку своими словами.',
          too_short: 'Добавь ещё немного тепла и конкретики, чтобы автор почувствовал поддержку.',
          too_long: 'Сократи отклик до 200 символов, чтобы его легко было дочитать.',
          crisis:
            'Если текст затрагивает тему кризиса, лучше мягко направить автора к специалистам и избегать подробностей.',
        };

        if (result?.reason && reasonMessages[result.reason]) {
          setSubmissionError(reasonMessages[result.reason]);
          return;
        }

        setSubmissionError(result?.error ?? 'Не удалось отправить отклик. Попробуй ещё раз.');
        return;
      }
      reset({ text: '', honeypot: '' });
      setQuickSuggestions([]);
      setSelectedQuick(null);
      setAiVariants([]);
      setSelectedAi(null);
      setPhase('success');
      setCooldownSeconds(null);
    } catch (err) {
      console.error(err);
      setSubmissionError('Не получилось отправить отклик. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit: SubmitHandler<ComposeFormFields> = async (values) => {
    await sendResponse(values.text, 'custom', values.honeypot);
  };

  const startQuickFlow = async () => {
    if (!message) return;
    setPhase('quick');
    setSubmissionError(null);
    setGenerating(true);
    setQuickSuggestions([]);
    setSelectedQuick(null);
    try {
      const response = await fetch('/api/responses/generate-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: message.text,
          category: message.category,
        }),
      });
      if (!response.ok) {
        throw new Error('Не удалось подготовить быстрые отклики');
      }
      const payload = await response.json();
      const options = Array.isArray(payload?.suggestions) ? (payload.suggestions as string[]) : [];
      setQuickSuggestions(options);
    } catch (err) {
      console.error(err);
      setSubmissionError('Не получилось подготовить быстрые отклики. Попробуй позже.');
    } finally {
      setGenerating(false);
    }
  };

  const startAiFlow = async () => {
    if (!message) return;
    setPhase('ai');
    setSubmissionError(null);
    setGenerating(true);
    setAiVariants([]);
    setSelectedAi(null);
    try {
      const response = await fetch('/api/responses/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: message.text,
          category: message.category,
        }),
      });
      if (!response.ok) {
        throw new Error('Не удалось подготовить подсказки');
      }
      const payload = await response.json();
      const variants = Array.isArray(payload?.variants) ? (payload.variants as AiVariant[]) : [];
      setAiVariants(variants);
    } catch (err) {
      console.error(err);
      setSubmissionError('Не получилось подготовить подсказки. Попробуй ещё раз позже.');
    } finally {
      setGenerating(false);
    }
  };

  const submitQuickSuggestion = async (text: string) => {
    setSelectedQuick(text);
    await sendResponse(text, 'quick');
  };

  const submitAiVariant = async (index: number) => {
    const variant = aiVariants[index];
    if (!variant) return;
    setSelectedAi(index);
    await sendResponse(variant.text, 'ai');
  };

  const remainingTime = typeof cooldownSeconds === 'number' ? formatSeconds(cooldownSeconds) : null;

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Не удалось определить ключ устройства. Перезагрузи страницу или попробуй открыть сервис заново.
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex max-w-5xl flex-col gap-8"
      initial={softMotion.initial}
      animate={softMotion.animate}
      transition={softMotion.transition}
    >
      <Stepper steps={steps} activeIndex={stepIndex} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">{vocabulary.supportTitle}</h1>
        <p className="text-text-secondary">{vocabulary.supportSubtitle}</p>
      </div>

      {error ? <Notice variant="info">{error}</Notice> : null}
      {submissionError ? <Notice variant="error">{submissionError}</Notice> : null}
      {remainingTime ? <Notice variant="info">Пауза перед следующим откликом — осталось {remainingTime}.</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-text-tertiary">{phaseDescriptions[phase]}</p>
            {message ? (
              <p className="rounded-2xl bg-bg-secondary/60 p-4 text-text-primary">{message.text}</p>
            ) : (
              <p className="rounded-2xl bg-bg-secondary/60 p-4 text-text-secondary">
                {loadingMessage ? 'Подбираем мысль...' : 'Нет мыслей для отклика прямо сейчас.'}
              </p>
            )}
          </div>

          {message ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={fetchRandomMessage} variant="secondary" className="w-full sm:w-auto" disabled={loadingMessage}>
                  {loadingMessage ? 'Обновляем...' : 'Показать другую мысль'}
                </Button>
                <div className="text-sm text-text-tertiary">
                  Категория: <span className="font-medium text-text-secondary">{message.category}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text-primary">Как хочешь откликнуться?</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button onClick={() => setPhase('custom')} variant={phase === 'custom' ? 'primary' : 'secondary'} disabled={submitting}>
                    ✍️ Написать своими словами
                  </Button>
                  <Button onClick={startQuickFlow} variant={phase === 'quick' ? 'primary' : 'secondary'} disabled={generating || submitting}>
                    ⚡ Быстрый отклик
                  </Button>
                  <Button onClick={startAiFlow} variant={phase === 'ai' ? 'primary' : 'secondary'} disabled={generating || submitting}>
                    🤖 Подсказки ИИ
                  </Button>
                </div>
              </div>

              {phase === 'custom' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary">Свои слова поддержки</h3>
                  <ComposeForm
                    form={form}
                    onSubmit={handleCustomSubmit}
                    minLength={MIN_LENGTH}
                    maxLength={MAX_LENGTH}
                    placeholder="Напиши, что ты рядом, что человек не один..."
                    submitLabel={submitting ? 'Отправляем...' : 'Отправить отклик'}
                    loadingLabel="Отправляем..."
                    description={
                      <span className="text-sm text-text-secondary">
                        Постарайся говорить от сердца. Мы проверим текст автоматически и передадим его автору мысли.
                      </span>
                    }
                    busy={submitting}
                    disabled={generating || Boolean(remainingTime)}
                    errorMessage={submissionError}
                    cooldownSeconds={cooldownSeconds}
                  />
                </div>
              ) : null}

              {phase === 'quick' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary">Выбери быстрый отклик</h3>
                  {generating ? (
                    <p className="text-text-secondary">Готовим варианты...</p>
                  ) : quickSuggestions.length === 0 ? (
                    <p className="text-text-secondary">Пока нет готовых фраз. Попробуй написать своими словами.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {quickSuggestions.map((text) => (
                        <button
                          key={text}
                          type="button"
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selectedQuick === text
                              ? 'border-uyan-action bg-uyan-action/10 text-text-primary'
                              : 'border-white/10 bg-bg-secondary/60 text-text-secondary hover:border-uyan-action/40'
                          }`}
                          onClick={() => void submitQuickSuggestion(text)}
                          disabled={submitting || Boolean(remainingTime)}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {phase === 'ai' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary">Подсказки от ИИ</h3>
                  {generating ? (
                    <p className="text-text-secondary">Собираем идеи...</p>
                  ) : aiVariants.length === 0 ? (
                    <p className="text-text-secondary">Пока нет подсказок. Попробуй другой способ.</p>
                  ) : (
                    <div className="space-y-3">
                      {aiVariants.map((variant, index) => (
                        <Card
                          key={`${variant.tone}-${index}`}
                          className={`space-y-3 border ${
                            selectedAi === index ? 'border-uyan-action bg-uyan-action/10' : 'border-white/10 bg-bg-secondary/60'
                          }`}
                        >
                          <p className="text-sm uppercase tracking-[0.3em] text-text-tertiary">
                            {variant.tone === 'empathy' ? 'Эмпатия' : 'Надежда'}
                          </p>
                          <p className="text-text-primary">{variant.text}</p>
                          <Button
                            onClick={() => void submitAiVariant(index)}
                            disabled={submitting || Boolean(remainingTime)}
                            className="w-full sm:w-auto"
                          >
                            Использовать этот отклик
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {phase === 'success' ? (
                <div className="space-y-4 rounded-2xl bg-bg-secondary/60 p-4 text-text-secondary">
                  <h3 className="text-lg font-semibold text-text-primary">Отклик отправлен</h3>
                  <p>
                    Спасибо за поддержку. Отклик уже в пути и скоро окажется у автора мысли. Можно выбрать следующую мысль или
                    поделиться своей.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={fetchRandomMessage} className="w-full sm:w-auto">
                      Откликнуться ещё
                    </Button>
                    <Button variant="secondary" onClick={() => router.push('/write')} className="w-full sm:w-auto">
                      Поделиться своей мыслью
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <aside className="space-y-4">
          <Card className="space-y-3 text-sm text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">Как поддерживать бережно</h2>
            <ul className="space-y-2">
              <li>Говори от себя и избегай советов, если о них не просят.</li>
              <li>Не обещай того, чего не сможешь выполнить. Достаточно пары тёплых фраз.</li>
              <li>Если текст кажется опасным, направь автора к профессиональной помощи.</li>
            </ul>
          </Card>
          <Card className="space-y-3 text-sm text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">Что дальше?</h2>
            <p>
              Все отклики сохраняются у автора мысли и остаются анонимными. Ты можешь вернуться в «Мои отклики», чтобы увидеть
              ответы, которые получил сам.
            </p>
          </Card>
        </aside>
      </div>

      <MobileStickyActions />
    </motion.div>
  );
}
