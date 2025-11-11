'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { PropsWithChildren, useMemo } from 'react';
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
  { href: '/my', label: 'Мои отклики' },
  { href: '/garden', label: 'Архив откликов' },
  { href: '/settings', label: 'Настройки' },
];

const MotionPresence = ({ children }: PropsWithChildren) => (
  <AnimatePresence initial={false}>{children}</AnimatePresence>
);

export const MobileNavDrawer = ({ open, onClose }: MobileNavDrawerProps) => {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const { vocabulary } = useVocabulary();
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

  const overlayVariants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1 } };

  const drawerVariants = reducedMotion
    ? { hidden: { y: 0 }, visible: { y: 0 } }
    : { hidden: { y: '100%' }, visible: { y: 0 } };

  return (
    <MotionPresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-label="Закрыть навигацию"
            onClick={onClose}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
          />
          <motion.nav
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-bg-primary/95 p-4 shadow-2xl"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={drawerVariants}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="mx-auto flex w-full max-w-md flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-secondary">Разделы</p>
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
