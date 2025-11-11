'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OnboardingModal } from '@/components/OnboardingModal';
import { Stepper } from '@/components/stepper';
import { MobileStickyActions } from '@/components/cta/MobileStickyActions';
import { getFlowSteps } from '@/lib/flowSteps';
import { isOnboardingDone } from '@/lib/onboarding';
import { useSoftMotion } from '@/lib/animation';
import { useStepState } from '@/lib/hooks/useStepState';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

interface GlobalStats {
  totalMessages: number;
  totalResponses: number;
  messagesWaiting: number;
  lightsToday: number;
}

export default function HomePage() {
  const router = useRouter();
  const { preset, vocabulary } = useVocabulary();
  const steps = useMemo(() => getFlowSteps(preset), [preset]);
  const stepper = useStepState({ total: steps.length, initial: 0 });
  const actions = useMemo(
    () => [
      {
        title: `✨ ${vocabulary.ctaWrite}`,
        description: 'Расскажи, что у тебя на душе. Сообщения остаются анонимными, а путь между устройствами сохраняется по ключу.',
        href: '/write',
      },
      {
        title: `💬 ${vocabulary.ctaSupport}`,
        description: 'Выбери мысль из потока и поделись откликом. Каждое слово помогает человеку чувствовать, что он не один.',
        href: '/support',
      },
    ],
    [vocabulary],
  );
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { initial, animate, transition } = useSoftMotion();

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

  const heroTransition = transition.duration === 0 ? transition : { ...transition, duration: 0.8 };
  const infoTransition = transition.duration === 0 ? transition : { ...transition, delay: 0.3, duration: 0.6 };
  const summaryTransition = transition.duration === 0 ? transition : { ...transition, delay: 0.4, duration: 0.6 };

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

        <section className="grid gap-6 md:grid-cols-2">
          {actions.map((action, index) => {
            const actionTransition =
              transition.duration === 0
                ? transition
                : { ...transition, delay: 0.2 * index, duration: 0.5 };
            return (
              <motion.div key={action.title} initial={initial} animate={animate} transition={actionTransition}>
                <Card className="h-full">
                  <div className="flex h-full flex-col justify-between gap-6">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold text-text-primary">{action.title}</h2>
                      <p className="text-text-secondary">{action.description}</p>
                    </div>
                    <Button variant="secondary" onClick={() => router.push(action.href)} className="w-full">
                      Перейти
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <motion.section
          className="space-y-4 rounded-3xl border border-white/5 bg-bg-secondary/70 p-6"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">Как всё устроено</p>
            <h3 className="text-xl font-semibold text-text-primary">Путь мысли и отклика</h3>
          </div>
          <Stepper steps={steps} activeIndex={stepper.active} />
        </motion.section>

        <motion.section
          className="grid gap-6 rounded-3xl bg-bg-secondary/60 p-8 sm:grid-cols-2"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-text-primary">Что почувствуешь внутри</h3>
            <ul className="space-y-2 text-text-secondary">
              <li>1. Поделись мыслью — коротко, честно и без указания себя.</li>
              <li>2. Загляни в поток — выбери чью-то историю и откликнись поддержкой.</li>
              <li>3. Собери архив — сохраняй важные слова и переноси их между устройствами ключом.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-uyan-action/30 bg-uyan-darkness/20 p-6 text-text-secondary">
            <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">зачем это нужно</p>
            <p className="mt-4 text-lg">
              UYAN.chat — тёплое пространство без гонки за лайками. Здесь только люди и их истории, а каждый отклик — время и
              внимание настоящего человека.
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
      <MobileStickyActions />
    </>
  );
}
