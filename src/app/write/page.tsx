'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ComposeForm, type ComposeFormFields } from '@/components/forms/ComposeForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDeviceStore } from '@/store/device';
import { useSoftMotion } from '@/lib/animation';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';

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
  const deviceId = useDeviceStore((state) => state.id);
  const { vocabulary } = useVocabulary();
  const { initial, animate, transition } = useSoftMotion();
  const form = useForm<ComposeFormFields>({
    defaultValues: { text: '', honeypot: '' },
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCrisisScreen, setShowCrisisScreen] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

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

  const onSubmit: SubmitHandler<ComposeFormFields> = async (values) => {
    if (!deviceId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({
          text: values.text,
          honeypot: values.honeypot,
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
            `Сегодня ты уже поделился многими мыслями. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
          );
          setCooldownSeconds(retryAfter > 0 ? retryAfter : 60);
          return;
        }

        if (result?.suggestion) {
          setErrorMessage(result.suggestion);
          return;
        }

        const reasonMessages: Record<string, string> = {
          contact:
            'Мы не публикуем контакты и личные данные — так пространство остаётся безопасным и анонимным.',
          spam: 'Мысль похожа на случайный набор символов. Лучше напиши простыми словами, что происходит внутри.',
          too_short: 'Добавь ещё пару фраз, чтобы люди лучше почувствовали твоё состояние.',
          too_long: 'Сократи историю до 280 символов, чтобы её смогли дочитать внимательно.',
          crisis:
            'Похоже, текст касается сильной боли. Напиши короче и бережнее, а за срочной помощью обратись к тем, кто сможет поддержать прямо сейчас.',
        };

        if (result?.reason && reasonMessages[result.reason]) {
          setErrorMessage(reasonMessages[result.reason]);
          return;
        }

        setErrorMessage(result?.error ?? 'Не удалось сохранить сообщение. Попробуй ещё раз чуть позже.');
        return;
      }

      form.reset({ text: '', honeypot: '' });
      setCooldownSeconds(null);
      setSubmitted(true);
      triggerGlobalStatsRefresh();
    } catch (error) {
      console.error(error);
      setErrorMessage('Что-то пошло не так. Попробуй ещё раз чуть позже.');
    } finally {
      setLoading(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Не удалось определить путь устройства. Перезагрузи страницу или попробуй открыть сервис заново.
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
            <h2 className="text-2xl font-semibold text-text-primary">Мысль сохранена</h2>
            <p className="text-text-secondary">
              Спасибо, что доверил нам эту мысль. Следующий шаг — {vocabulary.ctaSupport.toLowerCase()} кому-то ещё. После
              этого заглядывай в «Мои ответы» — мы напомним, когда появятся новые слова поддержки.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/support')} className="w-full sm:w-auto">
                {vocabulary.ctaSupport}
              </Button>
              <Button variant="secondary" onClick={() => router.push('/my')} className="w-full sm:w-auto">
                Перейти в «Мои ответы»
              </Button>
            </div>
            <p className="text-sm text-text-tertiary">
              Ответы появятся в разделе «Мои ответы». Если захочется передохнуть, можно вернуться на главную в любой момент.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div className="mx-auto flex max-w-3xl flex-col gap-6" initial={initial} animate={animate} transition={transition}>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-text-primary">{vocabulary.writeTitle}</h1>
          <p className="text-sm text-text-secondary sm:text-base">{vocabulary.writeSubtitle}</p>
        </div>
        <Card className="border border-white/10 bg-bg-secondary/70 p-5 sm:p-6">
          <div className="space-y-2 text-sm leading-relaxed text-text-secondary sm:text-base">
            <p>Мы видим только текст — никаких имён и контактов.</p>
            <p>Твою мысль прочитает живой человек. Ответ может прийти не сразу — это нормально.</p>
          </div>
          <div className="mt-6">
            <ComposeForm
              form={form}
              onSubmit={onSubmit}
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              placeholder="Напиши, что у тебя внутри прямо сейчас…"
              submitLabel={vocabulary.ctaWriteShort}
              loadingLabel="Отправляем…"
              errorMessage={errorMessage}
              busy={loading}
              cooldownSeconds={cooldownSeconds}
              onChange={() => setErrorMessage(null)}
              helperHint={<p>Лучше одно–два честных предложения, чем большое эссе.</p>}
              textareaWrapperClassName="space-y-3 rounded-2xl border border-white/10 bg-bg-secondary/60 p-4 sm:p-5"
              fieldLabel="Напиши, как тебе сейчас"
              helperHintClassName="mt-2 text-xs leading-relaxed text-text-tertiary/80"
            />
          </div>
        </Card>
      </motion.div>
    </>
  );
}
