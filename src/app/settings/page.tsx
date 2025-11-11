'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Notice } from '@/components/ui/Notice';
import { clearDeviceId } from '@/lib/device';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { clearGarden } from '@/lib/garden';
import { saveReducedMotion } from '@/lib/motion';
import { useDeviceStore } from '@/store/device';
import { useStatsStore } from '@/store/stats';
import { useSettingsStore } from '@/store/settings';
import { useDeviceJourney } from '@/lib/hooks/useDeviceJourney';

interface JourneyStatus {
  journeyId: string;
  effectiveDeviceId: string;
  isAttached: boolean;
  isPrimary: boolean;
  attachedDevices: number;
  attachedDeviceIds: string[];
  attachedDeviceHashes: string[];
  lastKeyPreview: string | null;
  localHasHistory: boolean;
  primaryDeviceId: string;
}

export default function SettingsPage() {
  const deviceId = useDeviceStore((state) => state.id);
  const setDeviceId = useDeviceStore((state) => state.setId);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const setStats = useStatsStore((state) => state.setData);
  const { refresh } = useDeviceJourney();
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [gardenMessage, setGardenMessage] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [attachKey, setAttachKey] = useState('');
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [confirmAttachOpen, setConfirmAttachOpen] = useState(false);
  const [deviceKeyInput, setDeviceKeyInput] = useState('');
  const [deviceKeyBusy, setDeviceKeyBusy] = useState(false);
  const [deviceKeyMessage, setDeviceKeyMessage] = useState<string | null>(null);
  const [deviceKeyError, setDeviceKeyError] = useState<string | null>(null);

  const maskedDeviceId = useMemo(() => {
    if (!deviceId) return '—';
    if (deviceId.length <= 8) return deviceId;
    return `${deviceId.slice(0, 4)}…${deviceId.slice(-4)}`;
  }, [deviceId]);

  const refreshJourneyStatus = useCallback(async () => {
    if (!deviceId) {
      setJourneyStatus(null);
      return;
    }

    setJourneyLoading(true);
    setJourneyError(null);
    try {
      const response = await fetch('/api/journey/status', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to load');
      }
      const data = (await response.json()) as { status: JourneyStatus };
      setJourneyStatus(data.status);
      if (data.status.effectiveDeviceId && data.status.effectiveDeviceId !== deviceId) {
        setDeviceId(data.status.effectiveDeviceId);
        void refresh();
      }
    } catch (error) {
      console.warn('[settings] Failed to load journey status', error);
      setJourneyError('Не удалось получить информацию о пути. Попробуй обновить страницу.');
    } finally {
      setJourneyLoading(false);
    }
  }, [deviceId, refresh, setDeviceId]);

  useEffect(() => {
    void refreshJourneyStatus();
  }, [refreshJourneyStatus]);

  const handleCopyDeviceKey = async () => {
    if (!deviceId) {
      setDeviceKeyError('Ключ ещё не создан. Поделись мыслью или откликом, чтобы мы его сформировали.');
      setDeviceKeyMessage(null);
      return;
    }
    if (!navigator.clipboard) {
      setDeviceKeyError('Clipboard API недоступен. Скопируй ключ вручную.');
      setDeviceKeyMessage(null);
      return;
    }
    try {
      await navigator.clipboard.writeText(deviceId);
      setDeviceKeyMessage('Ключ скопирован. Сохрани его в надёжном месте.');
      setDeviceKeyError(null);
    } catch (error) {
      console.warn('[settings] Failed to copy device key', error);
      setDeviceKeyError('Не получилось скопировать ключ. Сохрани его вручную.');
      setDeviceKeyMessage(null);
    }
  };

  const handleApplyDeviceKey = async () => {
    const nextKey = deviceKeyInput.trim();
    if (nextKey.length < 8) {
      setDeviceKeyError('Введите ключ целиком — минимум 8 символов.');
      setDeviceKeyMessage(null);
      return;
    }
    setDeviceKeyBusy(true);
    setDeviceKeyMessage(null);
    setDeviceKeyError(null);
    try {
      setDeviceId(nextKey);
      setStats(null);
      setDeviceKeyMessage('Ключ применён. Обновляем данные для этого устройства.');
      setDeviceKeyInput('');
      await refresh();
      await refreshJourneyStatus();
    } catch (error) {
      console.warn('[settings] Failed to apply device key', error);
      setDeviceKeyError('Не удалось применить ключ. Попробуй ещё раз.');
      setDeviceKeyMessage(null);
    } finally {
      setDeviceKeyBusy(false);
    }
  };

  const handleReducedMotionToggle = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    saveReducedMotion(next);
  };

  const handleClearGarden = () => {
    clearGarden();
    setGardenMessage('Архив откликов очищен. Можно сохранять заново.');
    setPurgeMessage(null);
    setPurgeError(null);
  };

  const handleCreateBackup = async () => {
    if (!deviceId) return;

    setBackupLoading(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const response = await fetch('/api/journey/backup', {
        method: 'POST',
        headers: { [DEVICE_ID_HEADER]: deviceId },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to create backup');
      }
      const data = (await response.json()) as {
        identityKey: string;
        status: JourneyStatus;
      };
      setBackupKey(data.identityKey);
      setBackupMessage('Ключ создан. Сохрани его — мы не покажем его снова.');
      setJourneyStatus(data.status);
      if (data.status.effectiveDeviceId && data.status.effectiveDeviceId !== deviceId) {
        setDeviceId(data.status.effectiveDeviceId);
        void refresh();
      }
    } catch (error) {
      console.error('[settings] Failed to create backup key', error);
      setBackupError('Не удалось сгенерировать ключ. Попробуй ещё раз позже.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCopyBackupKey = async () => {
    if (!backupKey || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(backupKey);
      setBackupMessage('Ключ скопирован. Сохрани его в надёжном месте.');
    } catch (error) {
      console.warn('[settings] Failed to copy key', error);
      setBackupError('Не получилось скопировать ключ. Сохрани его вручную.');
    }
  };

  const handleDownloadBackupKey = () => {
    if (!backupKey) return;
    try {
      const blob = new Blob([
        `Ключ пути для UYAN.chat:\n${backupKey}\nХрани его в надёжном месте и не делись с незнакомыми людьми.`,
      ]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'uyan-path-key.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupMessage('Ключ сохранён в файл. Береги его.');
    } catch (error) {
      console.warn('[settings] Failed to download key', error);
      setBackupError('Не получилось сохранить файл с ключом.');
    }
  };

  const performAttach = useCallback(async () => {
    if (!attachKey.trim()) {
      setAttachError('Введи ключ пути.');
      return;
    }
    if (!deviceId) {
      setAttachError('Не удалось определить устройство.');
      return;
    }

    setAttachLoading(true);
    setAttachMessage(null);
    setAttachError(null);
    try {
      const response = await fetch('/api/journey/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({ identityKey: attachKey.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to attach');
      }
      const nextStatus = (payload?.status ?? null) as JourneyStatus | null;
      if (nextStatus) {
        setJourneyStatus(nextStatus);
        if (nextStatus.effectiveDeviceId && nextStatus.effectiveDeviceId !== deviceId) {
          setDeviceId(nextStatus.effectiveDeviceId);
          void refresh();
        }
      }
      setAttachMessage('Путь восстановлен. Теперь это устройство идёт вместе с сохранёнными мыслями и откликами.');
      setAttachKey('');
      setBackupKey(null);
      void refreshJourneyStatus();
    } catch (error) {
      console.warn('[settings] Failed to attach journey', error);
      setAttachError(
        error instanceof Error
          ? error.message
          : 'Не получилось восстановить путь. Проверь ключ и попробуй снова.',
      );
    } finally {
      setAttachLoading(false);
      setConfirmAttachOpen(false);
    }
  }, [attachKey, deviceId, refresh, refreshJourneyStatus, setDeviceId]);

  const handleAttachSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttachMessage(null);
    setAttachError(null);
    if (journeyStatus?.localHasHistory && !journeyStatus.isPrimary) {
      setConfirmAttachOpen(true);
      return;
    }
    void performAttach();
  };

  const confirmAttach = () => {
    if (attachLoading) return;
    void performAttach();
  };

  const cancelAttach = () => {
    if (attachLoading) return;
    setConfirmAttachOpen(false);
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
      setPurgeError('Не получилось очистить данные. Попробуй ещё раз позже.');
    } finally {
      setPurgeLoading(false);
      setPurgeDialogOpen(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Настройки</h1>
        <p className="text-text-secondary">Раздел для управления ключом устройства и настройками.</p>
      </div>

      <Card className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Ключ устройства</h2>
          <p className="text-sm text-text-secondary">Этот ключ хранит твой путь. Скопируй его, чтобы перенести мысли и отклики на другое устройство.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-bg-secondary/60 p-4 text-sm text-text-secondary">
          <p className="text-text-primary">
            Текущий ключ: <span className="font-mono text-lg text-text-primary">{maskedDeviceId}</span>
          </p>
          <p className="mt-2">Полный ключ остаётся скрытым. Мы покажем его целиком при копировании.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleCopyDeviceKey} className="w-full sm:w-auto" disabled={!deviceId}>
            Скопировать ключ
          </Button>
        </div>
        <div className="space-y-3">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Ввести другой ключ
            <input
              type="text"
              value={deviceKeyInput}
              onChange={(event) => {
                setDeviceKeyInput(event.target.value);
                setDeviceKeyError(null);
                setDeviceKeyMessage(null);
              }}
              placeholder="device_XXXXXXXXXXXX"
              className="w-full rounded-xl border border-white/10 bg-bg-primary/60 p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline focus:outline-2 focus:outline-uyan-light"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              autoCapitalize="characters"
              maxLength={64}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleApplyDeviceKey}
              disabled={deviceKeyBusy || deviceKeyInput.trim().length < 8}
              className="w-full sm:w-auto"
            >
              {deviceKeyBusy ? 'Применяем…' : 'Применить ключ'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setDeviceKeyInput('');
                setDeviceKeyMessage(null);
                setDeviceKeyError(null);
              }}
            >
              Очистить поле
            </Button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {deviceKeyMessage ? <Notice variant="success">{deviceKeyMessage}</Notice> : null}
          {deviceKeyError ? <Notice variant="error">{deviceKeyError}</Notice> : null}
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
          <h2 className="text-xl font-semibold text-text-primary">Резервная копия ключа</h2>
          <p className="text-sm text-text-secondary">
            Каждая мысль, отклик и статистика привязаны к твоему устройству. Здесь можно сохранить ключ и перенести путь на другой девайс или восстановить его в другом браузере — без логинов и имён.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-bg-secondary/60 p-4 text-sm text-text-secondary">
          {journeyLoading ? (
            <p>Собираем сведения о пути…</p>
          ) : journeyError ? (
            <p className="text-amber-300">{journeyError}</p>
          ) : journeyStatus ? (
            <div className="space-y-2">
              <p className="text-text-primary">
                Сейчас путь хранится как <span className="font-semibold">{journeyStatus.isPrimary ? 'основной' : 'гость'}</span>.
              </p>
              <p>
                Ключ знает о <span className="font-semibold text-text-primary">{journeyStatus.attachedDevices}</span>{' '}
                устройстве(ах). Сохрани его — и можно продолжать путь на любом устройстве.
              </p>
              {journeyStatus.lastKeyPreview ? (
                <p className="text-xs text-text-tertiary">
                  Последний созданный ключ начинается так: <span className="font-mono">{journeyStatus.lastKeyPreview}</span>
                </p>
              ) : null}
              {journeyStatus.localHasHistory && !journeyStatus.isPrimary ? (
                <p className="text-xs text-amber-200">
                  У этого устройства уже есть своя история. При восстановлении мы бережно присоединим её к сохранённому пути.
                </p>
              ) : null}
            </div>
          ) : (
            <p>Этот путь только начинается — поделись мыслью или сохрани ключ, чтобы продолжить его на других устройствах.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-text-primary">Сохранить мой путь</h3>
            <p className="text-sm text-text-secondary">
              Сгенерируй резервный ключ, запиши его в заметку или сфотографируй. Мы не покажем его повторно.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleCreateBackup} disabled={backupLoading || !deviceId} className="w-full sm:w-auto">
                {backupLoading ? 'Создаём…' : 'Создать ключ'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCopyBackupKey}
                disabled={!backupKey}
                className="w-full sm:w-auto"
              >
                Скопировать
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadBackupKey}
                disabled={!backupKey}
                className="w-full sm:w-auto"
              >
                Скачать
              </Button>
            </div>
            {backupKey ? (
              <div className="rounded-xl bg-bg-tertiary/70 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">твой ключ</p>
                <p className="mt-2 font-mono text-lg text-text-primary">{backupKey}</p>
                <p className="mt-2 text-xs text-text-tertiary">Сохрани этот код. Он открывает твой путь на других устройствах.</p>
              </div>
            ) : null}
            <div className="space-y-2 text-sm">
              {backupMessage ? <Notice variant="success">{backupMessage}</Notice> : null}
              {backupError ? <Notice variant="error">{backupError}</Notice> : null}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-text-primary">Восстановить на этом устройстве</h3>
            <p className="text-sm text-text-secondary">
              Введи сохранённый ключ — и мы подтянем мысли, отклики и статистику. Никому не передавай его, иначе другой
              человек получит доступ к твоему пути.
            </p>
            <form onSubmit={handleAttachSubmit} className="space-y-3">
              <input
                type="text"
                value={attachKey}
                onChange={(e) =>
                  setAttachKey(
                    e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
                  )
                }
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full rounded-xl border border-white/10 bg-bg-primary/60 p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline focus:outline-2 focus:outline-uyan-light"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                autoCapitalize="characters"
                pattern="[A-Z0-9-]{8,}"
                maxLength={29}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={attachLoading || attachKey.trim().length < 8} className="w-full sm:w-auto">
                  {attachLoading ? 'Соединяем…' : 'Подключить путь'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAttachKey('');
                    setAttachError(null);
                    setAttachMessage(null);
                  }}
                >
                  Очистить поле
                </Button>
              </div>
            </form>
            <div className="space-y-2 text-sm">
              {attachMessage ? <Notice variant="success">{attachMessage}</Notice> : null}
              {attachError ? <Notice variant="error">{attachError}</Notice> : null}
            </div>
          </div>
        </div>

        <p className="text-xs text-text-tertiary">
          Не делись ключом с незнакомыми людьми. Он не содержит личных данных, но открывает доступ к твоим мыслям и откликам.
        </p>
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
            Очистить архив откликов
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
        <div aria-live="polite" aria-atomic="true" className="space-y-2">
          {gardenMessage ? <Notice variant="success">{gardenMessage}</Notice> : null}
          {purgeMessage ? <Notice variant="success">{purgeMessage}</Notice> : null}
          {purgeError ? <Notice variant="error">{purgeError}</Notice> : null}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmAttachOpen}
        title="Присоединить этот путь к сохранённому?"
        description="Мы аккуратно перенесём текущие истории и статистику в сохранённый путь. Это действие нельзя отменить."
        confirmLabel="Присоединить"
        onConfirm={confirmAttach}
        onCancel={cancelAttach}
        loading={attachLoading}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title="Сбросить идентификатор устройства?"
        description="Твоя текущая статистика и архив откликов обнулятся. Это действие нельзя отменить."
        confirmLabel="Сбросить"
        onConfirm={confirmResetDevice}
        onCancel={cancelResetDevice}
        loading={resetLoading}
        danger
      />

      <ConfirmDialog
        open={purgeDialogOpen}
        title="Удалить все мои данные?"
        description="Будут удалены все сообщения, ответы и статистика, связанные с этим устройством. Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={confirmPurgeData}
        onCancel={cancelPurgeData}
        loading={purgeLoading}
        danger
      />
    </div>
  );
}
