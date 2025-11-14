'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRepliesBadge } from '@/hooks/useRepliesBadge';

type NavSection = 'write' | 'support' | 'answers' | 'settings';

const items = [
  { id: 'write', href: '/write', label: 'Написать', icon: '✍️' },
  { id: 'support', href: '/support', label: 'Поддержать', icon: '🤝' },
  { id: 'answers', href: '/my', label: 'Ответы', icon: '💬' },
  { id: 'settings', href: '/settings', label: 'Настройки', icon: '⚙️' },
] as const satisfies ReadonlyArray<{ id: NavSection; href: string; label: string; icon: string }>;

function getActiveSection(pathname: string): NavSection | null {
  if (pathname === '/' || pathname.startsWith('/write')) return 'write';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/my')) return 'answers';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

export const MobileNavBar = () => {
  const pathname = usePathname() ?? '/';
  const activeSection = getActiveSection(pathname);
  const { hasUnseenReplies, count } = useRepliesBadge();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
      role="navigation"
      aria-label="Основная навигация"
    >
      <div className="mx-auto flex max-w-3xl justify-around gap-1 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2">
        {items.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs transition-colors transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light/70 ${
                isActive ? 'text-uyan-gold' : 'text-slate-300 hover:text-slate-50'
              } active:scale-95 active:opacity-85`}
            >
              <span className="relative flex flex-col items-center gap-1">
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="text-xs">{item.label}</span>
                {item.id === 'answers' && hasUnseenReplies ? (
                  <>
                    <span className="sr-only">Есть непрочитанные ответы</span>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-1.5 -right-2.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-uyan-gold px-1 text-[10px] font-semibold leading-tight text-slate-950 shadow-sm"
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                  </>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
