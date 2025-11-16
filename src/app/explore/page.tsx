'use client';

import Link from 'next/link';
import { useFirebaseContext } from '@/components/providers/client-providers';
import { useWeekCrewStore, type ExploreResource } from '@/store/weekcrew';

const badgeColors: Record<ExploreResource['category'], string> = {
  ritual: 'bg-emerald-500/20 text-emerald-200',
  article: 'bg-sky-500/20 text-sky-200',
  practice: 'bg-amber-500/20 text-amber-100',
};

const ResourceCard = ({ resource }: { resource: ExploreResource }) => (
  <article className="flex flex-col justify-between rounded-3xl border border-white/10 bg-bg-secondary/60 p-5 shadow-glow transition hover:border-white/30">
    <div className="flex flex-col gap-3">
      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeColors[resource.category]}`}>
        {resource.category}
      </span>
      <h3 className="text-lg font-semibold text-text-primary">{resource.title}</h3>
      <p className="text-sm text-text-secondary">{resource.summary}</p>
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
      <span className="rounded-full border border-white/10 px-3 py-1">{resource.duration}</span>
      <div className="flex flex-wrap gap-2">
        {resource.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-text-secondary">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  </article>
);

export default function ExplorePage() {
  const resources = useWeekCrewStore((state) => state.resources);
  const insights = useWeekCrewStore((state) => state.insights);
  const { demoMode, status } = useFirebaseContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 py-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.35em] text-uyan-light">explore</p>
        <h1 className="text-3xl font-semibold text-text-primary">Что помогает команде оставаться в ресурсе</h1>
        <p className="text-text-secondary">
          Здесь собраны практики и короткие статьи, которые держат WeekCrew живым, даже если Firebase недоступен. Все данные сейчас
          {demoMode ? ' прогружаются в demo-режиме — можно экспериментировать и ничего не сломать.' : ' приходят из live-среды.'}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
          <span className="rounded-full border border-white/10 px-3 py-1">Firebase: {status}</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Ресурсов: {resources.length}</span>
          <Link href="/debug" className="rounded-full border border-white/10 px-3 py-1 text-uyan-gold transition hover:border-uyan-gold">
            /debug →
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-text-primary">Практики и материалы</h2>
          <span className="text-sm text-text-secondary">Обновляются локально — ничего не пропадёт, если пропадёт сеть.</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Наблюдения недели</h2>
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text-secondary">
          {insights.map((insight) => (
            <p key={insight} className="relative pl-6">
              <span className="absolute left-0 top-1 block h-2 w-2 rounded-full bg-uyan-gold" aria-hidden />
              {insight}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-bg-secondary/70 p-6 text-sm text-text-secondary">
        <p>Нужно больше конкретики? Загляни в рабочий круг и обнови привычки команды.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/circle" className="rounded-full bg-uyan-action/90 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:scale-[1.01]">
            Перейти в круг →
          </Link>
          <Link href="/settings" className="rounded-full border border-white/15 px-4 py-2 text-sm text-text-primary transition hover:border-white/40">
            Открыть настройки
          </Link>
        </div>
      </section>
    </div>
  );
}
