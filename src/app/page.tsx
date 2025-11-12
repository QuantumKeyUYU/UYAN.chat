'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, type Transition } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { OnboardingModal } from '@/components/OnboardingModal';
import { isOnboardingDone } from '@/lib/onboarding';
import { useSoftMotion } from '@/lib/animation';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

interface GlobalStats {
  totalMessages: number;
  totalResponses: number;
  messagesWaiting: number;
  lightsToday: number;
}

export default function HomePage() {
  const router = useRouter();
  const { vocabulary } = useVocabulary();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { initial, animate, transition } = useSoftMotion();

  const primaryActions = useMemo(
    () => [
      {
        id: 'share',
        title: vocabulary.ctaWrite,
        subtitle: 'Сказать, что у меня внутри',
        href: '/write',
        accent: '🕯️',
      },
      {
        id: 'reply',
        title: vocabulary.ctaSupport,
        subtitle: 'Поддержать человека',
        href: '/support',
        accent: '💬',
      },
      {
        id: 'light',
        title: 'Мой свет',
        subtitle: 'Сохранённые слова и моя история',
        href: '/my',
        accent: '✨',
      },
    ],
    [vocabulary],
  );

  const howItWorks = useMemo(
    () => [
      {
        title: 'Поделиться мыслью',
        description: 'Напиши коротко и честно, что происходит внутри. Здесь слушают внимательно, без оценок.',
      },
      {
        title: 'Подождать отклики',
        description: 'Люди из сообщества прочитают твою историю и ответят тёплыми словами.',
      },
      {
        title: 'Сохранить важное',
        description: 'Добавь самые поддерживающие отклики в «Мой свет», чтобы возвращаться к ним потом.',
      },
    ],
    [],
  );

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats/global');
        if (!response.ok) {
          throw new Error('Failed to load stats');
        }
        const data = (await response.json()) as GlobalStats;
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
        setStatsError('Не удалось загрузить статистику.');
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    if (isOnboardingDone()) return;
    setOnboardingOpen(true);
  }, []);

  const reducedMotion = transition.duration === 0;
  const baseTransition: Transition = reducedMotion
    ? { duration: 0 }
    : {
        duration: transition.duration,
        ease: transition.ease,
      };

  const heroTransition: Transition = reducedMotion ? baseTransition : { ...baseTransition, duration: 0.8 };
  const actionsTransition: Transition = reducedMotion
    ? baseTransition
    : { ...baseTransition, delay: 0.15, duration: 0.5 };
  const infoTransition: Transition = reducedMotion ? baseTransition : { ...baseTransition, delay: 0.3, duration: 0.6 };
  const summaryTransition: Transition = reducedMotion
    ? baseTransition
    : { ...baseTransition, delay: 0.4, duration: 0.6 };

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-12 pt-10">
        <motion.section
          className="rounded-3xl border border-white/5 bg-gradient-to-br from-bg-secondary/80 via-bg-secondary/40 to-bg-secondary/80 p-8 shadow-glow"
          initial={initial}
          animate={animate}
          transition={heroTransition}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">интернет без лайков и шума</p>
              <h1 className="text-3xl font-semibold text-text-primary sm:text-4xl">{vocabulary.homeHeroTitle}</h1>
              <p className="max-w-2xl text-lg text-text-secondary">{vocabulary.homeHeroSubtitle}</p>
            </div>
            <Button onClick={() => router.push('/write')} size="lg" className="w-full sm:w-auto">
              {vocabulary.ctaWrite}
            </Button>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 md:grid-cols-3"
          initial={initial}
          animate={animate}
          transition={actionsTransition}
        >
          {primaryActions.map((action, index) => {
            const delay = reducedMotion ? 0 : index * 0.05;
            return (
              <motion.button
                key={action.id}
                type="button"
                onClick={() => router.push(action.href)}
                className="group flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/5 bg-bg-secondary/70 p-6 text-left shadow-sm transition hover:border-uyan-light/60 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light"
                initial={initial}
                animate={animate}
                transition={
                  reducedMotion
                    ? baseTransition
                    : { ...baseTransition, delay: (actionsTransition.delay ?? 0.15) + delay, duration: 0.45 }
                }
              >
                <div className="space-y-4">
                  <span className="text-3xl" aria-hidden>
                    {action.accent}
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-text-primary group-hover:text-uyan-light">{action.title}</h2>
                    <p className="text-sm text-text-secondary">{action.subtitle}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-uyan-light">Перейти →</span>
              </motion.button>
            );
          })}
        </motion.section>

        <motion.section
          className="space-y-6 rounded-3xl border border-white/5 bg-bg-secondary/70 p-6"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">Как всё устроено</p>
            <h3 className="text-xl font-semibold text-text-primary">Три простых шага тепла</h3>
          </div>
          <ol className="space-y-4">
            {howItWorks.map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-uyan-darkness/40 text-base font-semibold text-uyan-light">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          className="grid gap-6 rounded-3xl bg-bg-secondary/60 p-8 sm:grid-cols-2"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-text-primary">Зачем это нужно</h3>
            <p className="text-text-secondary">
              UYAN.chat — тёплое пространство без гонки за лайками. Здесь только люди и их истории, а каждый отклик — время и
              внимание настоящего человека.
            </p>
          </div>
          <div className="rounded-2xl border border-uyan-action/30 bg-uyan-darkness/20 p-6 text-text-secondary">
            <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">что почувствуешь внутри</p>
            <p className="mt-4 text-lg">
              Поддержка, которая остаётся с тобой. Сохраняй важные слова в «Мой свет», возвращайся к ним в моменты тишины и делись
              этим теплом с другими.
            </p>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/5 bg-bg-secondary/60 p-6 sm:grid-cols-3"
          initial={initial}
          animate={animate}
          transition={summaryTransition}
        >
          {stats ? (
            <>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Сегодня</p>
                <p className="text-2xl font-semibold text-text-primary">{stats.lightsToday}</p>
                <p className="text-sm text-text-secondary">мыслей прозвучало за последние 24 часа</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Всего мыслей</p>
                <p className="text-2xl font-semibold text-text-primary">{stats.totalMessages}</p>
                <p className="text-sm text-text-secondary">историй, которыми поделились</p>
                <p className="text-xs text-text-tertiary">откликов: {stats.totalResponses}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Ждут отклика</p>
                <p className="text-2xl font-semibold text-text-primary">{stats.messagesWaiting}</p>
                <p className="text-sm text-text-secondary">мыслей сейчас ищут внимание</p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-3 text-center text-sm text-text-secondary">
              {statsError ?? 'Загружаем обстановку...'}
            </div>
          )}
        </motion.section>
      </div>
      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </>
  );
}
