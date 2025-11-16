'use client';

import { create } from 'zustand';

export interface CircleMember {
  id: string;
  name: string;
  focus: string;
  timezone: string;
  checkIn: 'ready' | 'behind' | 'offline';
  streak: number;
}

export interface CircleHabit {
  id: string;
  label: string;
  cadence: string;
  completed: boolean;
}

export interface CircleReflection {
  id: string;
  author: string;
  note: string;
  createdAt: string;
  energy: 'steady' | 'drained' | 'charged';
}

export interface CircleSummary {
  id: string;
  name: string;
  focus: string;
  description: string;
  nextSession: string;
  rituals: string[];
  members: CircleMember[];
  habits: CircleHabit[];
}

export interface ExploreResource {
  id: string;
  title: string;
  summary: string;
  duration: string;
  category: 'ritual' | 'article' | 'practice';
  tags: string[];
}

interface WeekCrewState {
  activeCircleId: string;
  circles: CircleSummary[];
  reflections: CircleReflection[];
  insights: string[];
  resources: ExploreResource[];
  setActiveCircle: (circleId: string) => void;
  addReflection: (note: string, energy?: CircleReflection['energy']) => void;
  toggleHabit: (habitId: string) => void;
}

const defaultCircleId = 'crew-focus';

const initialState: Omit<WeekCrewState, 'setActiveCircle' | 'addReflection' | 'toggleHabit'> = {
  activeCircleId: defaultCircleId,
  circles: [
    {
      id: defaultCircleId,
      name: 'Focus Flow',
      focus: 'Глубокая работа без выгорания',
      description:
        'Каждое утро участники синхронизируются, выбирают приоритет на день и возвращаются вечером, чтобы зафиксировать микро-победы.',
      nextSession: 'Сегодня, 19:00 по МСК',
      rituals: ['3 коротких чек-ина в течение дня', 'Общий плейлист для концентрации', 'Асинхронные апдейты по пятницам'],
      members: [
        { id: 'anya', name: 'Аня', focus: 'Редизайн профиля', timezone: 'MSK', checkIn: 'ready', streak: 7 },
        { id: 'max', name: 'Макс', focus: 'Исследование аудитории', timezone: 'EEST', checkIn: 'behind', streak: 3 },
        { id: 'vera', name: 'Вера', focus: 'Сценарии онбординга', timezone: 'MSK', checkIn: 'ready', streak: 5 },
        { id: 'tim', name: 'Тим', focus: 'Инфраструктура рассылок', timezone: 'CET', checkIn: 'offline', streak: 1 },
      ],
      habits: [
        { id: 'journal', label: 'Вечерний журнал wins', cadence: 'ежедневно', completed: true },
        { id: 'deep-work', label: '90 минут без отвлечений', cadence: '2× в день', completed: false },
        { id: 'circle-note', label: '1 осознанный отклик в чат', cadence: 'ежедневно', completed: false },
      ],
    },
  ],
  reflections: [
    {
      id: 'ref-1',
      author: 'Аня',
      note: 'Доделала UI-часть и договорилась с командой аналитики о проверке гипотезы. Удалось удержать фокус благодаря утреннему чек-ину.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      energy: 'steady',
    },
    {
      id: 'ref-2',
      author: 'Макс',
      note: 'Раскопал новые инсайты по интервью. Команда поддержала, когда застрял на формулировке ценности.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
      energy: 'charged',
    },
  ],
  insights: [
    '99% белых экранов исчезают, если есть понятный fallback и статус.',
    'Люди быстрее возвращаются к рутине, если видят маленькие победы команды.',
    'Чёткий demo-режим снижает тревожность у тех, кто впервые открывает продукт.',
  ],
  resources: [
    {
      id: 'ritual-1',
      title: 'Ритм «3 дыхания → записал → отправил»',
      summary: 'Помогает не держать напряжение в себе: короткий цикл дыхания и записи в чат.',
      duration: '5 минут',
      category: 'ritual',
      tags: ['mindfulness', 'team'],
    },
    {
      id: 'article-1',
      title: 'Как объяснить демо-режим пользователю',
      summary: 'Чек-лист, чтобы сервис не выглядел сломанным, даже когда нет сети.',
      duration: '7 минут',
      category: 'article',
      tags: ['ux', 'failsafes'],
    },
    {
      id: 'practice-1',
      title: 'Вечерний ретрит на 12 минут',
      summary: 'Пошаговый гайд для командного завершения дня: осознанность, благодарность, выбор фокуса.',
      duration: '12 минут',
      category: 'practice',
      tags: ['evening', 'circle'],
    },
  ],
};

export const useWeekCrewStore = create<WeekCrewState>()((set, get) => ({
  ...initialState,
  setActiveCircle: (circleId) => {
    const exists = get().circles.some((circle) => circle.id === circleId);
    if (!exists) return;
    set({ activeCircleId: circleId });
  },
  addReflection: (note, energy = 'steady') => {
    if (!note.trim()) return;
    const reflection: CircleReflection = {
      id: `reflection-${Date.now()}`,
      author: 'Ты',
      note: note.trim(),
      createdAt: new Date().toISOString(),
      energy,
    };
    set((state) => ({
      reflections: [reflection, ...state.reflections],
    }));
  },
  toggleHabit: (habitId) => {
    set((state) => ({
      circles: state.circles.map((circle) => {
        if (circle.id !== state.activeCircleId) {
          return circle;
        }
        return {
          ...circle,
          habits: circle.habits.map((habit) =>
            habit.id === habitId ? { ...habit, completed: !habit.completed } : habit,
          ),
        };
      }),
    }));
  },
}));
