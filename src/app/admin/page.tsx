'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';

type ReportStatus = 'pending' | 'reviewed' | 'action_taken';

type AdminResponse = {
  id: string;
  text: string;
  hidden: boolean;
  deviceId: string;
  reportCount: number;
  createdAt: number;
  moderationNote?: string | null;
};

type AdminMessage = {
  id: string;
  text: string;
  category: string;
  createdAt: number;
};

type AdminReport = {
  id: string;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  reportedAt: number;
  response: AdminResponse | null;
  message: AdminMessage | null;
};

const ADMIN_TOKEN_KEY = 'uyan_admin_token';

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Новые',
  reviewed: 'Проверенные',
  action_taken: 'Есть действие',
};

const REASON_LABELS: Record<string, string> = {
  offensive: 'Оскорбление',
  inappropriate: 'Неуместно',
  sarcasm: 'Сарказм',
  spam: 'Спам',
  other: 'Другое',
};

const formatDate = (value: number) => {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return '—';
  }
};

export default function AdminDashboardPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hideContext, setHideContext] = useState<AdminReport | null>(null);
  const [moderationNote, setModerationNote] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      setTokenInput(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const handleUnauthorized = () => {
    setAuthError('Неверный или просроченный токен.');
    setToken(null);
    setReports([]);
    setInfoMessage(null);
    setGlobalError(null);
    setTokenInput('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  };

  const fetchReports = async () => {
    if (!token) return;
    setLoadingReports(true);
    setGlobalError(null);
    setAuthError(null);
    try {
      const response = await fetch(`/api/admin/reports?status=${statusFilter}&limit=20`, {
        headers,
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = (await response.json()) as { reports?: AdminReport[] };
      setReports(data.reports ?? []);
    } catch (error) {
      console.error('[admin] Failed to fetch reports', error);
      setGlobalError('Не удалось загрузить жалобы. Попробуй обновить позже.');
    } finally {
      setLoadingReports(false);
    }
  };

  const handleLogin = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setAuthError('Введите токен.');
      return;
    }
    setToken(trimmed);
    setAuthError(null);
    setInfoMessage(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, trimmed);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setReports([]);
    setInfoMessage(null);
    setGlobalError(null);
    setTokenInput('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  };

  const handleKeepVisible = async (report: AdminReport) => {
    if (!token || !report.response) return;
    setActionLoading(true);
    setGlobalError(null);
    try {
      const response = await fetch('/api/admin/responses/hide', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          responseId: report.response.id,
          hidden: false,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update response');
      }

      setInfoMessage('Ответ оставлен без изменений.');
      if (statusFilter === 'pending') {
        setReports((prev) => prev.filter((item) => item.id !== report.id));
      } else {
        await fetchReports();
      }
    } catch (error) {
      console.error('[admin] Failed to mark response as ok', error);
      setGlobalError('Не удалось обновить ответ.');
    } finally {
      setActionLoading(false);
    }
  };

  const openHideModal = (report: AdminReport) => {
    if (!report.response) return;
    setHideContext(report);
    setModerationNote(report.response.moderationNote ?? '');
  };

  const closeHideModal = () => {
    setHideContext(null);
    setModerationNote('');
  };

  const handleHideResponse = async () => {
    if (!token || !hideContext || !hideContext.response) return;
    setActionLoading(true);
    setGlobalError(null);
    try {
      const response = await fetch('/api/admin/responses/hide', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          responseId: hideContext.response.id,
          hidden: true,
          moderationNote: moderationNote.trim() || undefined,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to hide response');
      }

      setInfoMessage('Ответ скрыт и отмечен как обработанный.');
      closeHideModal();
      if (statusFilter === 'pending') {
        setReports((prev) => prev.filter((item) => item.id !== hideContext.id));
      } else {
        await fetchReports();
      }
    } catch (error) {
      console.error('[admin] Failed to hide response', error);
      setGlobalError('Не удалось скрыть ответ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (report: AdminReport, days: number) => {
    if (!token || !report.response) return;
    setActionLoading(true);
    setGlobalError(null);
    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deviceId: report.response.deviceId,
          days,
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update user ban');
      }

      setInfoMessage(days > 0 ? `Пользователь заблокирован на ${days} дн.` : 'Бан снят.');
    } catch (error) {
      console.error('[admin] Failed to ban user', error);
      setGlobalError('Не удалось обновить бан пользователя.');
    } finally {
      setActionLoading(false);
    }
  };

  const isAuthenticated = Boolean(token);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Пульт модерации</h1>
        <p className="text-text-secondary">
          Управляй жалобами, скрывай неподходящие ответы и при необходимости ограничивай доступ.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-text-tertiary">Для доступа нужен админ-токен.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="password"
              placeholder="Введи токен"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="sm:flex-1"
            />
            <Button onClick={handleLogin} className="w-full sm:w-auto">
              Войти
            </Button>
            {isAuthenticated ? (
              <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto">
                Выйти
              </Button>
            ) : null}
          </div>
        </div>
        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}
      </Card>

      {isAuthenticated ? (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  Статус жалоб
                  <select
                    className="rounded-xl bg-bg-tertiary/60 px-4 py-3 text-text-primary"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as ReportStatus)}
                  >
                    {(['pending', 'reviewed', 'action_taken'] as ReportStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button onClick={fetchReports} disabled={loadingReports} className="w-full sm:w-auto">
                {loadingReports ? 'Обновляем...' : 'Обновить'}
              </Button>
            </div>
            {infoMessage ? <p className="text-sm text-emerald-400">{infoMessage}</p> : null}
            {globalError ? <p className="text-sm text-red-400">{globalError}</p> : null}
          </Card>

          {loadingReports ? (
            <p className="text-text-secondary">Загружаем жалобы...</p>
          ) : reports.length === 0 ? (
            <Card>
              <p className="text-center text-text-secondary">Жалоб с выбранным статусом пока нет.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reasonLabel = REASON_LABELS[report.reason] ?? report.reason;
                return (
                  <Card key={report.id} className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-[0.3em] text-uyan-light">жалоба</span>
                      <p className="text-text-primary">{reasonLabel}</p>
                      {report.description ? (
                        <p className="text-sm text-text-secondary">{report.description}</p>
                      ) : null}
                      <p className="text-xs text-text-tertiary">
                        Получена: {formatDate(report.reportedAt)}
                      </p>
                    </div>

                    {report.message ? (
                      <div className="space-y-2 rounded-xl bg-bg-tertiary/60 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">исходное сообщение</p>
                        <p className="text-text-primary">{report.message.text}</p>
                        <p className="text-xs text-text-tertiary">
                          Категория: {report.message.category} · {formatDate(report.message.createdAt)}
                        </p>
                      </div>
                    ) : null}

                    {report.response ? (
                      <div className="space-y-2 rounded-xl bg-uyan-light/10 p-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">ответ</p>
                          <p className="text-text-primary">{report.response.text}</p>
                          <p className="text-xs text-text-tertiary">
                            Жалоб: {report.response.reportCount} · {formatDate(report.response.createdAt)}
                          </p>
                          {report.response.hidden ? (
                            <span className="text-xs text-red-300">Ответ скрыт</span>
                          ) : null}
                          {report.response.moderationNote ? (
                            <p className="text-xs text-text-secondary">
                              Комментарий модератора: {report.response.moderationNote}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-bg-tertiary/40 p-4 text-sm text-text-tertiary">
                        Ответ не найден или уже удалён.
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => handleKeepVisible(report)}
                        disabled={actionLoading || !report.response}
                        className="w-full sm:w-auto"
                      >
                        ✅ Оставить, всё ок
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => openHideModal(report)}
                        disabled={actionLoading || !report.response}
                        className="w-full sm:w-auto"
                      >
                        🙈 Скрыть ответ
                      </Button>
                      <Button
                        onClick={() => handleBanUser(report, 7)}
                        disabled={actionLoading || !report.response}
                        className="w-full sm:w-auto"
                      >
                        🚫 Бан на 7 дней
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <p className="text-text-secondary">
            Введи действующий токен, чтобы увидеть жалобы и управлять модерацией.
          </p>
        </Card>
      )}

      <Modal open={Boolean(hideContext)} onClose={closeHideModal} title="Скрыть ответ?">
        <p>
          После скрытия ответ станет недоступен автору сообщения, а жалобы будут отмечены как решённые.
        </p>
        <label className="flex flex-col gap-2 text-sm text-text-secondary">
          Комментарий для записи (необязательно)
          <Textarea
            value={moderationNote}
            onChange={(event) => setModerationNote(event.target.value)}
            placeholder="Например: токсичный тон, нарушает правила..."
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={closeHideModal} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button onClick={handleHideResponse} disabled={actionLoading} className="w-full sm:w-auto">
            Скрыть ответ
          </Button>
        </div>
      </Modal>
    </div>
  );
}
