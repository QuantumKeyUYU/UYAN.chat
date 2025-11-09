interface ShareCardProps {
  originalMessage: string;
  responseText: string;
  styleId: string;
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

export const ShareCard = ({ originalMessage, responseText, styleId }: ShareCardProps) => {
  const style = STYLES[styleId] ?? STYLES.dawn;

  return (
    <div
      id="sharecard"
      className={`relative flex h-[1350px] w-[1080px] flex-col justify-between overflow-hidden rounded-[60px] bg-gradient-to-br p-20 shadow-2xl ${style.background}`}
    >
      <div className="absolute inset-0 bg-white/5" aria-hidden />
      <div className="relative flex flex-col gap-12">
        <div className={`inline-flex w-min items-center gap-3 rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.4em] ${style.badgeColor} ${style.badgeTextColor}`}>
          uyan.chat
        </div>
        <div className={`rounded-3xl ${style.accent} p-10 text-3xl leading-relaxed ${style.textColor}`}>
          “{originalMessage}”
        </div>
      </div>
      <div className="relative flex flex-col gap-6">
        <div className={`text-sm uppercase tracking-[0.4em] ${style.textColor} opacity-80`}>свет для тебя</div>
        <div className={`rounded-3xl bg-white/90 p-12 text-3xl font-medium leading-relaxed text-slate-900 shadow-xl shadow-black/10`}>“{responseText}”</div>
        <div className={`text-right text-sm uppercase tracking-[0.4em] ${style.textColor} opacity-70`}>делись светом • #uyan</div>
      </div>
    </div>
  );
};
