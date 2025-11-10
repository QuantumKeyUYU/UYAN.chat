'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { useAppStore } from '@/store/useAppStore';
import { saveLight } from '@/lib/garden';

type MessageStatus = 'waiting' | 'answered' | 'expired';

type MessageSummary = {
  id: string;
  text: string;
  category: string;
  status: MessageStatus;
  createdAt: number;
  answeredAt?: number | null;
};

type ResponseDetail = {
  id: string;
  text: string;
  createdAt: number;
  reportCount: number;
  hidden: boolean;
  moderationNote?: string | null;
};

interface MessageDetail {
  message: MessageSummary;
  response?: ResponseDetail;
}

const statusLabels: Record<MessageStatus, string> = {
  waiting: 'Ждёт ответ',
  answered: 'Ответ получен',
  expired: 'История закрыта',
};

const normalizeMessage = (raw: any): MessageSummary => ({
  id: raw.id,
  text: raw.text,
  category: raw.category,
  status: raw.status,
  createdAt: raw.createdAt,
  answeredAt: raw.answeredAt ?? null,
});

const normalizeDetail = (raw: any): MessageDetail => ({
  message: normalizeMessage(raw.message),
  response: raw.response
    ? {
        id: raw.response.id,
        text: raw.response.text,
        createdAt: raw.response.createdAt,
        reportCount: raw.response.reportCount ?? 0,
        hidden: Boolean(raw.response.hidden),
        moderationNote: raw.response.moderationNote ?? null,
      }
    : undefined,
});

export default function MyLightsPage() {
  const deviceId = useAppStore((state) => state.deviceId);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('offensive');
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [pageNotice, setPageNotice] = useState<{
    variant: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  const loadMessages = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/messages/my?deviceId=${deviceId}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      const normalized = (data.messages ?? []).map((item: any) => normalizeMessage(item));
      setMessages(normalized);
      setPageNotice((prev) => (prev?.variant === 'error' ? null : prev));
    } catch (err) {
      console.error(err);
      setPageNotice({ variant: 'error', message: 'Не получилось загрузить сообщения. Попробуй обновить позже.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const openDetail = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`);
      if (!response.ok) throw new Error('Ошибка');
      const data = await response.json();
      setSelected(normalizeDetail(data));
    } catch (err) {
      console.error(err);
      setPageNotice({ variant: 'error', message: 'Не получилось открыть сообщение. Попробуй обновить страницу.' });
    }
  };

  const saveToGarden = () => {
    if (!selected?.response) return;
    saveLight({
      id: selected.response.id,
      originalMessage: selected.message.text,
      responseText: selected.response.text,
      category: selected.message.category,
      savedAt: Date.now(),
    });
    setPageNotice({ variant: 'success', message: 'Ответ сохранён в саду света ✨' });
  };

  const submitReport = async () => {
    if (!selected?.response || !deviceId) return;
    setReportLoading(true);
    try {
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: selected.response.id,
          reason: reportReason,
          description: reportText,
          deviceId,
        }),
      });
      if (!response.ok) throw new Error('Не удалось отправить жалобу');
      setReportOpen(false);
      setReportText('');
      setPageNotice({ variant: 'success', message: 'Жалоба отправлена. Спасибо за заботу о пространстве.' });
    } catch (err) {
      console.error(err);
      setPageNotice({ variant: 'error', message: 'Не получилось отправить жалобу. Попробуй ещё раз позже.' });
    } finally {
      setReportLoading(false);
    }
  };

  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1;
      }),
    [messages],
  );

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Загружаем твой путь... Обнови страницу, если ожидание затянулось.
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Мои сообщения</h1>
        <p className="text-text-secondary">Следи, кто откликнулся на твой зов, и сохраняй свет.</p>
      </div>

      {pageNotice ? <Notice variant={pageNotice.variant}>{pageNotice.message}</Notice> : null}

      {loading ? <p className="text-text-secondary">Загружаем...</p> : null}

      {sortedMessages.length === 0 && !loading ? (
        <Card className="space-y-3 text-center">
          <div className="text-3xl">🌱</div>
          <h2 className="text-xl font-semibold text-text-primary">Здесь появятся твои истории</h2>
          <p className="text-text-secondary">
            Когда поделишься своим состоянием, мы соберём здесь статусы и ответы, чтобы ты мог возвращаться к ним в любое
            время.
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {sortedMessages.map((message) => (
          <Card key={message.id} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="rounded-full bg-uyan-darkness/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-text-secondary">
                {statusLabels[message.status]}
              </span>
              <span className="text-sm text-text-tertiary">Категория: {message.category}</span>
            </div>
            <p className="text-text-primary">{message.text}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <span className="text-sm text-text-tertiary">Создано: {new Date(message.createdAt).toLocaleString()}</span>
              <Button
                variant="secondary"
                onClick={() => openDetail(message.id)}
                className="w-full sm:w-auto"
              >
                Подробнее
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Ответ на твоё сообщение">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-uyan-darkness">твоё сообщение</p>
              <p className="mt-2 rounded-xl bg-bg-tertiary/40 p-4 text-text-primary">{selected.message.text}</p>
            </div>
            {selected.response ? (
              selected.response.hidden ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">свет, который ты получил</p>
                  <p className="rounded-xl bg-uyan-light/10 p-4 text-text-secondary">
                    Этот ответ скрыт модерацией.
                  </p>
                  {selected.response.moderationNote ? (
                    <p className="text-sm text-text-tertiary">
                      Комментарий модератора: {selected.response.moderationNote}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">свет, который ты получил</p>
                  <p className="rounded-xl bg-uyan-light/10 p-4 text-text-primary">{selected.response.text}</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={saveToGarden} className="w-full sm:w-auto">
                      Сохранить в сад
                    </Button>
                    <Button variant="secondary" onClick={() => setReportOpen(true)} className="w-full sm:w-auto">
                      Пожаловаться
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-text-secondary">Ответ пока в пути. Возвращайся позже ✨</p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Пожаловаться на ответ">
        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Причина
            <select
              className="rounded-xl bg-bg-tertiary/60 px-4 py-3 text-text-primary"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              <option value="offensive">Оскорбление</option>
              <option value="inappropriate">Неуместно</option>
              <option value="sarcasm">Сарказм</option>
              <option value="spam">Спам</option>
              <option value="other">Другое</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-text-secondary">
            Комментарий (по желанию)
            <textarea
              className="h-28 rounded-xl bg-bg-tertiary/60 px-4 py-3 text-text-primary"
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
            />
          </label>
          <Button onClick={submitReport} disabled={reportLoading} className="w-full">
            {reportLoading ? 'Отправляем...' : 'Отправить жалобу'}
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
