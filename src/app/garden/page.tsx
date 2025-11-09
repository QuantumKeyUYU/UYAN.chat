'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { loadGarden, removeLight, SavedLight } from '@/lib/garden';

export default function GardenPage() {
  const [lights, setLights] = useState<SavedLight[]>([]);

  const refresh = () => {
    setLights(loadGarden());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleRemove = (id: string) => {
    removeLight(id);
    refresh();
  };

  return (
    <motion.div
      className="mx-auto flex max-w-5xl flex-col gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Сад света</h1>
        <p className="text-text-secondary">Здесь живут ответы, которые согрели тебя.</p>
      </div>

      {lights.length === 0 ? (
        <Card className="text-center">
          <div className="space-y-4">
            <p className="text-4xl">🌱</p>
            <p className="text-lg text-text-secondary">
              Пока твой сад пуст. Сохраняй ответы, которые хочется перечитывать и делиться ими.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {lights.map((light) => (
            <Card key={light.id} className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-darkness">ты поделился</p>
                <p className="mt-2 rounded-xl bg-bg-tertiary/50 p-4 text-sm text-text-secondary">{light.originalMessage}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">в ответ получил</p>
                <p className="mt-2 rounded-xl bg-uyan-light/10 p-4 text-text-primary">{light.responseText}</p>
              </div>
              <div className="flex flex-col gap-3 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
                <span>Сохранено: {new Date(light.savedAt).toLocaleString()}</span>
                <Button variant="secondary" onClick={() => handleRemove(light.id)} className="w-full sm:w-auto">
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
