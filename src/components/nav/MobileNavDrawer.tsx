'use client';

import Link from 'next/link';
import { AnimatePresence, motion as m, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

export type MobileNavDrawerState = 'closed' | 'opening' | 'open' | 'closing';

export type MobileNavDrawerEvent =
  | 'trigger'
  | 'outside'
  | 'close-button'
  | 'link'
  | 'navigation'
  | 'overlay'
  | 'route'
  | 'auto';

export interface MobileNavDrawerStateMeta {
  event?: MobileNavDrawerEvent;
  restoreFocus?: boolean;
}

export type MobileNavDrawerStateSetter = (next: MobileNavDrawerState, meta?: MobileNavDrawerStateMeta) => void;

interface MobileNavDrawerProps {
  state: MobileNavDrawerState;
  setState: MobileNavDrawerStateSetter;
  triggerRef: RefObject<HTMLElement | null>;
  id?: string;
}

const staticLinks = [
  { href: '/', label: 'Главная' },
  { href: '/write', dynamic: 'write' as const },
  { href: '/support', dynamic: 'support' as const },
  { href: '/my', label: 'Сохранённое' },
  { href: '/settings', label: 'Настройки' },
];

export const DRAWER_TRANSITION_DURATION = 180;

export const MobileNavDrawer = ({ state, setState, triggerRef, id }: MobileNavDrawerProps) => {
  const reducedMotionSetting = useSettingsStore((store) => store.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const disableMotion = reducedMotionSetting || prefersReducedMotion;
  const { vocabulary } = useVocabulary();
  const router = useRouter();
  const [allowDismiss, setAllowDismiss] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const navigationTimeoutRef = useRef<number | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
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

  const isVisible = state !== 'closed';
  const isOpen = state === 'open' || state === 'opening';

  const overlayTransition = disableMotion ? { duration: 0 } : { duration: 0.14, ease: 'easeOut' as const };
  const drawerTransition = disableMotion ? { duration: 0 } : { type: 'tween', duration: 0.18 };

  useEffect(() => {
    if (!isOpen) {
      setAllowDismiss(false);
      return;
    }

    const frame = requestAnimationFrame(() => setAllowDismiss(true));
    return () => {
      cancelAnimationFrame(frame);
      setAllowDismiss(false);
    };
  }, [isOpen]);

  const onOutside = useCallback(
    (event: PointerEvent) => {
      if (!isOpen || !allowDismiss || isNavigatingRef.current) return;
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setState('closing', { event: 'outside' });
    },
    [allowDismiss, isOpen, setState, triggerRef],
  );

  useEffect(() => {
    if (!isVisible || isNavigatingRef.current) return undefined;
    document.addEventListener('pointerdown', onOutside, { passive: true });
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [isVisible, onOutside]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;

    if (state !== 'closed') {
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
  }, [state]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('main, footer'));

    if (state !== 'closed') {
      nodes.forEach((node) => {
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('inert', '');
      });
      return () => {
        nodes.forEach((node) => {
          node.removeAttribute('aria-hidden');
          node.removeAttribute('inert');
        });
      };
    }

    nodes.forEach((node) => {
      node.removeAttribute('aria-hidden');
      node.removeAttribute('inert');
    });

    return undefined;
  }, [state]);

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      isNavigatingRef.current = false;
    },
    [],
  );

  const handleOverlayPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!allowDismiss || isNavigatingRef.current) {
      event.preventDefault();
    }
  };

  const handleOverlayClick = () => {
    if (!allowDismiss || isNavigatingRef.current) return;
    setState('closing', { event: 'overlay' });
  };

  const handleSettingsNavigation: MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.preventDefault();
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setIsNavigating(true);
    setState('closing', { event: 'navigation', restoreFocus: false });
    router.push('/settings');
    if (navigationTimeoutRef.current) {
      window.clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
      setIsNavigating(false);
      navigationTimeoutRef.current = null;
    }, 600);
  };

  const handleLinkClick = (href: string): MouseEventHandler<HTMLAnchorElement> => {
    if (href === '/settings') {
      return handleSettingsNavigation;
    }

    return (event) => {
      if (event.defaultPrevented) return;
      setState('closing', { event: 'link' });
    };
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {isVisible ? (
          <m.button
            key="drawer-overlay"
            type="button"
            className="fixed inset-0 z-40 bg-black"
            aria-label="Закрыть меню"
            onClick={handleOverlayClick}
            onPointerDown={handleOverlayPointerDown}
            initial={{ opacity: 0 }}
            animate={{ opacity: disableMotion ? 0.4 : 0.4 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false} mode="wait">
        {isVisible ? (
          <m.nav
            key="drawer"
            id={drawerId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-hidden={!isOpen}
            aria-labelledby={titleId}
            aria-busy={isNavigating}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-bg-primary/95 p-4 shadow-2xl"
            initial={disableMotion ? { y: 0, opacity: 1 } : { y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={disableMotion ? { y: 0, opacity: 1 } : { y: '100%', opacity: 1 }}
            transition={drawerTransition}
            style={{ willChange: disableMotion ? undefined : 'transform' }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex w-full max-w-md flex-col gap-4">
              <div className="flex items-center justify-between">
                <p id={titleId} className="text-sm font-medium text-text-secondary">
                  Навигация
                </p>
                <button
                  type="button"
                  onClick={() => setState('closing', { event: 'close-button' })}
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
          </m.nav>
        ) : null}
      </AnimatePresence>
    </>
  );
};
