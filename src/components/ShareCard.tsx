import { forwardRef, useMemo, type CSSProperties } from 'react';
import {
  pickFontVariant,
  SHARE_CARD_BRAND_NAME,
  SHARE_CARD_BRAND_TAGLINE,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  ShareCardFontVariant,
} from '@/lib/shareCard';

interface ShareCardProps {
  originalMessage: string;
  responseText: string;
  styleId: string;
  className?: string;
  style?: CSSProperties;
}

const STYLES: Record<
  string,
  {
    background: string;
    accent: string;
    textColor: string;
    badgeColor: string;
    badgeTextColor: string;
  }
> = {
  dawn: {
    background: 'from-rose-500 via-orange-300 to-amber-100',
    accent: 'bg-white/30',
    textColor: 'text-slate-900',
    badgeColor: 'bg-white/50',
    badgeTextColor: 'text-slate-800',
  },
  aurora: {
    background: 'from-indigo-500 via-purple-400 to-cyan-300',
    accent: 'bg-white/20',
    textColor: 'text-white',
    badgeColor: 'bg-white/30',
    badgeTextColor: 'text-white',
  },
  twilight: {
    background: 'from-slate-900 via-slate-700 to-slate-500',
    accent: 'bg-white/10',
    textColor: 'text-white',
    badgeColor: 'bg-uyan-light/20',
    badgeTextColor: 'text-uyan-light',
  },
  meadow: {
    background: 'from-emerald-500 via-lime-300 to-amber-100',
    accent: 'bg-white/30',
    textColor: 'text-slate-900',
    badgeColor: 'bg-white/40',
    badgeTextColor: 'text-emerald-800',
  },
};

export const shareCardStyles = Object.keys(STYLES);

// размеры шрифта по вариантам — чуть более консервативные
const MESSAGE_FONT_CLASSES: Record<ShareCardFontVariant, string> = {
  lg: 'text-[64px] leading-[80px]',
  md: 'text-[52px] leading-[68px]',
  sm: 'text-[44px] leading-[58px]',
  xs: 'text-[36px] leading-[48px]',
};

const RESPONSE_FONT_CLASSES: Record<ShareCardFontVariant, string> = {
  lg: 'text-[72px] leading-[92px]',
  md: 'text-[60px] leading-[78px]',
  sm: 'text-[48px] leading-[64px]',
  xs: 'text-[40px] leading-[52px]',
};

// переносим строки, не режем слова дефисами, поддерживаем \n
const SAFE_TEXT_CLASS =
  'whitespace-pre-line break-normal hyphens-none [overflow-wrap:break-word]';

// без max-h и overflow: тексту даём жить
const MESSAGE_SAFE_ZONE = 'w-full max-w-[90%] self-start';
const RESPONSE_SAFE_ZONE = 'w-full max-w-[92%] self-start';

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  (
    { originalMessage, responseText, styleId, className, style: customStyle },
    ref,
  ) => {
    const style = STYLES[styleId] ?? STYLES.dawn;

    const containerClassName = [
      'relative flex h-full w-full min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[60px] bg-gradient-to-br p-[96px] shadow-2xl',
      style.background,
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const messageVariant = useMemo(
      () => pickFontVariant(originalMessage),
      [originalMessage],
    );
    const responseVariant = useMemo(
      () => pickFontVariant(responseText),
      [responseText],
    );

    return (
      <div
        ref={ref}
        className={containerClassName}
        style={{
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          ...customStyle,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-white/10"
          aria-hidden
        />

        {/* Верхний блок: мысль */}
        <div className="relative flex flex-col gap-12">
          <div
            className={`inline-flex w-min items-center gap-2 rounded-full px-10 py-4 text-[26px] font-semibold uppercase tracking-[0.35em] ${style.badgeColor} ${style.badgeTextColor}`}
          >
            uyan.chat
          </div>

          <div
            className={`rounded-[48px] ${style.accent} px-[64px] py-[56px] shadow-inner shadow-black/10 ${MESSAGE_SAFE_ZONE}`}
          >
            <p
              className={`${MESSAGE_FONT_CLASSES[messageVariant]} font-medium ${style.textColor} ${SAFE_TEXT_CLASS}`}
            >
              “{originalMessage}”
            </p>
          </div>
        </div>

        {/* Нижний блок: отклик */}
        <div className="relative flex flex-col gap-10">
          <div
            className={`text-[28px] uppercase tracking-[0.4em] ${style.textColor} opacity-80`}
          >
            свет для тебя
          </div>

          <div
            className={`rounded-[52px] bg-white/90 px-[72px] py-[64px] text-slate-900 shadow-xl shadow-black/15 ${RESPONSE_SAFE_ZONE}`}
          >
            <p
              className={`${RESPONSE_FONT_CLASSES[responseVariant]} font-semibold ${SAFE_TEXT_CLASS}`}
            >
              “{responseText}”
            </p>
          </div>

          <div
            className={`flex flex-col items-end text-right text-[28px] font-medium ${style.textColor} opacity-85`}
          >
            <span className="text-[22px] font-semibold uppercase tracking-[0.35em] opacity-70">
              {SHARE_CARD_BRAND_NAME}
            </span>
            <span className="text-[26px] leading-[34px] opacity-80">
              {SHARE_CARD_BRAND_TAGLINE}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';
