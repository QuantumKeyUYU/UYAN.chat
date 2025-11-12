'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const staticLinks = [
  { href: '/', label: 'Главная' },
  { href: '/write', dynamic: 'write' as const },
  { href: '/support', dynamic: 'support' as const },
  { href: '/my', label: 'Сохранённое' },
  { href: '/settings', label: 'Настройки' },
];

const MotionPresence = ({ children }: PropsWithChildren) => (
  <AnimatePresence initial={false}>{children}</AnimatePresence>
);

export const MobileNavDrawer = ({ open, onClose }: MobileNavDrawerProps) => {
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const disableMotion = reducedMotionSetting || prefersReducedMotion;
  const { vocabulary } = useVocabulary();
  const [allowDismiss, setAllowDismiss] = useState(false);
  const links = useMemo(
    () =>
      staticLinks.map((link) => {
        if ('dynamic' in link) {
          const label = link.dynamic === 'write' ? vocabulary.ctaWrite : vocabulary.ctaSupport;
          return { href: link.href, label };
        }
        return link;
      }),
    [vocabulary],
  );

  const overlayTransition = disableMotion ? undefined : { duration: 0.12, ease: 'easeOut' as const };
  const drawerTransition = disableMotion ? undefined : { duration: 0.12, ease: 'easeOut' as const, delay: 0.04 };

  useEffect(() => {
    if (!open) {
      setAllowDismiss(false);
      return;
    }

    const frame = requestAnimationFrame(() => setAllowDismiss(true));
    return () => {
      cancelAnimationFrame(frame);
      setAllowDismiss(false);
    };
  }, [open]);

  const handleOverlayClick = () => {
    if (!allowDismiss) return;
    onClose();
  };

  return (
    <MotionPresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-label="Закрыть меню"
            onClick={handleOverlayClick}
            initial={disableMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableMotion ? undefined : { opacity: 0 }}
            transition={overlayTransition}
          />
          <motion.nav
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-bg-primary/95 p-4 shadow-2xl"
            initial={disableMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={disableMotion ? undefined : { opacity: 0, y: 4 }}
            transition={drawerTransition}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex w-full max-w-md flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Навигация</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-text-secondary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Закрыть меню</span>
                </button>
              </div>
              <ul className="grid gap-2 text-lg">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="block rounded-2xl px-4 py-3 text-text-primary transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.nav>
        </>
      ) : null}
    </MotionPresence>
  );
};
