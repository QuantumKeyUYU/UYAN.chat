'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { useAppStore } from '@/store/useAppStore';

type MessagePayload = {
  id: string;
  text: string;
  category: string;
  createdAt: number;
  expiresAt: number;
  status: string;
  deviceId: string;
};

interface ResponseForm {
  text: string;
}

type Phase = 'explore' | 'answer' | 'success';

const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

export default function SupportPage() {
  const deviceId = useAppStore((state) => state.deviceId);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('explore');
  const [message, setMessage] = useState<MessagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    setPhase('explore');
    try {
      const response = await fetch(`/api/messages/random?deviceId=${deviceId}`);
      if (!response.ok) {
        throw new Error('Не удалось получить сообщение');
      }
      const data = await response.json();
      setMessage(data.message ?? null);
      reset();
    } catch (err) {
      console.error(err);
      setError('Кажется, все сообщения уже окружены светом. Попробуй заглянуть позже.');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchRandomMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const onSubmit = handleSubmit(async (values) => {
    if (!deviceId || !message) return;
    setLoading(true);
    try {
      const response = await fetch('/api/responses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          text: values.text,
          type: 'custom',
          deviceId,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'Не удалось отправить ответ');
      }
      reset();
      setPhase('success');
    } catch (err) {
      console.error(err);
      alert('Не получилось отправить свет. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  });

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Загружаем твой путь... Обнови страницу, если ожидание затянулось.
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <motion.div
        className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">💫 Поддержи кого-то</h1>
        <p className="text-text-secondary">Прочитай сообщение и поделись тёплыми словами. Без советов, только поддержка.</p>
      </div>

      {error ? (
        <Card>
          <p className="text-center text-text-secondary">{error}</p>
          <Button variant="secondary" onClick={fetchRandomMessage} className="mt-4 w-full">
            Обновить
          </Button>
        </Card>
      ) : null}

      {message ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between text-sm text-text-tertiary">
            <span className="rounded-full bg-uyan-darkness/20 px-3 py-1 text-text-secondary">Категория: {message.category}</span>
            <span>Истекает через 24 часа</span>
          </div>
          <p className="text-lg text-text-primary">{message.text}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setPhase('answer')} className="w-full sm:w-auto">
              💫 Поддержать
            </Button>
            <Button variant="secondary" onClick={fetchRandomMessage} className="w-full sm:w-auto" disabled={loading}>
              ⏭ Другое сообщение
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'answer' && message ? (
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
            <Button type="submit" disabled={loading || textValue.length < MIN_LENGTH} className="w-full">
              {loading ? 'Отправляем...' : 'Отправить свет'}
            </Button>
          </form>
        </Card>
      ) : null}
    </motion.div>
  );
}
