'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRepliesBadge } from '@/hooks/useRepliesBadge';

type NavSection = 'write' | 'support' | 'saved' | 'settings';

const items = [
  { id: 'write', href: '/write', label: 'Написать', icon: '✍️' },
  { id: 'support', href: '/support', label: 'Поддержать', icon: '🤝' },
  { id: 'saved', href: '/my', label: 'Ответы', icon: '💬' },
  { id: 'settings', href: '/settings', label: 'Настройки', icon: '⚙️' },
] as const satisfies ReadonlyArray<{ id: NavSection; href: string; label: string; icon: string }>;

function getActiveSection(pathname: string): NavSection | null {
  if (pathname === '/' || pathname.startsWith('/write')) return 'write';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/my')) return 'saved';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

export const MobileNavBar = () => {
  const pathname = usePathname() ?? '/';
  const activeSection = getActiveSection(pathname);
  const { unreadCount } = useRepliesBadge();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-3xl justify-around gap-1 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2">
        {items.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs transition-colors ${
                isActive ? 'text-uyan-gold' : 'text-slate-300 hover:text-slate-50'
              }`}
            >
              <span className="relative flex flex-col items-center gap-1">
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="text-xs">{item.label}</span>
                {item.id === 'saved' && unreadCount > 0 ? (
                  <span
                    className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-uyan-gold shadow-sm"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
