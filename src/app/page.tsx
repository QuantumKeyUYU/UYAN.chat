'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

  const navigationCards = useMemo(
    () => [
      {
        id: 'share',
        title: vocabulary.ctaWriteShort,
        description: 'Напиши, что чувствуешь прямо сейчас. Здесь слушают внимательно и без оценок.',
        href: '/write',
        accent: '🕯️',
      },
      {
        id: 'reply',
        title: vocabulary.ctaSupport,
        description: 'Выбирай мысль другого человека и отвечай ему тёплыми словами поддержки.',
        href: '/support',
        accent: '💬',
      },
      {
        id: 'saved',
        title: 'Сохранённое',
        description: 'Возвращайся к откликам, которые греют, и следи за словами поддержки, которыми делишься.',
        href: '/my',
        accent: '✨',
      },
    ],
    [vocabulary],
  );

  const howItWorks = useMemo(
    () => [
      {
        title: vocabulary.flow.writeTitle,
        description: 'Коротко расскажи о своём состоянии. Здесь тебя не оценивают, а слушают.',
      },
      {
        title: 'Подождать отклики',
        description: 'Сообщество прочитает твою историю и ответит тёплыми словами поддержки.',
      },
      {
        title: 'Сохранить важное',
        description: 'Отмечай ценные отклики и находи их позже в разделе «Сохранённое».',
      },
    ],
    [vocabulary],
  );

  const heroTitleLines = useMemo(() => vocabulary.homeHeroTitle.split('\n'), [vocabulary.homeHeroTitle]);

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

  const statsAreMeaningful = Boolean(
    stats && (stats.totalMessages > 0 || stats.totalResponses > 0 || stats.lightsToday > 0),
  );

  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-16 pt-10 sm:gap-20">
        <motion.section
          className="rounded-3xl border border-white/5 bg-gradient-to-br from-bg-secondary/80 via-bg-secondary/40 to-bg-secondary/80 p-8 shadow-glow"
          initial={initial}
          animate={animate}
          transition={heroTransition}
        >
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-uyan-light">
                  {vocabulary.homeHeroTaglineTitle}
                  {vocabulary.homeHeroTaglineSubtitle ? (
                    <>
                      <br />
                      {vocabulary.homeHeroTaglineSubtitle}
                    </>
                  ) : null}
                </p>
                <h1 className="text-3xl font-semibold text-text-primary sm:text-4xl">
                  {heroTitleLines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {line}
                      {index < heroTitleLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </h1>
              </div>
              <p className="max-w-2xl text-lg text-text-secondary">{vocabulary.homeHeroSubtitle}</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-auto">
              <Button
                onClick={() => router.push('/write')}
                size="lg"
                className="w-full shadow-[0_0_1.75rem_rgba(255,229,195,0.35)] ring-1 ring-uyan-action/40"
              >
                {vocabulary.ctaWriteHero}
              </Button>
              <p className="text-center text-xs text-text-tertiary sm:text-left">
                Без регистрации и лайков. Только живые слова.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 md:grid-cols-3"
          initial={initial}
          animate={animate}
          transition={actionsTransition}
        >
          {navigationCards.map((action, index) => {
            const delay = reducedMotion ? 0 : index * 0.05;
            return (
              <Link
                key={action.id}
                href={action.href}
                className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <motion.div
                  className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-white/5 bg-bg-secondary/70 p-4 text-left shadow-sm transition duration-200 ease-out group-hover:border-uyan-light/60 group-focus-visible:border-uyan-light/60 cursor-pointer select-none transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] sm:p-6"
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
                      <h2 className="text-2xl font-semibold text-text-primary transition-colors group-hover:text-uyan-light">
                        {action.title}
                      </h2>
                      <p className="text-sm text-text-secondary">{action.description}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-uyan-light transition group-hover:text-uyan-light/80">
                    Перейти →
                    <span className="sr-only">к разделу {action.title}</span>
                  </span>
                </motion.div>
              </Link>
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
          <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
            {howItWorks.map((item, index) => (
              <li key={item.title} className="flex gap-4 rounded-2xl bg-bg-secondary/60 p-4 md:flex-col md:gap-3">
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
              UYAN.chat — тихое место без гонки за лайками. Здесь можно честно говорить о своём состоянии и получать поддержку.
            </p>
            <p className="text-text-secondary">
              Каждая мысль проходит модерацию, а ответы пишут живые люди, не алгоритмы. Так мы бережём безопасность и доверие.
            </p>
          </div>
          <div className="rounded-2xl border border-uyan-action/30 bg-uyan-darkness/20 p-6 text-text-secondary">
            <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">что почувствуешь внутри</p>
            <div className="mt-4 space-y-3 text-lg">
              <p className="text-text-secondary">
                Бережное внимание, тишина без оценок и место, куда можно вернуться.
              </p>
              <p className="text-text-secondary">
                «Сохранённое» хранит важные слова, чтобы ты мог(ла) перечитывать их позже и делиться этим теплом дальше.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-4 rounded-3xl border border-white/5 bg-bg-secondary/60 p-6 sm:grid-cols-3"
          initial={initial}
          animate={animate}
          transition={summaryTransition}
        >
          {stats && statsAreMeaningful ? (
            <>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Сегодня</p>
                <p className="text-2xl font-semibold text-text-primary">{stats.lightsToday}</p>
                <p className="text-sm text-text-secondary">мысли прозвучали за последние 24 часа</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Всего мыслей</p>
                <p className="text-2xl font-semibold text-text-primary">{stats.totalMessages}</p>
                <p className="text-sm text-text-secondary">историй, которыми поделились</p>
                <p className="text-xs text-text-tertiary">откликов: {stats.totalResponses}</p>
              </div>
              <Link
                href="/support"
                className="group -m-2 flex flex-col space-y-1 rounded-2xl border border-transparent p-2 transition hover:border-uyan-light/40 hover:bg-bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light/60 active:bg-bg-secondary/60"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">Ждут отклика</p>
                <p className="text-2xl font-semibold text-text-primary transition group-hover:text-uyan-light">
                  {stats.messagesWaiting}
                </p>
                <p className="text-sm text-text-secondary">мысли сейчас ищут внимание</p>
              </Link>
            </>
          ) : (
            <div className="sm:col-span-3 flex min-h-[4rem] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-bg-secondary/50 px-4 text-sm text-text-secondary">
              <span className="truncate" title={statsError ?? 'Сегодня несколько человек поделились теплом. Один из них — может быть, ты.'}>
                {statsError ?? 'Сегодня несколько человек поделились теплом. Один из них — может быть, ты.'}
              </span>
            </div>
          )}
        </motion.section>
      </div>
      <p className="mx-auto mt-10 max-w-5xl px-4 text-center text-xs text-text-tertiary sm:px-6 sm:text-sm sm:text-left">
        {vocabulary.homeFooterHint}
      </p>
      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </>
  );
}
