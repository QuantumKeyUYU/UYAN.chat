'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { clearDeviceId } from '@/lib/device';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { clearGarden } from '@/lib/garden';
import { clearHiddenResponses } from '@/lib/hiddenResponses';
import { saveReducedMotion } from '@/lib/motion';
import { useDeviceJourney } from '@/lib/hooks/useDeviceJourney';
import { useDeviceStore } from '@/store/device';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';

const buildMigrationUrl = (token: string): string | null => {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  url.searchParams.set('token', token);
  return url.toString();
};

type MigrationCreateResponse =
  | {
      ok: true;
      token: string;
      expiresAt: string;
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

type MigrationApplyResponse =
  | {
      ok: true;
      migratedDeviceId: string;
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

const getMigrationApplyErrorMessage = (code: string, fallback: string): string => {
  switch (code) {
    case 'migration/expired':
      return 'Ссылка уже не активна. Создай новую на устройстве, где сохранён архив.';
    case 'migration/not-found':
      return 'Кажется, эта ссылка не подходит. Проверь, полностью ли она скопирована.';
    case 'migration/already-used':
      return 'Эта ссылка уже использована. Сгенерируй новую на устройстве с архивом.';
    case 'migration/invalid-token':
      return 'Не получается распознать ссылку. Попробуй скопировать её ещё раз.';
    case 'migration/token-missing':
      return 'Вставь токен из ссылки, чтобы перенести архив.';
    default:
      return fallback;
  }
};

function SettingsPageContent() {
  const deviceId = useDeviceStore((state) => state.id);
  const setDeviceId = useDeviceStore((state) => state.setId);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setStats = useStatsStore((state) => state.setData);
  const { refresh } = useDeviceJourney();
  const searchParams = useSearchParams();

  const queryToken = searchParams?.get('token') ?? '';
  const [migrationToken, setMigrationToken] = useState(queryToken);
  const [migrationUrl, setMigrationUrl] = useState<string | null>(() => (queryToken ? buildMigrationUrl(queryToken) : null));
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [gardenMessage, setGardenMessage] = useState<string | null>(null);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!queryToken) return;
    setMigrationToken((current) => (current ? current : queryToken));
    setMigrationUrl((current) => current ?? buildMigrationUrl(queryToken));
  }, [queryToken]);

  const handleReducedMotionToggle = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    saveReducedMotion(next);
  };

  const handleCreateMigrationLink = async () => {
    if (!deviceId) {
      setMigrationError('Не удалось определить устройство. Обнови страницу и попробуй снова.');
      return;
    }

    setMigrationLoading(true);
    setMigrationError(null);
    setMigrationMessage(null);
    try {
      const response = await fetch('/api/migration/create', {
        method: 'POST',
        headers: { [DEVICE_ID_HEADER]: deviceId },
      });
      const payload = (await response.json().catch(() => null)) as MigrationCreateResponse | null;
      if (!payload || !payload.ok) {
        const fallback = 'Не получилось подготовить ссылку. Попробуй ещё раз.';
        const message = payload && !payload.ok ? payload.error.message : fallback;
        throw new Error(message);
      }
      const { token } = payload;
      setMigrationToken(token);
      setMigrationUrl(buildMigrationUrl(token));
      setMigrationMessage('Ссылка готова. Открой её на другом устройстве в течение 24 часов.');
    } catch (error) {
      console.error('[settings] Failed to create migration token', error);
      setMigrationError(error instanceof Error ? error.message : 'Не получилось создать ссылку. Попробуй ещё раз.');
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleCopyMigrationLink = async () => {
    if (!migrationUrl) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setMigrationError('Скопируй ссылку вручную: автоматическое копирование недоступно.');
      return;
    }
    try {
      await navigator.clipboard.writeText(migrationUrl);
      setMigrationMessage('Ссылка скопирована. Открой её на другом устройстве.');
      setMigrationError(null);
    } catch (error) {
      console.warn('[settings] Failed to copy migration link', error);
      setMigrationError('Не получилось скопировать ссылку. Сохрани её вручную.');
    }
  };

  const handleApplyMigration = async () => {
    const token = migrationToken.trim();
    if (!token) {
      setApplyError('Вставь токен из ссылки, чтобы перенести архив.');
      return;
    }

    setApplyLoading(true);
    setApplyError(null);
    setApplyMessage(null);
    try {
      const response = await fetch('/api/migration/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(deviceId ? { [DEVICE_ID_HEADER]: deviceId } : {}),
        },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json().catch(() => null)) as MigrationApplyResponse | null;
      if (!payload || !payload.ok) {
        const fallback = 'Не получилось перенести архив. Попробуй ещё раз.';
        const message =
          payload && !payload.ok
            ? getMigrationApplyErrorMessage(payload.error.code, payload.error.message)
            : fallback;
        throw new Error(message);
      }
      const { migratedDeviceId } = payload;
      setDeviceId(migratedDeviceId);
      void refresh();
      setApplyMessage('Готово! Твои сохранённые ответы теперь на этом устройстве.');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      }
      setMigrationMessage(null);
      setMigrationError(null);
    } catch (error) {
      console.error('[settings] Failed to apply migration token', error);
      setApplyError(error instanceof Error ? error.message : 'Не получилось перенести архив. Попробуй ещё раз.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleClearGarden = () => {
    clearGarden();
    setGardenMessage('Мы очистили «Мой свет». Можно снова собирать важные отклики.');
    setPurgeMessage(null);
    setPurgeError(null);
  };

  const handleRevealHidden = () => {
    clearHiddenResponses();
    setGardenMessage('Скрытые отклики вернулись в список.');
    setPurgeMessage(null);
    setPurgeError(null);
  };

  const handleResetDevice = () => {
    setResetDialogOpen(true);
  };

  const confirmResetDevice = () => {
    setResetLoading(true);
    clearDeviceId();
    setDeviceId(null);
    setStats(null);
    window.location.reload();
  };

  const cancelResetDevice = () => {
    if (resetLoading) return;
    setResetDialogOpen(false);
  };

  const handlePurgeData = () => {
    setGardenMessage(null);
    setPurgeMessage(null);
    setPurgeError(null);
    setPurgeDialogOpen(true);
  };

  const cancelPurgeData = () => {
    if (purgeLoading) return;
    setPurgeDialogOpen(false);
  };

  const confirmPurgeData = async () => {
    if (!deviceId) {
      setPurgeDialogOpen(false);
      setPurgeMessage(null);
      setPurgeError('Не удалось найти устройство. Обнови страницу и попробуй снова.');
      return;
    }

    setPurgeLoading(true);
    setPurgeMessage(null);
    setPurgeError(null);

    try {
      const response = await fetch('/api/device/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPurgeError(result?.error ?? 'Не получилось очистить данные. Попробуй ещё раз позже.');
        return;
      }

      clearGarden();
      clearHiddenResponses();
      clearDeviceId();
      setDeviceId(null);
      setStats(null);

      setPurgeMessage('Данные очищены. При следующем визите мы создадим новую историю устройства.');
    } catch (error) {
      console.error('[settings] Failed to purge device data', error);
      setPurgeError('Не получилось очистить данные. Попробуй ещё раз позже.');
    } finally {
      setPurgeLoading(false);
      setPurgeDialogOpen(false);
    }
  };

  const canCopyLink = useMemo(
    () => Boolean(migrationUrl && typeof navigator !== 'undefined' && navigator.clipboard?.writeText),
    [migrationUrl],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Настройки</h1>
        <p className="text-text-secondary">Настрой плавность анимаций, переноси архив и управляй данными устройства.</p>
      </div>

      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Перенести архив</h2>
          <p className="text-sm text-text-secondary">
            Ссылка переноса действует 24 часа и переносит «Мой свет» и историю откликов на другое устройство. Никто кроме тебя не
            увидит содержимое архива.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={handleCreateMigrationLink} disabled={migrationLoading} className="w-full sm:w-auto">
            {migrationLoading ? 'Готовим ссылку…' : 'Создать ссылку для переноса'}
          </Button>
          {migrationUrl ? (
            <Button onClick={handleCopyMigrationLink} variant="secondary" disabled={!canCopyLink} className="w-full sm:w-auto">
              Скопировать ссылку
            </Button>
          ) : null}
        </div>
        {migrationUrl ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-bg-secondary/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">ссылка переноса</p>
            <p className="break-all font-mono text-sm text-text-primary">{migrationUrl}</p>
          </div>
        ) : null}
        {migrationMessage ? <Notice variant="success">{migrationMessage}</Notice> : null}
        {migrationError ? <Notice variant="error">{migrationError}</Notice> : null}
        <div className="space-y-3">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Вставь токен из ссылки, чтобы принять архив
            <input
              type="text"
              value={migrationToken}
              onChange={(event) => setMigrationToken(event.target.value)}
              placeholder="TOKEN-XXXX-XXXX"
              className="rounded-xl border border-white/10 bg-bg-secondary/60 px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-uyan-light"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleApplyMigration} disabled={applyLoading || !migrationToken} className="w-full sm:w-auto">
              {applyLoading ? 'Переносим…' : 'Применить токен'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setMigrationToken('');
                setApplyError(null);
                setApplyMessage(null);
              }}
            >
              Очистить поле
            </Button>
          </div>
          {applyMessage ? <Notice variant="success">{applyMessage}</Notice> : null}
          {applyError ? <Notice variant="error">{applyError}</Notice> : null}
        </div>
      </Card>

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
              reducedMotion ? 'bg-uyan-light/80' : 'bg-white/10'
            }`}
            aria-pressed={reducedMotion}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
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
            Мы используем технический идентификатор устройства, чтобы анонимно узнавать тебя в сервисе. Ни имён, ни логинов — только
            путь устройства.
          </p>
          <p className="text-sm text-text-secondary">Здесь можно очистить сохранённые ответы, вернуть скрытые отклики или удалить все данные.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleClearGarden} className="w-full sm:w-auto">
            Очистить «Мой свет»
          </Button>
          <Button variant="secondary" onClick={handleRevealHidden} className="w-full sm:w-auto">
            Вернуть скрытые отклики
          </Button>
          <Button variant="ghost" onClick={handleResetDevice} className="w-full sm:w-auto">
            Сбросить идентификатор устройства
          </Button>
          <Button onClick={handlePurgeData} className="w-full sm:w-auto" disabled={purgeLoading}>
            {purgeLoading ? 'Очищаем…' : 'Удалить все мои данные'}
          </Button>
        </div>
        <p className="text-xs text-text-tertiary">После сброса идентификатора страница перезагрузится, а статистика начнёт считаться заново.</p>
        <div aria-live="polite" aria-atomic="true" className="space-y-2">
          {gardenMessage ? <Notice variant="success">{gardenMessage}</Notice> : null}
          {purgeMessage ? <Notice variant="success">{purgeMessage}</Notice> : null}
          {purgeError ? <Notice variant="error">{purgeError}</Notice> : null}
        </div>
      </Card>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Сбросить идентификатор устройства?"
        description="Мы создадим новый технический идентификатор и обнулим локальные данные. Это действие нельзя отменить."
        confirmLabel="Сбросить"
        onConfirm={confirmResetDevice}
        onCancel={cancelResetDevice}
        loading={resetLoading}
        danger
      />

      <ConfirmDialog
        open={purgeDialogOpen}
        title="Удалить все мои данные?"
        description="Будут удалены все мысли, ответы и статистика, связанные с этим устройством. Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={confirmPurgeData}
        onCancel={cancelPurgeData}
        loading={purgeLoading}
        danger
      />
    </div>
  );
}

function SettingsFallback() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8" aria-live="polite" aria-busy="true">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Настройки</h1>
        <p className="text-text-secondary">Загружаем страницу…</p>
      </div>

      <Card className="space-y-4">
        <div className="h-5 w-1/2 rounded-full bg-white/10" />
        <div className="h-4 w-3/4 rounded-full bg-white/5" />
        <div className="h-4 w-2/3 rounded-full bg-white/5" />
        <p className="text-sm text-text-tertiary">Готовим информацию для переноса архива…</p>
      </Card>

      <Card className="space-y-4">
        <div className="h-5 w-40 rounded-full bg-white/10" />
        <div className="h-4 w-3/5 rounded-full bg-white/5" />
        <p className="text-sm text-text-tertiary">Настраиваем параметры анимаций…</p>
      </Card>

      <Card className="space-y-4">
        <div className="h-5 w-48 rounded-full bg-white/10" />
        <div className="h-4 w-full rounded-full bg-white/5" />
        <div className="h-4 w-3/4 rounded-full bg-white/5" />
        <p className="text-sm text-text-tertiary">Проверяем данные устройства…</p>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
