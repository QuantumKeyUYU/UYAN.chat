'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useDeviceStore } from '@/store/device';
import { useWeekCrewStore, type CircleHabit, type CircleMember, type CircleReflection } from '@/store/weekcrew';
import { useBackendStore } from '@/store/backend';

const statusColors: Record<CircleMember['checkIn'], string> = {
  ready: 'bg-emerald-500/20 text-emerald-200',
  behind: 'bg-amber-500/20 text-amber-100',
  offline: 'bg-slate-500/30 text-slate-200',
};

const energyLabels: Record<CircleReflection['energy'], string> = {
  steady: 'спокойно',
  charged: 'заряжено',
  drained: 'устало',
};

const HabitToggle = ({ habit, onToggle }: { habit: CircleHabit; onToggle: (id: string) => void }) => (
  <button
    type="button"
    onClick={() => onToggle(habit.id)}
    className={`flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action ${
      habit.completed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-text-secondary'
    }`}
  >
    <span>
      <span className="block font-semibold text-text-primary">{habit.label}</span>
      <span className="text-xs text-text-tertiary">{habit.cadence}</span>
    </span>
    <span aria-hidden>{habit.completed ? '✔' : '○'}</span>
  </button>
);

export default function CirclePage() {
  const backendStatus = useBackendStore((state) => state.status);
  const isDemo = backendStatus === 'demo';
  const circle = useWeekCrewStore((state) =>
    state.circles.find((candidate) => candidate.id === state.activeCircleId) ?? state.circles[0],
  );
  const reflections = useWeekCrewStore((state) => state.reflections);
  const toggleHabit = useWeekCrewStore((state) => state.toggleHabit);
  const addReflection = useWeekCrewStore((state) => state.addReflection);
  const setCurrentCircleId = useDeviceStore((state) => state.setCurrentCircleId);
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<CircleReflection['energy']>('steady');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setCurrentCircleId(circle?.id ?? null);
  }, [circle?.id, setCurrentCircleId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addReflection(note, energy);
    if (note.trim()) {
      setSubmitted(true);
    }
    setNote('');
  };

  const latestReflections = useMemo(() => reflections.slice(0, 5), [reflections]);

  if (!circle) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-text-secondary">
        <p>Круг не найден. Попробуй обновить страницу.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 py-12">
      <header className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-br from-bg-secondary/80 via-bg-secondary/40 to-bg-secondary/80 p-6 shadow-glow">
        <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">circle</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">{circle.name}</h1>
            <p className="text-text-secondary">{circle.focus}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-full border border-white/10 px-3 py-1">Состояние: {backendStatus}</span>
            {isDemo ? (
              <span className="rounded-full border border-uyan-gold/60 bg-uyan-gold/10 px-3 py-1 text-uyan-gold">Demo mode</span>
            ) : null}
            <span className="rounded-full border border-white/10 px-3 py-1">Следующая встреча: {circle.nextSession}</span>
          </div>
        </div>
        <p className="text-sm text-text-secondary">{circle.description}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Участники</h2>
          <div className="mt-4 space-y-3">
            {circle.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-bg-primary/40 px-4 py-3">
                <div>
                  <p className="font-semibold text-text-primary">{member.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {member.focus} · {member.timezone}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${statusColors[member.checkIn]}`}>
                    {member.checkIn === 'ready' ? 'на связи' : member.checkIn === 'behind' ? 'задерживается' : 'оффлайн'}
                  </span>
                  <p className="mt-1 text-xs text-text-tertiary">🔥 {member.streak} дней подряд</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Ритуалы круга</h2>
          <p className="mt-1 text-sm text-text-secondary">Выключены, пока нет сети? Всё равно отмечай — данные хранятся локально.</p>
          <div className="mt-4 flex flex-col gap-3">
            {circle.habits.map((habit) => (
              <HabitToggle key={habit.id} habit={habit} onToggle={toggleHabit} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-bg-secondary/70 p-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Добавить дневной чек-ин</h2>
            <p className="text-sm text-text-secondary">История сохранится только в памяти браузера — идеально для demo.</p>
          </div>
          {submitted ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
              Спасибо! Добавили заметку. Обнови страницу — увидишь, что demo-данные исчезают.
            </p>
          ) : null}
          <textarea
            className="min-h-[120px] rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Что получилось? Что держит тебя сегодня?"
          />
          <label className="text-sm text-text-secondary">
            Энергия
            <select
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-action"
              value={energy}
              onChange={(event) => setEnergy(event.target.value as CircleReflection['energy'])}
            >
              {Object.entries(energyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-uyan-action px-5 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:scale-[1.01]"
          >
            Сохранить чек-ин
          </button>
        </form>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Последние отклики</h2>
          <div className="mt-4 space-y-4">
            {latestReflections.length === 0 ? (
              <p className="text-sm text-text-secondary">Пока пусто. Добавь первую заметку — она появится здесь.</p>
            ) : (
              latestReflections.map((reflection) => (
                <article key={reflection.id} className="rounded-2xl border border-white/10 bg-bg-primary/50 p-4">
                  <div className="flex items-center justify-between text-xs text-text-tertiary">
                    <span>{reflection.author}</span>
                    <time dateTime={reflection.createdAt}>
                      {new Date(reflection.createdAt).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className="mt-2 text-sm text-text-primary">{reflection.note}</p>
                  <span className="mt-3 inline-flex rounded-full border border-white/10 px-2 py-1 text-[11px] text-text-secondary">
                    Настроение: {energyLabels[reflection.energy]}
                  </span>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
