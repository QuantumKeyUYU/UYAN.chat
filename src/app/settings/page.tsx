'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { clearDeviceId } from '@/lib/device';
import { clearGarden } from '@/lib/garden';
import { saveReducedMotion } from '@/lib/motion';
import { useAppStore } from '@/store/useAppStore';

export default function SettingsPage() {
  const deviceId = useAppStore((state) => state.deviceId);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const setReducedMotion = useAppStore((state) => state.setReducedMotion);
  const setDeviceId = useAppStore((state) => state.setDeviceId);
  const setStats = useAppStore((state) => state.setStats);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const handleReducedMotionToggle = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    saveReducedMotion(next);
  };

  const handleClearGarden = () => {
    clearGarden();
    window.alert('Сад света очищен. Свет можно собирать заново.');
  };

  const handleResetDevice = () => {
    const confirmReset = window.confirm(
      'Сбросить идентификатор устройства? Твоя текущая статистика и сад света обнулится.',
    );
    if (!confirmReset) return;
    clearDeviceId();
    setDeviceId(null);
    setStats(null);
    window.location.reload();
  };

  const handlePurgeData = async () => {
    if (!deviceId) {
      setPurgeMessage(null);
      setPurgeError('Не удалось найти устройство. Обнови страницу и попробуй снова.');
      return;
    }

    const confirmed = window.confirm(
      'Удалить все сообщения, ответы и статистику, связанные с этим устройством? Это действие нельзя отменить.',
    );
    if (!confirmed) {
      return;
    }

    setPurgeLoading(true);
    setPurgeMessage(null);
    setPurgeError(null);

    try {
      const response = await fetch('/api/device/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const result = await response.json();

      if (!response.ok) {
        setPurgeError(result?.error ?? 'Не получилось очистить данные. Попробуй ещё раз позже.');
        return;
      }

      clearGarden();
      clearDeviceId();
      setDeviceId(null);
      setStats(null);

      setPurgeMessage('Данные очищены. Можно начать с чистого листа — при следующем визите создадим новый путь.');
    } catch (error) {
      console.error('[settings] Failed to purge device data', error);
      setPurgeError('Что-то пошло не так. Попробуй ещё раз позже.');
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Настройки</h1>
        <p className="text-text-secondary">Немного управления светом и тенью.</p>
      </div>

      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Анимации</h2>
          <p className="text-sm text-text-secondary">Включи этот режим, если хочешь сделать переходы более спокойными.</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-bg-secondary/60 p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Уменьшить анимации</p>
            <p className="text-xs text-text-tertiary">Анимации станут статичными, без переливов и смещений.</p>
          </div>
          <button
            type="button"
            onClick={handleReducedMotionToggle}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uyan-light ${
              reducedMotion ? 'bg-uyan-light/60' : 'bg-white/10'
            }`}
            aria-pressed={reducedMotion}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-bg-primary shadow transition-transform ${
                reducedMotion ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Данные устройства</h2>
          <p className="text-sm text-text-secondary">
            Мы используем только технический идентификатор устройства, чтобы анонимно узнавать тебя в сервисе — ни логинов,
            ни имён.
          </p>
          <p className="text-sm text-text-secondary">
            Здесь можно очистить сохранённые ответы, сбросить этот идентификатор и удалить все данные, если захочется начать
            заново.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleClearGarden} className="w-full sm:w-auto">
            Очистить сад света
          </Button>
          <Button variant="ghost" onClick={handleResetDevice} className="w-full sm:w-auto">
            Сбросить идентификатор устройства
          </Button>
          <Button onClick={handlePurgeData} className="w-full sm:w-auto" disabled={purgeLoading}>
            {purgeLoading ? 'Очищаем...' : 'Удалить все мои данные'}
          </Button>
        </div>
        <p className="text-xs text-text-tertiary">
          После сброса идентификатора страница перезагрузится, а статистика начнёт считаться заново.
        </p>
        {purgeMessage ? <Notice variant="success">{purgeMessage}</Notice> : null}
        {purgeError ? <Notice variant="error">{purgeError}</Notice> : null}
      </Card>
    </div>
  );
}
