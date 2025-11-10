'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';
import { useSoftMotion } from '@/lib/animation';
import { Modal } from '@/components/ui/Modal';

interface FormValues {
  text: string;
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 280;

export default function WritePage() {
  const router = useRouter();
  const deviceId = useAppStore((state) => state.deviceId);
  const { initial, animate, transition } = useSoftMotion();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { text: '' },
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  const textValue = watch('text') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    if (!deviceId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: values.text,
          deviceId,
        }),
      });

      const result = await response.json();

      if (result?.crisis) {
        setShowCrisisModal(true);
        return;
      }

      if (!response.ok) {
        if (Array.isArray(result?.reasons) && result.reasons.length > 0) {
          setErrorMessage(
            'Сообщение не прошло модерацию. Попробуй смягчить формулировки и избегать оскорблений, угроз или личных данных.',
          );
        } else {
          setErrorMessage(result?.error ?? 'Не удалось сохранить сообщение. Попробуй ещё раз чуть позже.');
        }
        return;
      }

      reset();
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      setErrorMessage('Что-то пошло не так. Попробуй ещё раз чуть позже.');
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

  if (submitted) {
    return (
      <motion.div className="mx-auto flex max-w-3xl flex-col gap-8 text-center" initial={initial} animate={animate} transition={transition}>
        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-text-primary">Сообщение сохранено</h2>
            <p className="text-text-secondary">
              Спасибо, что доверился пространству. Теперь, чтобы получить ответ, зажги свет для кого-то ещё.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/support')} className="w-full sm:w-auto">
                Поддержать сейчас
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full sm:w-auto">
                Позже
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div className="mx-auto flex max-w-3xl flex-col gap-8" initial={initial} animate={animate} transition={transition}>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">🌑 Что сейчас на душе?</h1>
        <p className="text-text-secondary">Мы здесь, чтобы услышать. Пиши от сердца, 10–280 символов.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <Card>
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <Textarea
              rows={6}
              maxLength={MAX_LENGTH}
              placeholder="Расскажи о своём состоянии, страхах или усталости..."
              {...register('text', {
                required: 'Сообщение не может быть пустым',
                minLength: { value: MIN_LENGTH, message: `Минимум ${MIN_LENGTH} символов` },
                maxLength: { value: MAX_LENGTH, message: `Максимум ${MAX_LENGTH} символов` },
              })}
            />
            <div className="mt-2 flex items-center justify-between text-sm text-text-tertiary">
              <span>{errors.text?.message}</span>
              <span>
                {textValue.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>
          <Button type="submit" disabled={loading || textValue.length < MIN_LENGTH} className="w-full">
            {loading ? 'Отправляем...' : 'Продолжить'}
          </Button>
        </form>
      </Card>

      <Modal open={showCrisisModal} onClose={() => setShowCrisisModal(false)} title="Похоже, тебе сейчас очень тяжело">
        <p className="text-text-secondary">
          Этот чат — про поддержку, но он не подходит в момент острой опасности. Пожалуйста, обратись за живой помощью.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-sm text-text-secondary">
          <li>Свяжись с близким человеком, которому доверяешь.</li>
          <li>Обратись в местную линию помощи или экстренные службы.</li>
          <li>Если есть возможность — запиши, что чувствуешь, и покажи специалисту.</li>
        </ul>
        <div className="flex justify-end">
          <Button onClick={() => setShowCrisisModal(false)}>Понятно</Button>
        </div>
      </Modal>
    </motion.div>
  );
}
