'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { ShareCard, shareCardStyles } from '@/components/ShareCard';
import { useDeviceStore } from '@/store/device';
import { saveLight, loadGarden } from '@/lib/garden';
import { hideResponseLocally, loadHiddenResponses } from '@/lib/hiddenResponses';
import { DEVICE_ID_HEADER } from '@/lib/device/constants';
import { useVocabulary } from '@/lib/hooks/useVocabulary';
import { useRepliesBadge } from '@/hooks/useRepliesBadge';
import {
  SHARE_CARD_PIXEL_RATIO,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
} from '@/lib/shareCard';

const tabs = [
  { key: 'received', label: 'Мне ответили' },
  { key: 'given', label: 'Мои ответы' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const shareStyleLabels: Record<string, string> = {
  dawn: 'Рассвет',
  aurora: 'Аврора',
  twilight: 'Сумерки',
  meadow: 'Луг',
};

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

type SentResponse = {
  id: string;
  text: string;
  createdAt: number;
  message: {
    id: string;
    text: string;
    category?: string;
  } | null;
};

const statusLabels: Record<MessageStatus, string> = {
  waiting: 'Ждёт ответ',
  answered: 'Ответ получен',
  expired: 'Мысль закрыта',
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

const normalizeSentResponse = (raw: any): SentResponse => ({
  id: raw.id,
  text: raw.text,
  createdAt: raw.createdAt,
  message: raw.message
    ? {
        id: raw.message.id,
        text: raw.message.text,
        category: raw.message.category,
      }
    : null,
});

export default function MyLightsPage() {
  const router = useRouter();
  const deviceId = useDeviceStore((state) => state.id);
  const { vocabulary } = useVocabulary();
  const [activeTab, setActiveTab] = useState<TabKey>('received');
  const [messages, setMessages] = useState<MessageWithResponses[]>([]);
  const [sentResponses, setSentResponses] = useState<SentResponse[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [pageNotice, setPageNotice] = useState<{ variant: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [reportReason, setReportReason] = useState('offensive');
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportContext, setReportContext] = useState<{ message: MessageWithResponses; response: ResponseDetail } | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set(loadHiddenResponses()));
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(loadGarden().map((item) => item.id)));
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStyle, setShareStyle] = useState<string>(shareCardStyles[0]);
  const [shareData, setShareData] = useState<{ message: string; response: string } | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const { markAllSeen, syncFromMessages, count: unreadCount, hasUnseenReplies } = useRepliesBadge();
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);

  const refreshSaved = useCallback(() => {
    setSavedIds(new Set(loadGarden().map((item) => item.id)));
  }, []);

  const refreshHidden = useCallback(() => {
    setHiddenIds(new Set(loadHiddenResponses()));
  }, []);

  const loadReceivedMessages = useCallback(async () => {
    if (!deviceId) return;
    setHasMarkedSeen(false);
    setLoadingReceived(true);
    try {
      const response = await fetch('/api/messages/my', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      const normalized = (data.messages ?? []).map((item: unknown) => normalizeMessageWithResponses(item));
      setMessages(normalized);
      syncFromMessages(normalized);
      setPageNotice((prev) => (prev?.variant === 'error' ? null : prev));
    } catch (error) {
      console.error('[my] Failed to load messages', error);
      setPageNotice({ variant: 'error', message: 'Не получилось загрузить твои мысли. Попробуй обновить позже.' });
    } finally {
      setLoadingReceived(false);
    }
  }, [deviceId, syncFromMessages]);

  const loadSent = useCallback(async () => {
    if (!deviceId) return;
    setLoadingSent(true);
    try {
      const response = await fetch('/api/responses/my', {
        headers: { [DEVICE_ID_HEADER]: deviceId },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Ошибка загрузки ответов');
      const data = await response.json();
      const normalized = (data.responses ?? []).map((item: unknown) => normalizeSentResponse(item));
      normalized.sort((a: SentResponse, b: SentResponse) => b.createdAt - a.createdAt);
      setSentResponses(normalized);
    } catch (error) {
      console.error('[my] Failed to load sent responses', error);
      setPageNotice((prev) =>
        prev?.variant === 'error'
          ? prev
          : { variant: 'error', message: 'Не получилось загрузить отправленные ответы. Попробуй позже.' },
      );
    } finally {
      setLoadingSent(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    void loadReceivedMessages();
    void loadSent();
  }, [deviceId, loadReceivedMessages, loadSent]);

  const hasReplies = useMemo(() => messages.some((message) => message.responses.length > 0), [messages]);

  useEffect(() => {
    if (activeTab !== 'received') {
      return;
    }
    if (loadingReceived) {
      return;
    }
    if (hasMarkedSeen) {
      return;
    }
    if (!hasReplies && !hasUnseenReplies) {
      return;
    }
    setHasMarkedSeen(true);
    void markAllSeen();
  }, [activeTab, hasMarkedSeen, hasReplies, hasUnseenReplies, loadingReceived, markAllSeen]);

  useEffect(() => {
    if (activeTab !== 'received') {
      setHasMarkedSeen(false);
    }
  }, [activeTab]);

  const handleSaveToGarden = (message: MessageWithResponses, response: ResponseDetail) => {
    if (response.hidden) return;
    saveLight({
      id: response.id,
      originalMessage: message.text,
      responseText: response.text,
      category: message.category,
      savedAt: Date.now(),
    });
    refreshSaved();
    setPageNotice({ variant: 'success', message: 'Ответ сохранён в «Ответах» ✨' });
  };

  const handleHideResponse = (responseId: string) => {
    hideResponseLocally(responseId);
    refreshHidden();
    setPageNotice({ variant: 'info', message: 'Ответ скрыт. Его можно вернуть в настройках.' });
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
        headers: { 'Content-Type': 'application/json', [DEVICE_ID_HEADER]: deviceId },
        body: JSON.stringify({
          responseId: reportContext.response.id,
          reason: reportReason,
          description: reportText,
        }),
      });
      if (!response.ok) throw new Error('Не удалось отправить жалобу');
      closeReportModal();
      setReportText('');
      setReportReason('offensive');
      setPageNotice({ variant: 'success', message: 'Жалоба отправлена. Спасибо за заботу о пространстве.' });
    } catch (error) {
      console.error('[my] Failed to submit report', error);
      setPageNotice({ variant: 'error', message: 'Не получилось отправить жалобу. Попробуй ещё раз позже.' });
    } finally {
      setReportLoading(false);
    }
  };

  const visibleMessages = useMemo(() => {
    const hidden = hiddenIds;
    return messages.map((message) => ({
      ...message,
      responses: message.responses.filter((response) => !hidden.has(response.id)),
    }));
  }, [messages, hiddenIds]);

  const sortedMessages = useMemo<MessageWithResponses[]>(
    () =>
      [...visibleMessages].sort((a: MessageWithResponses, b: MessageWithResponses) => {
        return b.createdAt - a.createdAt;
      }),
    [visibleMessages],
  );

  const hasAnyResponses = useMemo(() => sortedMessages.some((message) => message.responses.length > 0), [sortedMessages]);

  const openShare = (messageText: string, responseText: string) => {
    setShareData({ message: messageText, response: responseText });
    setShareStyle(shareCardStyles[0]);
    setShareError(null);
    setShareOpen(true);
  };

  const closeShare = () => {
    if (savingImage) return;
    setShareOpen(false);
    setShareData(null);
    setShareError(null);
  };

  useEffect(() => {
    const wrapper = previewWrapperRef.current;
    if (!wrapper) return;

    const updateScale = (width: number) => {
      if (!width) return;
      setPreviewScale(Math.min(1, width / SHARE_CARD_WIDTH));
    };

    updateScale(wrapper.clientWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateScale(entry.contentRect.width);
      }
    });

    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, [shareOpen]);

  const downloadAsImage = async () => {
    if (savingImage || !shareData) return;
    const element = shareCardRef.current;
    if (!element) {
      setShareError('Открытка ещё готовится. Попробуй через мгновение.');
      return;
    }
    const { clientWidth, clientHeight } = element;
    if (!clientWidth || !clientHeight) {
      setShareError('Не удалось подготовить открытку для сохранения.');
      return;
    }
    setSavingImage(true);
    setShareError(null);
    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: SHARE_CARD_PIXEL_RATIO,
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      const link = document.createElement('a');
      link.download = `uyan-light-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('[my] Failed to export postcard', error);
      setShareError('Не получилось сохранить открытку. Попробуй ещё раз.');
    } finally {
      setSavingImage(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="mx-auto max-w-2xl text-center text-text-secondary">
        Не удалось определить устройство. Перезагрузи страницу или попробуй открыть сервис заново.
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">{vocabulary.answersPageTitle}</h1>
        <p className="text-text-secondary">{vocabulary.answersPageSubtitle}</p>
      </div>

      <div className="flex gap-2 rounded-2xl border border-white/10 bg-bg-secondary/60 p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light ${
                isActive ? 'bg-white/10 text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="relative inline-flex items-center justify-center gap-2">
                <span>{tab.label}</span>
                {tab.key === 'received' && hasUnseenReplies ? (
                  <>
                    <span className="sr-only">Есть непрочитанные ответы</span>
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-3 min-h-[16px] min-w-[16px] rounded-full bg-uyan-gold px-1 text-[10px] font-semibold leading-tight text-slate-950 shadow-sm"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {pageNotice ? <Notice variant={pageNotice.variant}>{pageNotice.message}</Notice> : null}

      {activeTab === 'received' ? (
        <div className="space-y-4">
          {loadingReceived ? <p className="text-text-secondary">Загружаем ответы…</p> : null}

          {!loadingReceived && sortedMessages.length === 0 ? (
            <Card className="space-y-4 text-center">
              <div className="text-3xl">🌿</div>
              <h2 className="text-xl font-semibold text-text-primary">Пока здесь пусто.</h2>
              <p className="text-text-secondary">
                Когда кто-то ответит на твою мысль, тёплые слова появятся здесь.
              </p>
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => router.push('/write')}>
                  {vocabulary.ctaWriteShort}
                </Button>
              </div>
            </Card>
          ) : null}

          {sortedMessages.map((message) => (
            <Card key={message.id} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="rounded-full bg-uyan-darkness/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-text-secondary">
                  {statusLabels[message.status]}
                </span>
                <span className="text-sm text-text-tertiary">Категория: {message.category}</span>
              </div>
              <p className="text-text-primary">{message.text}</p>
              <span className="text-sm text-text-tertiary">Создано: {new Date(message.createdAt).toLocaleString()}</span>

              <div className="space-y-3 rounded-2xl bg-bg-tertiary/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">ответы</p>
                {message.responses.length === 0 ? (
                  <p className="text-text-secondary">Ответов пока нет, но кто-то может ответить позже ✨</p>
                ) : (
                  <div className="space-y-4">
                    {message.responses.map((response) => {
                      if (response.hidden) {
                        return (
                          <div key={response.id} className="space-y-2 rounded-xl bg-bg-primary/40 p-4 text-text-secondary">
                            <p>Этот ответ скрыт модерацией.</p>
                            {response.moderationNote ? (
                              <p className="text-sm text-text-tertiary">Комментарий модератора: {response.moderationNote}</p>
                            ) : null}
                            <span className="text-sm text-text-tertiary">Получен: {new Date(response.createdAt).toLocaleString()}</span>
                          </div>
                        );
                      }

                      const isSaved = savedIds.has(response.id);
                      const isHiddenLocally = hiddenIds.has(response.id);
                      return (
                        <div key={response.id} className="space-y-3 rounded-xl bg-bg-primary/40 p-4">
                          <p className="text-text-primary">{response.text}</p>
                          <div className="flex flex-col gap-2 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
                            <span>Получен: {new Date(response.createdAt).toLocaleString()}</span>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                onClick={() => handleSaveToGarden(message, response)}
                                disabled={isSaved}
                                className="w-full sm:w-auto"
                              >
                                {isSaved ? 'Сохранено' : 'Сохранить в «Ответы»'}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => handleHideResponse(response.id)}
                                disabled={isHiddenLocally}
                                className="w-full sm:w-auto"
                              >
                                {isHiddenLocally ? 'Скрыто' : 'Скрыть из ленты'}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => openShare(message.text, response.text)}
                                className="w-full sm:w-auto"
                              >
                                Сделать открытку
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() => openReportModal(message, response)}
                              className="text-left text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
                            >
                              Сообщить о нарушении
                            </button>
                            {response.moderationNote ? (
                              <span>Комментарий модератора: {response.moderationNote}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {!loadingReceived && sortedMessages.length > 0 && !hasAnyResponses ? (
            <Notice variant="info">Как только появятся ответы, мы покажем их здесь.</Notice>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {loadingSent ? <p className="text-text-secondary">Загружаем ответы…</p> : null}
          {!loadingSent && sentResponses.length === 0 ? (
            <Card className="space-y-4 text-center">
              <div className="text-3xl">💌</div>
              <h2 className="text-xl font-semibold text-text-primary">Ты ещё ни разу не отвечал.</h2>
              <p className="text-text-secondary">
                Когда поможешь кому-то словом, твои ответы появятся здесь.
              </p>
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => router.push('/support')}>
                  Поддержать
                </Button>
              </div>
            </Card>
          ) : null}

          {sentResponses.map((response) => (
            <Card key={response.id} className="space-y-4">
              {response.message ? (
                <div className="space-y-2 rounded-xl bg-bg-tertiary/40 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">мысль</p>
                          <p className="text-text-secondary">{response.message.text}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">твой ответ</p>
                <p className="text-text-primary">{response.text}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
                <span>Отправлен: {new Date(response.createdAt).toLocaleString()}</span>
                <Button variant="ghost" onClick={() => openShare(response.message?.text ?? '', response.text)} className="w-full sm:w-auto">
                  Сделать открытку
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
            {reportLoading ? 'Отправляем…' : 'Отправить жалобу'}
          </Button>
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={closeShare} title="Сделать открытку">
        {shareData ? (
          <div className="space-y-4">
            <div className="mx-auto w-full max-w-[min(420px,90vw)]">
              <div
                ref={previewWrapperRef}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-bg-tertiary/40 p-4"
                style={{ aspectRatio: '9 / 16' }}
              >
                <ShareCard
                  ref={shareCardRef}
                  originalMessage={shareData.message}
                  responseText={shareData.response}
                  styleId={shareStyle}
                  className="absolute left-0 top-0 origin-top-left"
                  style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {shareCardStyles.map((style) => {
                const active = style === shareStyle;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setShareStyle(style)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active ? 'bg-uyan-light text-bg-primary' : 'bg-bg-secondary/60 text-text-secondary hover:bg-bg-secondary'
                    }`}
                  >
                    {shareStyleLabels[style] ?? style}
                  </button>
                );
              })}
            </div>
            {shareError ? <Notice variant="error">{shareError}</Notice> : null}
            <Button onClick={downloadAsImage} disabled={savingImage} className="w-full sm:w-auto">
              {savingImage ? 'Сохраняю…' : 'Скачать открытку'}
            </Button>
          </div>
        ) : (
          <p className="text-center text-text-secondary">Выбери ответ, чтобы сделать открытку.</p>
        )}
      </Modal>
    </motion.div>
  );
}
