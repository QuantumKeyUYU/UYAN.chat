import { forwardRef } from 'react';

interface ShareCardProps {
  originalMessage: string;
  responseText: string;
  styleId: string;
  className?: string;
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

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ originalMessage, responseText, styleId, className }, ref) => {
    const style = STYLES[styleId] ?? STYLES.dawn;
    const containerClassName = [
      'relative flex h-full w-full flex-col justify-between gap-[8%] overflow-hidden rounded-[12%] bg-gradient-to-br p-[8%] shadow-2xl',
      style.background,
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={containerClassName}>
        <div className="absolute inset-0 bg-white/5" aria-hidden />
        <div className="relative flex flex-col gap-[6%]">
          <div
            className={`inline-flex w-min items-center gap-2 rounded-full px-[1.2em] py-[0.55em] text-[clamp(0.55rem,0.4rem+0.6vw,0.85rem)] font-medium uppercase tracking-[0.35em] ${style.badgeColor} ${style.badgeTextColor}`}
          >
            uyan.chat
          </div>
          <div
            className={`rounded-[10%] ${style.accent} p-[6%] text-[clamp(1.15rem,0.95rem+2vw,2.2rem)] font-medium leading-[clamp(1.6rem,1.2rem+2.4vw,2.8rem)] ${style.textColor} whitespace-pre-wrap break-words`}
          >
            “{originalMessage}”
          </div>
        </div>
        <div className="relative flex flex-col gap-[5%]">
          <div className={`text-[clamp(0.6rem,0.5rem+0.6vw,0.9rem)] uppercase tracking-[0.4em] ${style.textColor} opacity-80`}>
            свет для тебя
          </div>
          <div
            className={`rounded-[10%] bg-white/90 p-[7%] text-[clamp(1.25rem,1.05rem+2.2vw,2.3rem)] font-semibold leading-[clamp(1.8rem,1.4rem+2.6vw,3.1rem)] text-slate-900 shadow-xl shadow-black/10 whitespace-pre-wrap break-words`}
          >
            “{responseText}”
          </div>
          <div className={`text-right text-[clamp(0.55rem,0.45rem+0.55vw,0.85rem)] uppercase tracking-[0.35em] ${style.textColor} opacity-70`}>
            делись светом • #uyan
          </div>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';
