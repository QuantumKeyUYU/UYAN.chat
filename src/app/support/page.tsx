'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { useAppStore } from '@/store/useAppStore';
import type { MessageCategory, ResponseType } from '@/types/firestore';
import { useSoftMotion } from '@/lib/animation';

type MessagePayload = {
  id: string;
  text: string;
  category: MessageCategory;
  createdAt: number;
  expiresAt: number;
  status: string;
  deviceId: string;
};

interface ResponseForm {
  text: string;
}

type Phase = 'explore' | 'select' | 'custom' | 'quick' | 'ai' | 'success';

interface AiVariant {
  tone: 'empathy' | 'hope';
  text: string;
}

const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

export default function SupportPage() {
  const deviceId = useAppStore((state) => state.deviceId);
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
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ResponseForm>({ defaultValues: { text: '' } });

  const textValue = watch('text') ?? '';

  const fetchRandomMessage = async () => {
    if (!deviceId) return;
    setLoadingMessage(true);
    setError(null);
    setPhase('explore');
    setQuickSuggestions([]);
    setSelectedQuick(null);
    setAiVariants([]);
    setSelectedAi(null);
    try {
      const response = await fetch(`/api/messages/random?deviceId=${deviceId}`);
      if (!response.ok) {
        throw new Error('Не удалось получить сообщение');
      }
      const data = await response.json();
      if (!data.message) {
        setMessage(null);
        setError('Все сообщения уже окружены светом. Загляни позже.');
        reset();
        return;
      }
      setMessage(data.message as MessagePayload);
      reset();
    } catch (err) {
      console.error(err);
      setError('Кажется, все сообщения уже окружены светом. Попробуй заглянуть позже.');
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

  const sendResponse = async (text: string, type: ResponseType) => {
    if (!deviceId || !message) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/responses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          text,
          type,
          deviceId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось отправить ответ');
      }
      reset();
      setQuickSuggestions([]);
      setSelectedQuick(null);
      setAiVariants([]);
      setSelectedAi(null);
      setPhase('success');
    } catch (err) {
      console.error(err);
      alert('Не получилось отправить свет. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    await sendResponse(values.text, 'custom');
  });

  const startQuickFlow = async () => {
    if (!message) return;
    setPhase('quick');
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
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось получить предложения');
      }
      setQuickSuggestions((result.suggestions as string[]) ?? []);
    } catch (err) {
      console.error(err);
      alert('Не удалось получить быстрые ответы. Попробуй ещё раз.');
      setPhase('select');
    } finally {
      setGenerating(false);
    }
  };

  const startAiFlow = async () => {
    if (!message) return;
    setPhase('ai');
    setGenerating(true);
    setAiVariants([]);
    setSelectedAi(null);
    try {
      const response = await fetch('/api/responses/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: message.text,
          category: message.category,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Не удалось получить варианты');
      }
      setAiVariants((result.variants as AiVariant[]) ?? []);
    } catch (err) {
      console.error(err);
      alert('Не удалось получить помощь ИИ. Попробуй ещё раз.');
      setPhase('select');
    } finally {
      setGenerating(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Загружаем твой путь... Обнови страницу, если ожидание затянулось.
      </div>
    );
  }

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
            <h2 className="text-2xl font-semibold text-text-primary">Свет отправлен</h2>
            <p className="text-text-secondary">Ты зажёг свет для кого-то. Пусть он почувствует поддержку.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => fetchRandomMessage()} className="w-full sm:w-auto">
                Поддержать ещё кого-то
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full sm:w-auto">
                На главную
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-8"
      initial={softMotion.initial}
      animate={softMotion.animate}
      transition={baseTransition}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">💫 Поддержи кого-то</h1>
        <p className="text-text-secondary">Прочитай сообщение и поделись тёплыми словами. Без советов, только поддержка.</p>
      </div>

      {error ? (
        <Card>
          <p className="text-center text-text-secondary">{error}</p>
          <Button
            variant="secondary"
            onClick={fetchRandomMessage}
            className="mt-4 w-full"
            disabled={loadingMessage}
          >
            Обновить
          </Button>
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
            <Button onClick={() => setPhase('select')} className="w-full sm:w-auto">
              💫 Поддержать
            </Button>
            <Button
              variant="secondary"
              onClick={fetchRandomMessage}
              className="w-full sm:w-auto"
              disabled={loadingMessage}
            >
              ⏭ Другое сообщение
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'select' && message ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Выбери, как хочешь поддержать</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button onClick={() => setPhase('custom')} variant="secondary" className="w-full">
              ✍️ Написать своими словами
            </Button>
            <Button onClick={startQuickFlow} variant="secondary" className="w-full" disabled={generating}>
              ⚡ Быстрый ответ
            </Button>
            <Button onClick={startAiFlow} variant="secondary" className="w-full" disabled={generating}>
              🤖 Помощь ИИ
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setPhase('explore')} className="w-full">
            Назад
          </Button>
        </Card>
      ) : null}

      {phase === 'custom' && message ? (
        <Card className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Твой ответ</h2>
            <p className="text-text-secondary">20–200 символов тепла и поддержки.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Textarea
              rows={5}
              maxLength={MAX_LENGTH}
              placeholder="Напиши, что ты рядом, что человек не один, поделись своим светом..."
              {...register('text', {
                required: 'Ответ не может быть пустым',
                minLength: { value: MIN_LENGTH, message: `Минимум ${MIN_LENGTH} символов` },
                maxLength: { value: MAX_LENGTH, message: `Максимум ${MAX_LENGTH} символов` },
              })}
            />
            <div className="flex items-center justify-between text-sm text-text-tertiary">
              <span>{errors.text?.message}</span>
              <span>
                {textValue.length}/{MAX_LENGTH}
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={submitting || textValue.length < MIN_LENGTH} className="w-full">
                {submitting ? 'Отправляем...' : 'Отправить свет'}
              </Button>
              <Button variant="secondary" onClick={() => setPhase('select')} className="w-full sm:w-auto">
                Назад
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {phase === 'quick' && message ? (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Выбери быстрый ответ</h2>
            <p className="text-text-secondary">Мы подготовили тёплые варианты. Выбери тот, что откликается.</p>
          </div>
          {generating ? (
            <p className="text-center text-text-secondary">Готовим тёплые слова...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {quickSuggestions.map((suggestion, index) => {
                const active = selectedQuick === suggestion;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedQuick(suggestion)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-uyan-light bg-uyan-light/10 text-text-primary'
                        : 'border-white/10 bg-bg-secondary/40 text-text-secondary hover:border-uyan-light/60'
                    }`}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => selectedQuick && sendResponse(selectedQuick, 'quick')}
              disabled={!selectedQuick || submitting || generating}
              className="w-full"
            >
              {submitting ? 'Отправляем...' : 'Отправить выбранный'}
            </Button>
            <Button variant="secondary" onClick={() => setPhase('select')} className="w-full sm:w-auto">
              Назад
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'ai' && message ? (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Подсказки от ИИ</h2>
            <p className="text-text-secondary">Один вариант — чистая эмпатия, второй — луч надежды. Выбери, что ближе.</p>
          </div>
          {generating ? (
            <p className="text-center text-text-secondary">Думаем вместе с ИИ...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {aiVariants.map((variant, index) => {
                const active = selectedAi === index;
                return (
                  <button
                    key={variant.tone}
                    type="button"
                    onClick={() => setSelectedAi(index)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-uyan-light bg-uyan-light/10 text-text-primary'
                        : 'border-white/10 bg-bg-secondary/40 text-text-secondary hover:border-uyan-light/60'
                    }`}
                  >
                    <span className="mb-2 block text-sm uppercase tracking-[0.3em] text-uyan-light">
                      {variant.tone === 'empathy' ? 'ЭМПАТИЯ' : 'НАДЕЖДА'}
                    </span>
                    {variant.text}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() =>
                selectedAi !== null &&
                selectedAi < aiVariants.length &&
                sendResponse(aiVariants[selectedAi].text, 'ai-assisted')
              }
              disabled={selectedAi === null || submitting || generating}
              className="w-full"
            >
              {submitting ? 'Отправляем...' : 'Отправить выбранный'}
            </Button>
            <Button variant="secondary" onClick={() => setPhase('select')} className="w-full sm:w-auto">
              Назад
            </Button>
          </div>
        </Card>
      ) : null}
    </motion.div>
  );
}
