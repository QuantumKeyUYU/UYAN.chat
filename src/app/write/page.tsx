'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ComposeForm, type ComposeFormFields } from '@/components/forms/ComposeForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { useSoftMotion } from '@/lib/animation';
import { ApiClientV2Error, postMessageV2 } from '@/lib/apiClientV2';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { useResolvedDeviceId } from '@/lib/hooks/useResolvedDeviceId';
import { triggerGlobalStatsRefresh } from '@/lib/statsEvents';
import { useUserStats } from '@/lib/hooks/useUserStats';

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
  const { deviceId, status: deviceStatus, resolving: deviceResolving, error: deviceError, refresh: refreshDevice } =
    useResolvedDeviceId();
  const deviceFailed = deviceStatus === 'error' || deviceStatus === 'failed';
  const { vocabulary } = useVocabulary();
  const infoLines = useMemo(() => vocabulary.writeInfoBlock.split('\n'), [vocabulary.writeInfoBlock]);
  const { refresh: refreshUserStats } = useUserStats();
  const { initial, animate, transition } = useSoftMotion();
  const form = useForm<ComposeFormFields>({
    defaultValues: { text: '', honeypot: '' },
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCrisisScreen, setShowCrisisScreen] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const textValue = form.watch('text') ?? '';

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
    setLoading(true);
    setErrorMessage(null);
    // Legacy Firestore API call (kept for reference during migration):
    /*
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (deviceId) {
      headers[DEVICE_ID_HEADER] = deviceId;
    }
    const response = await fetch('/api/messages/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: values.text,
        honeypot: values.honeypot,
        deviceId: deviceId ?? null,
      }),
    });
    */
    try {
      await postMessageV2(values.text);

      form.reset({ text: '', honeypot: '' });
      setCooldownSeconds(null);
      setSubmitted(true);
      try {
        triggerGlobalStatsRefresh();
        void refreshUserStats();
      } catch (error) {
        console.error('[write] Failed to trigger stats refresh', error);
      }
    } catch (error) {
      console.error(error);

      if (error instanceof ApiClientV2Error) {
        if (error.code === 'CRISIS') {
          setShowCrisisScreen(true);
          return;
        }

        if (error.status === 429) {
          const retryAfter =
            typeof (error.details as { retryAfter?: unknown } | null | undefined)?.retryAfter === 'number'
              ? (error.details as { retryAfter: number }).retryAfter
              : 0;
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setErrorMessage(
            `Сегодня ты уже поделился многими историями. Давай сделаем паузу и вернёмся через ${minutes} ${pluralizeMinutes(minutes)}.`,
          );
          setCooldownSeconds(retryAfter > 0 ? retryAfter : 60);
          return;
        }

        const reasonMessages: Record<string, string> = {
          contact: 'Мы не публикуем контакты и ссылки — так пространство остаётся безопасным для всех.',
          spam: 'Мысль выглядит как набор повторяющихся символов. Попробуй описать своё состояние простыми словами.',
          too_short: 'Добавь ещё немного конкретики, чтобы человеку было легче почувствовать твоё состояние.',
          too_long: 'Сократи мысль до 280 символов — так её дочитают внимательно.',
          crisis:
            'Если текст задевает кризисную тему, лучше написать короче и обратиться за поддержкой к тем, кто может помочь прямо сейчас.',
          TOO_SHORT: 'Добавь ещё немного конкретики, чтобы человеку было легче почувствовать твоё состояние.',
          TOO_LONG: 'Сократи мысль до 280 символов — так её дочитают внимательно.',
          EMPTY_BODY: 'Добавь ещё немного конкретики, чтобы человеку было легче почувствовать твоё состояние.',
        };

        if (error.code && reasonMessages[error.code]) {
          setErrorMessage(reasonMessages[error.code]);
          return;
        }

        setErrorMessage(error.message || 'Не удалось сохранить сообщение. Попробуй ещё раз чуть позже.');
        return;
      }

      setErrorMessage('Что-то пошло не так. Попробуй ещё раз чуть позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSubmit = useMemo(() => form.handleSubmit(onSubmit), [form, onSubmit]);
  const trimmedLength = textValue.trim().length;
  const isCooldownActive = typeof cooldownSeconds === 'number' && cooldownSeconds > 0;
  const isMobileButtonDisabled = loading || trimmedLength < MIN_LENGTH || isCooldownActive;
  const mobileButtonLabel = loading ? 'Отправляем…' : vocabulary.ctaWriteShort;

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
            <h2 className="text-2xl font-semibold text-text-primary">История отправлена</h2>
            <p className="text-text-secondary">
              Спасибо, что доверил нам эту историю. Следующий шаг — {vocabulary.ctaSupport.toLowerCase()}. После этого
              заглядывай в «Мои ответы» — мы напомним, когда появятся новые слова поддержки.
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
              Ответы появятся в разделе «Мои ответы». Если захочется передохнуть, всегда можно вернуться на главную.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div className="mx-auto flex max-w-3xl flex-col gap-7" initial={initial} animate={animate} transition={transition}>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-text-primary">{vocabulary.writeTitle}</h1>
          <p className="text-sm text-text-secondary sm:text-base">{vocabulary.writeSubtitle}</p>
        </div>
        {deviceResolving ? (
          <Notice variant="info">Готовим устройство… Можно уже писать — история всё равно сохранится.</Notice>
        ) : null}
        {!deviceResolving && deviceFailed ? (
          <Notice variant="warning">
            {deviceError ?? 'Не удалось подготовить устройство. Ты всё равно можешь отправить мысль.'}{' '}
            <button type="button" className="underline" onClick={() => { void refreshDevice(); }}>
              Попробовать снова
            </button>
          </Notice>
        ) : null}
        <Card className="border border-white/10 bg-bg-secondary/70 p-5 sm:p-6">
          <div className="space-y-3 text-sm leading-relaxed text-text-secondary sm:text-base">
            {infoLines.map((line, index) => (
              <p key={`info-line-${index}`}>{line}</p>
            ))}
          </div>
          <div className="mt-6">
            <ComposeForm
              form={form}
              onSubmit={onSubmit}
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              placeholder="Расскажи, что чувствуешь прямо сейчас…"
              submitLabel={vocabulary.ctaWriteShort}
              loadingLabel="Отправляем…"
              errorMessage={errorMessage}
              busy={loading}
              cooldownSeconds={cooldownSeconds}
              onChange={() => setErrorMessage(null)}
              helperHint={<p>Лучше один-два честных абзаца, чем большое эссе.</p>}
              textareaWrapperClassName="space-y-4 rounded-2xl border border-white/10 bg-bg-secondary/60 p-4 sm:p-5"
              fieldLabel={vocabulary.writeFieldLabel}
              helperHintClassName="mt-3 text-sm leading-relaxed text-text-tertiary/80"
            />
          </div>
        </Card>
      </motion.div>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] z-40 px-4 md:hidden">
        <div className="mx-auto w-full max-w-3xl">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-bg-primary/95 p-3 shadow-lg shadow-uyan-action/20 backdrop-blur">
            <Button
              type="button"
              disabled={isMobileButtonDisabled}
              className="w-full active:scale-[0.98]"
              onClick={() => {
                void handleMobileSubmit();
              }}
            >
              {mobileButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
