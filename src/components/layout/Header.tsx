'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Moon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const links = [
  { href: '/', label: 'Дом' },
  { href: '/write', label: 'Написать' },
  { href: '/support', label: 'Поддержать' },
  { href: '/my', label: 'Мои огоньки' },
  { href: '/garden', label: 'Сад света' },
  { href: '/settings', label: 'Настройки' },
];

const primaryButtonClass =
  'inline-flex items-center gap-2 rounded-xl bg-uyan-action px-4 py-2 text-sm font-medium text-bg-primary shadow-lg shadow-uyan-action/20 transition-all duration-200 hover:scale-[1.02] hover:bg-uyan-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uyan-action';

export const Header = () => {
  const pathname = usePathname();
  const deviceId = useAppStore((state) => state.deviceId);
  const stats = useAppStore((state) => state.stats);

  const lightsGiven = stats?.lightsGiven ?? 0;
  const lightsReceived = stats?.lightsReceived ?? 0;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <motion.span
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-uyan-darkness/30 text-uyan-light"
            animate={{ rotate: [0, 8, -6, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          >
            <Moon className="h-5 w-5" />
          </motion.span>
          <span>UYAN.chat</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-text-secondary sm:flex">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 transition hover:text-text-primary ${isActive ? 'text-text-primary' : ''}`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="navHighlight"
                    className="absolute inset-0 rounded-xl bg-bg-secondary/80"
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  />
                ) : null}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-xs text-text-tertiary">
            <span>
              ID устройства: <span className="text-text-secondary">{deviceId ?? '—'}</span>
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-xl bg-bg-secondary/70 px-2 py-1 text-text-secondary">
                <span aria-hidden>🔥</span>
                <span className="font-semibold text-text-primary tabular-nums">{lightsGiven}</span>
              </span>
              <span className="flex items-center gap-1 rounded-xl bg-bg-secondary/70 px-2 py-1 text-text-secondary">
                <span aria-hidden>💫</span>
                <span className="font-semibold text-text-primary tabular-nums">{lightsReceived}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary sm:hidden">
            <span>
              🔥 <span className="tabular-nums text-text-primary">{lightsGiven}</span>
            </span>
            <span>
              💫 <span className="tabular-nums text-text-primary">{lightsReceived}</span>
            </span>
          </div>
          <Link href="/support" className={primaryButtonClass}>
            <Sparkles className="h-4 w-4" />
            <span>Дать свет</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
