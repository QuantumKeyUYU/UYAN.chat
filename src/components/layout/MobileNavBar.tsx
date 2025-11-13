'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/write', label: 'Мысль', icon: '💭' },
  { href: '/support', label: 'Отклик', icon: '💬' },
  { href: '/my', label: 'Сохранённое', icon: '✨' },
  { href: '/settings', label: 'Настройки', icon: '⚙️' },
];

export const MobileNavBar = () => {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-3xl justify-around gap-1 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs transition-colors ${
                isActive ? 'text-uyan-gold' : 'text-slate-300 hover:text-slate-50'
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
