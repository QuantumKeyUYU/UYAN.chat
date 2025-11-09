'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const resources = [
  {
    title: 'Телефон доверия',
    description:
      'В разных странах действуют свои номера поддержки. Найди актуальный для себя, например 8-800-2000-122 в России.',
    icon: '📞',
  },
  {
    title: 'При угрозе жизни — 112',
    description: 'Если есть опасность для тебя или кого-то рядом, немедленно звони в экстренные службы.',
    icon: '🚨',
  },
  {
    title: 'Онлайн-поддержка',
    description:
      'Поиск по запросу “кризисный чат поддержки” подскажет горячие линии и чаты в твоём регионе. Обратись туда прямо сейчас.',
    icon: '💬',
  },
];

export default function CrisisPage() {
  const router = useRouter();

  return (
    <motion.div
      className="mx-auto flex max-w-3xl flex-col gap-8 py-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="space-y-6 bg-gradient-to-br from-red-900/40 via-uyan-darkness/60 to-bg-secondary p-8 text-text-primary">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-3xl font-semibold">Кажется, тебе сейчас очень тяжело</h1>
          <p className="max-w-2xl text-text-secondary">
            UYAN.chat — пространство поддержки, но мы не являемся экстренной службой. Пожалуйста, обратись за немедленной
            помощью, если чувствуешь угрозу себе или другим.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Экстренная помощь</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {resources.map((resource) => (
              <div
                key={resource.title}
                className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-bg-primary/40 p-4"
              >
                <div className="text-3xl">{resource.icon}</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-text-primary">{resource.title}</h3>
                  <p className="text-sm text-text-secondary">{resource.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 text-text-secondary sm:flex-row sm:justify-center">
          <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
            Вернуться на главную
          </Button>
          <Button variant="secondary" onClick={() => router.push('/write')} className="w-full sm:w-auto">
            Я всё равно хочу написать здесь
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
