'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
} from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: (options?: { restoreFocus?: boolean }) => void;
  id?: string;
}

const staticLinks = [
  { href: '/', label: 'Главная' },
  { href: '/write', dynamic: 'write' as const },
  { href: '/support', dynamic: 'support' as const },
  { href: '/my', label: 'Сохранённое' },
  { href: '/settings', label: 'Настройки' },
];

const DRAWER_HIDE_DELAY = 180;

export const MobileNavDrawer = ({ open, onClose, id }: MobileNavDrawerProps) => {
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const disableMotion = reducedMotionSetting || prefersReducedMotion;
  const { vocabulary } = useVocabulary();
  const router = useRouter();
  const [allowDismiss, setAllowDismiss] = useState(false);
  const [visible, setVisible] = useState(open);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<number | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);
  const drawerId = id ?? 'mobile-nav-drawer';
  const titleId = `${drawerId}-title`;
  const links = useMemo(
    () =>
      staticLinks.map((link) => {
        if ('dynamic' in link) {
          const label = link.dynamic === 'write' ? vocabulary.ctaWriteShort : vocabulary.ctaSupport;
          return { href: link.href, label };
        }
        return link;
      }),
    [vocabulary],
  );

  const overlayTransition = disableMotion ? { duration: 0 } : { duration: 0.14, ease: 'easeOut' as const };
  const drawerTransition = disableMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: 'easeOut' as const, delay: 0.05 };

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

  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }

    if (disableMotion) {
      setVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), DRAWER_HIDE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [open, disableMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;

    if (open) {
      previousBodyOverflow.current = body.style.overflow;
      body.style.overflow = 'hidden';
      return () => {
        body.style.overflow = previousBodyOverflow.current ?? '';
        previousBodyOverflow.current = null;
      };
    }

    if (previousBodyOverflow.current !== null) {
      body.style.overflow = previousBodyOverflow.current;
      previousBodyOverflow.current = null;
    }

    return undefined;
  }, [open]);

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    },
    [],
  );

  const closeDrawer = (options?: { restoreFocus?: boolean }) => {
    onClose(options);
  };

  const handleOverlayPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!allowDismiss || isNavigating) {
      event.preventDefault();
    }
  };

  const handleOverlayClick = () => {
    if (!allowDismiss || isNavigating) return;
    closeDrawer();
  };

  const handleSettingsNavigation: MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    closeDrawer({ restoreFocus: false });
    const delay = disableMotion ? 0 : DRAWER_HIDE_DELAY;
    navigationTimeoutRef.current = window.setTimeout(() => {
      router.push('/settings');
      navigationTimeoutRef.current = null;
      window.setTimeout(() => setIsNavigating(false), 400);
    }, delay);
  };

  const handleLinkClick = (href: string): MouseEventHandler<HTMLAnchorElement> => {
    if (href === '/settings') {
      return handleSettingsNavigation;
    }

    return (event) => {
      if (event.defaultPrevented) return;
      closeDrawer();
    };
  };

  return (
    <>
      <motion.button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-label="Закрыть меню"
        onClick={handleOverlayClick}
        onPointerDown={handleOverlayPointerDown}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={overlayTransition}
        style={{ pointerEvents: open ? 'auto' : 'none', visibility: visible ? 'visible' : 'hidden' }}
      />
      <motion.nav
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby={titleId}
        aria-busy={isNavigating}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-bg-primary/95 p-4 shadow-2xl"
        initial={false}
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : 20 }}
        transition={drawerTransition}
        style={{
          pointerEvents: open ? 'auto' : 'none',
          visibility: visible ? 'visible' : 'hidden',
          willChange: disableMotion ? undefined : 'transform',
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="flex items-center justify-between">
            <p id={titleId} className="text-sm font-medium text-text-secondary">
              Навигация
            </p>
            <button
              type="button"
              onClick={() => closeDrawer()}
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
                  onClick={handleLinkClick(link.href)}
                  aria-disabled={isNavigating && link.href === '/settings'}
                  data-loading={isNavigating && link.href === '/settings' ? 'true' : undefined}
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
  );
};
