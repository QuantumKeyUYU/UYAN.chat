'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, PenSquare } from 'lucide-react';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';
import { useRepliesStore } from '@/store/replies';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

type HeaderLink =
  | { href: string; label: string }
  | { href: string; labelKey: 'ctaWriteShort' | 'ctaSupport' };

const baseLinks: HeaderLink[] = [
  { href: '/', label: 'Главная' },
  { href: '/write', labelKey: 'ctaWriteShort' as const },
  { href: '/support', labelKey: 'ctaSupport' as const },
  { href: '/my', label: 'Отклики' },
  { href: '/settings', label: 'Настройки' },
];

const formatNumber = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

export const Header = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [statsOpen, setStatsOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const stats = useStatsStore((state) => state.data);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const { vocabulary } = useVocabulary();
  const unreadCount = useRepliesStore((state) => state.unreadCount);
  const isHome = pathname === '/';
  const isSettings = pathname === '/settings';
  const [canGoBack, setCanGoBack] = useState(false);

  const links = useMemo(() => {
    return baseLinks.map((link) => {
      if ('labelKey' in link) {
        return { href: link.href, label: vocabulary[link.labelKey] };
      }
      return { href: link.href, label: link.label };
    });
  }, [vocabulary]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const height = headerRef.current?.offsetHeight ?? 64;
      document.documentElement.style.setProperty('--header-h', `${height}px`);
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    setStatsOpen(false);
    if (typeof window !== 'undefined') {
      setCanGoBack(window.history.length > 1);
    }
  }, [pathname]);

  const statsLabel = `${formatNumber(stats?.lightsGiven ?? 0)} / ${formatNumber(stats?.lightsReceived ?? 0)}`;
  const motionProps = reducedMotion
    ? { animate: { rotate: 0 } }
    : { animate: { rotate: [0, 8, -6, 0] }, transition: { repeat: Infinity, duration: 8, ease: 'easeInOut' } };

  useEffect(() => {
    if (!statsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!statsRef.current) return;
      if (!statsRef.current.contains(event.target as Node)) {
        setStatsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setStatsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [statsOpen]);

  const handleBackClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!canGoBack) return;
      event.preventDefault();
      router.back();
    },
    [canGoBack, router],
  );

  return (
    <header
      ref={(node) => {
        headerRef.current = node;
      }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-bg-primary/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          {isSettings ? (
            <Link
              href="/"
              onClick={handleBackClick}
              className="inline-flex h-10 items-center gap-1 rounded-full border border-white/10 px-3 text-sm font-medium text-text-primary transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action sm:hidden"
            >
              <span aria-hidden>←</span>
              <span>Назад</span>
            </Link>
          ) : null}
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <motion.span
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-uyan-darkness/30 text-uyan-light"
              initial={{ rotate: 0 }}
              {...motionProps}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
            </motion.span>
            <span className="leading-none">UYAN.chat</span>
          </Link>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-3 text-sm text-text-secondary sm:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`relative rounded-xl px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action ${
                  isActive ? 'text-text-primary' : 'hover:text-text-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive ? (
                  <span className="absolute inset-0 rounded-xl bg-white/5" aria-hidden />
                ) : null}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <span>{link.label}</span>
                  {link.href === '/my' && unreadCount > 0 ? (
                    <span className="inline-flex min-w-[18px] justify-center rounded-full bg-uyan-gold px-1 text-[11px] font-semibold text-slate-950">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="relative" ref={statsRef}>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
              aria-expanded={statsOpen}
              aria-controls="header-stats"
              onClick={() => setStatsOpen((prev) => !prev)}
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              <span className="tabular-nums text-sm text-text-primary">{statsLabel}</span>
            </button>
            {statsOpen ? (
              <div
                id="header-stats"
                className="absolute right-0 top-[calc(100%+0.5rem)] w-64 rounded-2xl border border-white/10 bg-bg-primary/95 p-4 text-sm shadow-lg"
              >
                <p className="text-text-primary">Мыслей отправлено: {formatNumber(stats?.lightsGiven ?? 0)}</p>
                <p className="mt-1 text-text-primary">Получено откликов: {formatNumber(stats?.lightsReceived ?? 0)}</p>
                <p className="mt-3 text-xs text-text-tertiary">
                  Делись теплом и возвращайся в «Отклики», чтобы сохранять важные слова.
                </p>
              </div>
            ) : null}
          </div>

          {!isHome ? (
            <>
              <Link
                href="/write"
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action sm:inline-flex"
              >
                <PenSquare className="h-4 w-4" aria-hidden />
                <span>{vocabulary.ctaWriteShort}</span>
              </Link>

              <Link
                href="/support"
                className="hidden items-center gap-2 rounded-xl bg-uyan-action px-4 py-2 text-sm font-semibold text-bg-primary shadow-lg shadow-uyan-action/20 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action sm:inline-flex"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                <span>{vocabulary.ctaSupport}</span>
              </Link>
            </>
          ) : null}

        </div>
      </div>
    </header>
  );
};
