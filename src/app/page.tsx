'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOrCreateDeviceId } from '@/lib/device';
import { useAppStore } from '@/store/useAppStore';

const actions = [
  {
    title: '🌑 Написать своё',
    description: 'Выплесни то, что давит на душу. Здесь тебя услышат без оценок.',
    href: '/write',
  },
  {
    title: '💫 Поддержать кого-то',
    description: 'Поделись теплом с незнакомцем. Иногда слова поддержки меняют мир.',
    href: '/support',
  },
];

export default function HomePage() {
  const router = useRouter();
  const setDeviceId = useAppStore((state) => state.setDeviceId);

  const handleStart = () => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    router.push('/write');
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 pt-10">
      <motion.section
        className="rounded-3xl border border-white/5 bg-gradient-to-br from-bg-secondary/80 via-bg-secondary/40 to-bg-secondary/80 p-8 shadow-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-uyan-light">дай свет — получи свет</p>
            <h1 className="text-3xl font-semibold text-text-primary sm:text-4xl">
              Место, где незнакомцы поддерживают друг друга
            </h1>
            <p className="max-w-2xl text-lg text-text-secondary">
              Напиши о своём состоянии анонимно и получи искреннюю поддержку. Перед этим помоги кому-то ещё — так мы создаём круг заботы.
            </p>
          </div>
          <Button onClick={handleStart} size="lg" className="w-full sm:w-auto">
            Начать путь света
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-6 md:grid-cols-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * index, duration: 0.5 }}
          >
            <Card className="h-full">
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-text-primary">{action.title}</h2>
                  <p className="text-text-secondary">{action.description}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => router.push(action.href)}
                  className="w-full"
                >
                  Перейти
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </section>

      <motion.section
        className="grid gap-6 rounded-3xl bg-bg-secondary/60 p-8 sm:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-text-primary">Как это работает?</h3>
          <ul className="space-y-2 text-text-secondary">
            <li>1. Напиши о своём состоянии — это останется анонимно.</li>
            <li>2. Поддержи кого-то другого и почувствуй связь.</li>
            <li>3. Получи ответ-свет и сохрани его в свой сад.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-uyan-action/30 bg-uyan-darkness/20 p-6 text-text-secondary">
          <p className="text-sm uppercase tracking-[0.4em] text-uyan-light">тонкая магия</p>
          <p className="mt-4 text-lg">
            Каждый свет — это чьи-то тёплые слова. Собирай их, делись ими и помни: ты не один.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
