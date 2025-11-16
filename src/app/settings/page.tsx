'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
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
import { useSettingsStore } from '@/store/settings';
import { useBackendStore } from '@/store/backend';

const buildMigrationUrl = (token: string): string | null => {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  url.searchParams.set('token', token);
  return url.toString();
};

const sectionScrollMarginStyle = { scrollMarginTop: 'calc(var(--header-h, 64px) + 16px)' } as const;

const ButtonSpinner = () => (
  <span
    aria-hidden
    className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
  />
);

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
  const backendStatus = useBackendStore((state) => state.status);
  const backendDb = useBackendStore((state) => state.db);
  const backendError = useBackendStore((state) => state.error);
  const setBackendState = useBackendStore((state) => state.setState);
  const setDeviceId = useDeviceStore((state) => state.setId);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const { refresh } = useDeviceJourney();
  const [queryToken, setQueryToken] = useState('');
  const [migrationToken, setMigrationToken] = useState('');
  const [migrationUrl, setMigrationUrl] = useState<string | null>(null);
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
  const [hydrated, setHydrated] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const disableScrollAnimation = prefersReducedMotion || reducedMotion;

  const refreshBackendStatus = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('Health check failed');
      const payload = (await response.json().catch(() => null)) as { db?: 'ok' | 'error'; moderation?: 'ok' | 'error' } | null;
      const db = payload?.db === 'ok' ? 'ok' : 'error';
      const moderation = payload?.moderation === 'ok' ? 'ok' : 'error';
      setBackendState({
        status: db === 'ok' && moderation === 'ok' ? 'online' : 'degraded',
        db,
        moderation,
        error: null,
        lastCheckedAt: Date.now(),
      });
    } catch (error) {
      setBackendState({
        status: 'offline',
        db: null,
        moderation: null,
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheckedAt: Date.now(),
      });
    } finally {
      setHealthLoading(false);
    }
  }, [setBackendState]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const skeletonLayout = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-10" style={{ minHeight: '65vh' }}>
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-white/5" />
      </div>

      {[0, 1, 2].map((index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="space-y-4 rounded-3xl border border-white/10 bg-bg-secondary/50 p-6 shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)]"
        >
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/10" />
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    const tokenFromUrl = currentUrl.searchParams.get('token') ?? '';
    setQueryToken(tokenFromUrl);
  }, []);

  useEffect(() => {
    if (!queryToken) return;
    setMigrationToken((current) => (current ? current : queryToken));
    setMigrationUrl((current) => current ?? buildMigrationUrl(queryToken));
  }, [queryToken]);

  const scrollToHash = useCallback(
    (hashValue?: string) => {
      if (typeof window === 'undefined') return;
      const hash = (hashValue ?? window.location.hash)?.replace('#', '');
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: disableScrollAnimation ? 'auto' : 'smooth', block: 'start' });
      });
    },
    [disableScrollAnimation],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === 'undefined') return;

    scrollToHash();

    const handleHashChange = (event: HashChangeEvent) => {
      const nextHash = event.newURL ? new URL(event.newURL).hash : window.location.hash;
      scrollToHash(nextHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [hydrated, scrollToHash]);

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
      setQueryToken('');
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
    setGardenMessage('Мы очистили «Ответы». Можно снова собирать важные ответы.');
    setPurgeMessage(null);
    setPurgeError(null);
  };

  const handleRevealHidden = () => {
    clearHiddenResponses();
    setGardenMessage('Скрытые ответы вернулись в список.');
    setPurgeMessage(null);
    setPurgeError(null);
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

  if (!hydrated) {
    return skeletonLayout;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-10" style={{ minHeight: '65vh' }}>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Настройки</h1>
        <p className="text-text-secondary">
          Здесь можно сделать пространство ещё спокойнее: перенести архив, уменьшить анимации или удалить данные устройства.
        </p>
      </div>

      <section className="rounded-3xl border border-white/10 bg-bg-secondary/60 shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)]">
        <Card className="space-y-4 rounded-3xl bg-bg-secondary/90 shadow-none hover:scale-100">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text-primary">Статус сервиса</h2>
            <p className="text-sm text-text-secondary">Показываем, как чувствует себя бэкенд прямо сейчас.</p>
          </div>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              Подключение к базе данных:{' '}
              <span className={backendDb === 'ok' ? 'text-emerald-300' : 'text-rose-300'}>
                {backendDb === 'ok' ? 'ок' : 'ошибка'}
              </span>
            </p>
            <p>
              Режим сейчас: <span className="font-semibold text-text-primary">{backendStatus}</span>
            </p>
            <p>
              Device ID: <span className="font-mono text-xs text-text-primary">{deviceId ?? 'не определено'}</span>
            </p>
          </div>
          {backendError ? <Notice variant="error">{backendError}</Notice> : null}
          <div className="flex flex-wrap gap-3 text-sm">
            <Button
              onClick={refreshBackendStatus}
              disabled={healthLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {healthLoading ? <ButtonSpinner /> : null}
              Обновить статус
            </Button>
            <Link
              href="/debug"
              className="rounded-full border border-white/15 px-4 py-2 text-text-primary transition hover:border-white/40"
            >
              Открыть /debug
            </Link>
          </div>
        </Card>
      </section>

      <section
        id="transfer"
        aria-labelledby="settings-transfer"
        className="rounded-3xl border border-white/10 bg-bg-secondary/60 shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)]"
        style={sectionScrollMarginStyle}
      >
        <Card className="space-y-6 rounded-3xl bg-bg-secondary/90 shadow-none hover:scale-100">
          <div className="space-y-2">
            <h2 id="settings-transfer" className="text-xl font-semibold text-text-primary">
              Перенести архив
            </h2>
            <p className="text-sm text-text-secondary">
              Здесь можно перенести архив «Ответов» и историю твоих ответов на другое устройство. Это удобно, если меняешь телеф
он или хочешь открыть свои письма с другого места.
            </p>
            <p className="text-sm text-text-secondary">
              Ссылка переноса действует 24 часа и переносит «Ответы» и историю ответов на другое устройство. Никто, кроме тебя,
              не увидит содержимое архива — доступ даёт только токен, который ты сам передашь.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={handleCreateMigrationLink} disabled={migrationLoading} className="w-full gap-2 sm:w-auto">
              {migrationLoading ? (
                <>
                  <ButtonSpinner />
                  Готовим ссылку…
                </>
              ) : (
                'Создать ссылку для переноса'
              )}
            </Button>
            {migrationUrl ? (
              <Button
                onClick={handleCopyMigrationLink}
                variant="secondary"
                disabled={!canCopyLink}
                className="w-full gap-2 sm:w-auto"
              >
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
              <Button
                onClick={handleApplyMigration}
                disabled={applyLoading || !migrationToken}
                className="w-full gap-2 sm:w-auto"
              >
                {applyLoading ? (
                  <>
                    <ButtonSpinner />
                    Переносим…
                  </>
                ) : (
                  'Применить токен'
                )}
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
      </section>

      <section
        id="motion"
        aria-labelledby="settings-motion"
        className="rounded-3xl border border-white/10 bg-bg-secondary/60 shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)]"
        style={sectionScrollMarginStyle}
      >
        <Card className="space-y-6 rounded-3xl bg-bg-secondary/90 shadow-none hover:scale-100">
          <div className="space-y-2">
            <h2 id="settings-motion" className="text-xl font-semibold text-text-primary">
              Анимации
            </h2>
            <p className="text-sm text-text-secondary">
              Выключи этот режим, если хочешь сделать пространство более спокойным. Анимации станут мягче, без рывков и эффектов.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-bg-secondary/60 p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {reducedMotion ? 'Уменьшить анимации' : 'Оставить анимации как сейчас'}
              </p>
              <p className="text-xs text-text-tertiary">Иногда это помогает меньше уставать от экрана.</p>
            </div>
            <button
              type="button"
              onClick={handleReducedMotionToggle}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uyan-light ${
                reducedMotion ? 'bg-uyan-light/80' : 'bg-white/10'
              }`}
              aria-pressed={reducedMotion}
              aria-label="Переключить режим уменьшения анимаций"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  reducedMotion ? 'translate-x-7' : 'translate-x-1'
                }`}
                aria-hidden
              />
            </button>
          </div>
        </Card>
      </section>

      <section
        id="privacy"
        aria-labelledby="settings-privacy"
        className="rounded-3xl border border-white/10 bg-bg-secondary/60 shadow-[0_1.5rem_3.5rem_rgba(6,6,10,0.32)]"
        style={sectionScrollMarginStyle}
      >
        <Card className="space-y-6 rounded-3xl bg-bg-secondary/90 shadow-none hover:scale-100">
          <div className="space-y-2">
            <h2 id="settings-privacy" className="text-xl font-semibold text-text-primary">
              Данные устройства
            </h2>
            <p className="text-sm text-text-secondary">
              Мы используем технический идентификатор устройства, чтобы анонимно хранить твой путь в сервисе. Не имя, не телефон
              — только ID устройства.
            </p>
            <p className="text-sm text-text-secondary">
              Здесь можно очистить сохранённые ответы, вернуть скрытые ответы или удалить все свои данные.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={handleClearGarden} className="w-full sm:w-auto">
              Очистить «Ответы»
            </Button>
            <Button variant="secondary" onClick={handleRevealHidden} className="w-full sm:w-auto">
              Вернуть скрытые ответы
            </Button>
            <Button onClick={handlePurgeData} className="w-full gap-2 sm:w-auto" disabled={purgeLoading}>
              {purgeLoading ? (
                <>
                  <ButtonSpinner />
                  Очищаем…
                </>
              ) : (
                'Удалить все мои данные'
              )}
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            Это повлияет только на данные, связанные с этим устройством. Удаление нельзя отменить.
          </p>
          <div aria-live="polite" aria-atomic="true" className="space-y-2">
            {gardenMessage ? <Notice variant="success">{gardenMessage}</Notice> : null}
            {purgeMessage ? <Notice variant="success">{purgeMessage}</Notice> : null}
            {purgeError ? <Notice variant="error">{purgeError}</Notice> : null}
          </div>
        </Card>
      </section>

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

export default function SettingsPage() {
  return <SettingsPageContent />;
}
