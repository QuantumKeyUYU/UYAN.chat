'use client';

import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="mt-8 border-t border-white/5 bg-bg-secondary/40 pb-24 sm:mt-10 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-base font-medium text-text-secondary sm:text-lg">Интернет без шума создаём вместе</p>
            <p className="mt-2 hidden text-sm text-text-tertiary/90 sm:block">
              Проект живёт благодаря людям. Когда-нибудь здесь появится тихая ссылка на поддержку — без рекламы и давления.
            </p>
            <p className="text-xs text-text-tertiary/80 sm:text-sm">© 2025 UYAN.chat — пространство тёплых мыслей</p>
          </div>
          <nav className="flex flex-col gap-1.5 text-xs text-text-secondary sm:flex-row sm:items-center sm:gap-6 sm:text-sm">
            <Link href="/support" className="transition hover:text-text-primary">
              Откликнуться
            </Link>
            <Link href="/settings" className="inline-flex items-center gap-1 transition hover:text-text-primary">
              <span aria-hidden>⚙</span>
              <span>Настройки</span>
            </Link>
            <a
              href="https://github.com/QuantumKeyUYU/UYAN.chat"
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-text-tertiary/70 transition hover:text-text-tertiary/90 sm:text-sm"
            >
              GitHub проекта
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
