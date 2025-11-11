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

type ResponseDetail = {
  id: string;
  text: string;
  createdAt: number;
  reportCount: number;
  hidden: boolean;
  moderationNote?: string | null;
};

type MessageWithResponses = {
  id: string;
  text: string;
  category: string;
  status: MessageStatus;
  createdAt: number;
  answeredAt?: number | null;
  responses: ResponseDetail[];
};

const statusLabels: Record<MessageStatus, string> = {
  waiting: 'Ждёт ответ',
  answered: 'Ответ получен',
  expired: 'История закрыта',
};

const normalizeResponse = (raw: any): ResponseDetail => ({
  id: raw.id,
  text: raw.text,
  createdAt: raw.createdAt,
  reportCount: raw.reportCount ?? 0,
  hidden: Boolean(raw.hidden),
  moderationNote: raw.moderationNote ?? null,
});

const normalizeMessageWithResponses = (raw: any): MessageWithResponses => ({
  id: raw.id,
  text: raw.text,
  category: raw.category,
  status: raw.status,
  createdAt: raw.createdAt,
  answeredAt: raw.answeredAt ?? null,
  responses: Array.isArray(raw.responses) ? raw.responses.map((item: any) => normalizeResponse(item)) : [],
});

export default function MyLightsPage() {
  const deviceId = useAppStore((state) => state.deviceId);
  const [messages, setMessages] = useState<MessageWithResponses[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNotice, setPageNotice] = useState<{
    variant: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('offensive');
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportContext, setReportContext] = useState<{
    message: MessageWithResponses;
    response: ResponseDetail;
  } | null>(null);

  const loadMessages = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/messages/my', {
        headers: { 'x-device-id': deviceId },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      const normalized = (data.messages ?? []).map((item: any) => normalizeMessageWithResponses(item));
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

  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => {
        return b.createdAt - a.createdAt;
      }),
    [messages],
  );

  const handleSaveToGarden = (message: MessageWithResponses, response: ResponseDetail) => {
    if (response.hidden) return;
    saveLight({
      id: response.id,
      originalMessage: message.text,
      responseText: response.text,
      category: message.category,
      savedAt: Date.now(),
    });
    setPageNotice({ variant: 'success', message: 'Ответ сохранён в саду света ✨' });
  };

  const openReportModal = (message: MessageWithResponses, response: ResponseDetail) => {
    setReportContext({ message, response });
    setReportReason('offensive');
    setReportText('');
  };

  const closeReportModal = () => {
    setReportContext(null);
    setReportLoading(false);
  };

  const submitReport = async () => {
    if (!reportContext || !deviceId) return;
    setReportLoading(true);
    try {
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: reportContext.response.id,
          reason: reportReason,
          description: reportText,
          deviceId,
        }),
      });
      if (!response.ok) throw new Error('Не удалось отправить жалобу');
      closeReportModal();
      setReportText('');
      setReportReason('offensive');
      setPageNotice({ variant: 'success', message: 'Жалоба отправлена. Спасибо за заботу о пространстве.' });
    } catch (err) {
      console.error(err);
      setPageNotice({ variant: 'error', message: 'Не получилось отправить жалобу. Попробуй ещё раз позже.' });
    } finally {
      setReportLoading(false);
    }
  };

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
          <Card key={message.id} className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="rounded-full bg-uyan-darkness/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-text-secondary">
                {statusLabels[message.status]}
              </span>
              <span className="text-sm text-text-tertiary">Категория: {message.category}</span>
            </div>
            <p className="text-text-primary">{message.text}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-text-tertiary">Создано: {new Date(message.createdAt).toLocaleString()}</span>
            </div>

            <div className="space-y-3 rounded-2xl bg-bg-tertiary/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">ответы</p>
              {message.responses.length === 0 ? (
                <p className="text-text-secondary">Ответов пока нет, но кто-то может написать позже ✨</p>
              ) : (
                <div className="space-y-4">
                  {message.responses.map((response) => (
                    <div key={response.id} className="space-y-3 rounded-xl bg-bg-primary/40 p-4">
                      {response.hidden ? (
                        <div className="space-y-2">
                          <p className="text-text-secondary">Этот ответ скрыт модерацией.</p>
                          {response.moderationNote ? (
                            <p className="text-sm text-text-tertiary">Комментарий модератора: {response.moderationNote}</p>
                          ) : null}
                          <span className="text-sm text-text-tertiary">
                            Получен: {new Date(response.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <>
                          <p className="text-text-primary">{response.text}</p>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm text-text-tertiary">
                              Получен: {new Date(response.createdAt).toLocaleString()}
                            </span>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button onClick={() => handleSaveToGarden(message, response)} className="w-full sm:w-auto">
                                Сохранить в сад
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => openReportModal(message, response)}
                                className="w-full sm:w-auto"
                              >
                                Пожаловаться
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(reportContext)} onClose={closeReportModal} title="Пожаловаться на ответ">
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl bg-bg-tertiary/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">фрагмент ответа</p>
            <p className="text-text-primary">
              {reportContext?.response.hidden ? 'Ответ скрыт модерацией.' : reportContext?.response.text}
            </p>
          </div>
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
