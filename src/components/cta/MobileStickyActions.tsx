'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVocabulary } from '@/lib/hooks/useVocabulary';

export const MobileStickyActions = () => {
  const { vocabulary } = useVocabulary();
  const pathname = usePathname();
  const isSettingsPage = pathname === '/settings';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg-primary/90 backdrop-blur-xl sm:hidden">
      <div className="mx-auto flex max-w-3xl gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3">
        <Link
          href="/write"
          className="flex-1 rounded-xl bg-uyan-action px-4 py-3 text-center text-sm font-semibold text-bg-primary shadow-lg shadow-uyan-action/20 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
        >
          {vocabulary.ctaWriteShort}
        </Link>
        <Link
          href="/support"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-text-primary transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
        >
          {vocabulary.ctaSupport}
        </Link>
        {isSettingsPage ? null : (
          <Link
            href="/settings"
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-text-secondary transition hover:bg-white/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
          >
            {vocabulary.settings}
          </Link>
        )}
      </div>
    </div>
  );
};
