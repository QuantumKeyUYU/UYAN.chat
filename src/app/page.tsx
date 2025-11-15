'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, type Transition } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { OnboardingModal } from '@/components/OnboardingModal';
import { isOnboardingDone } from '@/lib/onboarding';
import { useSoftMotion } from '@/lib/animation';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { addGlobalStatsRefreshListener } from '@/lib/statsEvents';

interface GlobalStats {
  messagesToday: number;
  messagesTotal: number;
  responsesTotal: number;
  waitingNow: number;
}

export default function HomePage() {
  const router = useRouter();
  const { vocabulary } = useVocabulary();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { initial, animate, transition } = useSoftMotion();

  const navigationCards = useMemo(
    () => [
      {
        id: 'share',
        title: vocabulary.homeTileWriteTitle,
        description: vocabulary.homeTileWriteBody,
        href: '/write',
        accent: '✍️',
      },
      {
        id: 'reply',
        title: vocabulary.homeTileSupportTitle,
        description: vocabulary.homeTileSupportBody,
        href: '/support',
        accent: '🤝',
      },
      {
        id: 'saved',
        title: vocabulary.homeTileAnswersTitle,
        description: vocabulary.homeTileAnswersBody,
        href: '/my',
        accent: '💬',
      },
    ],
    [vocabulary],
  );

  const howItWorks = useMemo(
    () => [
      {
        title: vocabulary.flow.writeTitle,
        description: vocabulary.flow.writeDescription,
      },
      {
        title: vocabulary.flow.waitTitle,
        description: vocabulary.flow.waitDescription,
      },
      {
        title: vocabulary.flow.saveTitle,
        description: vocabulary.flow.saveDescription,
      },
    ],
    [vocabulary],
  );

  const heroTitleLines = useMemo(() => vocabulary.homeHeroTitle.split('\n'), [vocabulary.homeHeroTitle]);
  const heroSubtitleLines = useMemo(() => vocabulary.homeHeroSubtitle.split('\n'), [vocabulary.homeHeroSubtitle]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const response = await fetch('/api/stats/global');
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { code?: string } | null;
        const unavailable = payload?.code === 'GLOBAL_STATS_UNAVAILABLE';
        if (unavailable) {
          setStats(null);
          setStatsError(null);
          return;
        }
        throw new Error('Failed to load stats');
      }
      const data = (await response.json()) as Partial<GlobalStats>;
      const normalized: GlobalStats = {
        messagesToday: data.messagesToday ?? 0,
        messagesTotal: data.messagesTotal ?? 0,
        responsesTotal: data.responsesTotal ?? 0,
        waitingNow: data.waitingNow ?? 0,
      };
      setStats(normalized);
    } catch (error) {
      console.error('Failed to fetch stats', error);
      setStats(null);
      setStatsError('Не удалось загрузить статистику.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const unsubscribe = addGlobalStatsRefreshListener(() => {
      void loadStats();
    });

    return unsubscribe;
  }, [loadStats]);

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
    stats && (stats.messagesTotal > 0 || stats.responsesTotal > 0 || stats.messagesToday > 0 || stats.waitingNow > 0),
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
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
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
              <p className="max-w-2xl text-lg text-text-secondary">
                {heroSubtitleLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < heroSubtitleLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
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
                Без регистрации и профилей. Только живые слова.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="grid gap-5 md:grid-cols-3"
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
                  className="flex h-full flex-col justify-between gap-7 rounded-3xl border border-white/5 bg-bg-secondary/70 p-4 text-left shadow-sm transition duration-200 ease-out group-hover:border-uyan-light/60 group-focus-visible:border-uyan-light/60 cursor-pointer select-none transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] sm:p-6"
                  initial={initial}
                  animate={animate}
                  transition={
                    reducedMotion
                      ? baseTransition
                      : { ...baseTransition, delay: (actionsTransition.delay ?? 0.15) + delay, duration: 0.45 }
                  }
                >
                  <div className="space-y-5">
                    <span className="text-3xl" aria-hidden>
                      {action.accent}
                    </span>
                    <div className="space-y-3">
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
          className="space-y-7 rounded-3xl border border-white/5 bg-bg-secondary/70 p-6"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">Как это работает</p>
            <h3 className="text-xl font-semibold text-text-primary">Три шага взаимной поддержки</h3>
          </div>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
            {howItWorks.map((item, index) => (
              <li key={item.title} className="flex gap-4 rounded-2xl bg-bg-secondary/60 p-4 md:flex-col md:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-uyan-darkness/40 text-base font-semibold text-uyan-light">
                  {index + 1}
                </span>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          className="grid gap-8 rounded-3xl bg-bg-secondary/60 p-8 sm:grid-cols-2"
          initial={initial}
          animate={animate}
          transition={infoTransition}
        >
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-text-primary">Зачем это нужно</h3>
            <p className="text-text-secondary">
              UYAN.chat — тихое пространство взаимной поддержки. Здесь честно говорят о том, как выдержать день, и отвечают друг
              другу теплом.
            </p>
            <p className="text-text-secondary">
              Каждая история проходит модерацию, а ответы пишут живые люди, а не алгоритмы — так мы бережём доверие и безопасность.
            </p>
          </div>
          <div className="rounded-2xl border border-uyan-action/30 bg-uyan-darkness/20 p-6 text-text-secondary">
            <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">что почувствуешь внутри</p>
            <div className="mt-4 space-y-4 text-lg">
              <p className="text-text-secondary">
                Бережное внимание, чувство связи и место, куда можно возвращаться в сложные дни.
              </p>
              <p className="text-text-secondary">
                «Ответы» хранят важные слова, которые напоминают: ты не один, чья-то поддержка — уже рядом.
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
          {statsLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`stats-skeleton-${index}`}
                  className="space-y-2 rounded-2xl border border-white/5 bg-bg-secondary/40 p-4 sm:p-5"
                  aria-hidden
                >
                  <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  <div className="h-8 w-20 rounded bg-white/15 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
                </div>
              ))
            : stats && statsAreMeaningful
              ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">{vocabulary.statsTodayTitle}</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.messagesToday}</p>
                    <p className="text-sm text-text-secondary">{vocabulary.statsTodaySubtitle}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">{vocabulary.statsTotalTitle}</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.messagesTotal}</p>
                    <p className="text-sm text-text-secondary">{vocabulary.statsTotalSubtitle}</p>
                    <p className="text-xs text-text-tertiary">
                      {vocabulary.statsTotalRepliesLabel}: {stats.responsesTotal}
                    </p>
                  </div>
                  <Link
                    href="/support"
                    className="group -m-2 flex flex-col space-y-1 rounded-2xl border border-transparent p-2 transition hover:border-uyan-light/40 hover:bg-bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light/60 active:bg-bg-secondary/60"
                  >
                    <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">{vocabulary.statsWaitingTitle}</p>
                    <p className="text-2xl font-semibold text-text-primary transition group-hover:text-uyan-light">
                      {stats.waitingNow}
                    </p>
                    <p className="text-sm text-text-secondary">{vocabulary.statsWaitingSubtitle}</p>
                  </Link>
                </>
              )
              : (
                <div className="sm:col-span-3 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-bg-secondary/50 px-4 py-6 text-center text-sm text-text-secondary">
                  <p className="max-w-md">
                    {statsError ?? 'Сегодня несколько человек поделились теплом. Один из них — может быть, ты.'}
                  </p>
                  {statsError ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void loadStats();
                      }}
                      className="px-4"
                    >
                      Попробовать ещё раз
                    </Button>
                  ) : null}
                </div>
              )}
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-5xl"
          initial={initial}
          animate={animate}
          transition={summaryTransition}
        >
          <div className="rounded-3xl border border-white/10 bg-bg-secondary/60 px-6 py-5 text-center text-lg text-text-primary shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)] sm:text-xl">
            {stats && !statsLoading ? (
              <p>
                Сегодня {stats.messagesToday} человек поделились теплом. Один из них — может быть, ты.
              </p>
            ) : (
              <p>Сегодня несколько человек поделились теплом. Один из них — может быть, ты.</p>
            )}
          </div>
        </motion.section>
      </div>
      <p className="mx-auto mt-10 max-w-5xl px-4 text-center text-xs text-text-tertiary sm:px-6 sm:text-sm sm:text-left">
        {vocabulary.homeFooterHint}
      </p>
      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </>
  );
}
