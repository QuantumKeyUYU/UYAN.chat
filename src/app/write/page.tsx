'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { useAppStore } from '@/store/useAppStore';
import { useSoftMotion } from '@/lib/animation';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';

interface FormValues {
  text: string;
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 280;

const pluralizeMinutes = (minutes: number) => {
  if (minutes % 10 === 1 && minutes % 100 !== 11) {
    return 'минуту';
  }
  if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) {
    return 'минуты';
  }
  return 'минут';
};

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
  const [showCrisisScreen, setShowCrisisScreen] = useState(false);

  const textValue = watch('text') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    if (!deviceId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({
          text: values.text,
          deviceId,
        }),
      });

      const result = await response.json();

      if (result?.crisis) {
        setShowCrisisScreen(true);
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = typeof result?.retryAfter === 'number' ? result.retryAfter : 0;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setErrorMessage(
            `Ты сегодня уже много поделился. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
          );
          return;
        }

        if (result?.suggestion) {
          setErrorMessage(result.suggestion);
          return;
        }

        const reasonMessages: Record<string, string> = {
          contact:
            'Мы не показываем контакты и личные данные — так пространство остаётся безопасным и анонимным.',
          spam: 'Сообщение похоже на случайный набор символов. Лучше опиши, что чувствуешь, простыми словами.',
          too_short: 'Добавь ещё пару фраз, чтобы мы лучше почувствовали твоё состояние.',
          too_long: 'Сократи историю до 280 символов, чтобы её смогли дочитать внимательно.',
          crisis:
            'Похоже, текст касается сильной боли. Пожалуйста, напиши коротко и бережно — а за поддержкой обратись к тем, кто сможет помочь сразу.',
        };

        if (result?.reason && reasonMessages[result.reason]) {
          setErrorMessage(reasonMessages[result.reason]);
          return;
        }

        setErrorMessage(result?.error ?? 'Не удалось сохранить сообщение. Попробуй ещё раз чуть позже.');
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

  if (showCrisisScreen) {
    const crisisResources = [
      {
        title: 'Телефон доверия 8-800-2000-122',
        description: 'Круглосуточно и бесплатно по России. Можно позвонить анонимно.',
      },
      {
        title: 'Чат «Помощь рядом»',
        description: 'onlc.help — волонтёры, которые отвечают онлайн и поддерживают мягко.',
      },
      {
        title: 'Если есть опасность прямо сейчас',
        description: 'Позвони 112 или обратись к близкому человеку рядом — помощь должна быть живой.',
      },
    ];

    return (
      <motion.div className="mx-auto flex max-w-3xl flex-col gap-8" initial={initial} animate={animate} transition={transition}>
        <Card>
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-text-primary">Похоже, тебе сейчас очень тяжело</h2>
            <p className="text-text-secondary">
              Ты важен. Этот чат — про тёплые слова, но он не заменяет специалистов. Пожалуйста, обратись туда,
              где могут помочь сразу.
            </p>
            <div className="space-y-4 rounded-2xl bg-bg-secondary/60 p-4">
              {crisisResources.map((resource) => (
                <div key={resource.title} className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">{resource.title}</p>
                  <p className="text-sm text-text-secondary">{resource.description}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setShowCrisisScreen(false)} className="w-full sm:w-auto">
                Я сейчас в безопасности
              </Button>
              <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
                Вернуться на главную
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div className="mx-auto flex max-w-3xl flex-col gap-8 text-center" initial={initial} animate={animate} transition={transition}>
        <Card>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-text-primary">Сообщение сохранено</h2>
            <p className="text-text-secondary">
              Спасибо, что доверился пространству. Чтобы получить ответ, подари свет кому-то ещё — иногда это занимает чуть
              больше времени.
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

      {errorMessage ? <Notice variant="error">{errorMessage}</Notice> : null}

      <Card>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="rounded-2xl bg-bg-secondary/60 p-4 text-sm leading-relaxed text-text-secondary">
            <p>Твоё сообщение остаётся полностью анонимным — мы видим только текст.</p>
            <p className="mt-2">
              Его прочитает живой человек из сообщества, а ответ может прийти не сразу: иногда на поддержку нужно
              немного времени.
            </p>
          </div>
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
    </motion.div>
  );
}
