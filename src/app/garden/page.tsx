'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { ShareCard, shareCardStyles } from '@/components/ShareCard';
import { loadGarden, removeLight, SavedLight } from '@/lib/garden';

const styleLabels: Record<string, string> = {
  dawn: 'Рассвет',
  aurora: 'Аврора',
  twilight: 'Сумерки',
  meadow: 'Луг',
};

export default function GardenPage() {
  const [lights, setLights] = useState<SavedLight[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStyle, setShareStyle] = useState<string>(shareCardStyles[0]);
  const [shareLight, setShareLight] = useState<SavedLight | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

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

  const openShare = (light: SavedLight) => {
    setShareLight(light);
    setShareStyle(shareCardStyles[0]);
    setShareOpen(true);
  };

  const closeShare = () => {
    setShareOpen(false);
    setShareLight(null);
    setExportError(null);
  };

  const downloadAsImage = async () => {
    if (savingImage) return;
    if (!shareLight) return;
    const element = shareCardRef.current;
    if (!element) {
      console.warn('[garden] Share card element not ready');
      setExportError('Открытка ещё загружается. Попробуй через мгновение.');
      return;
    }

    const { clientWidth, clientHeight } = element;
    if (!clientWidth || !clientHeight) {
      console.warn('[garden] Share card element has zero size', { clientWidth, clientHeight });
      setExportError('Не удалось подготовить открытку для сохранения.');
      return;
    }

    setSavingImage(true);
    setExportError(null);
    try {
      const upscale = Math.max(2, Math.min(4, 1080 / clientWidth));
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: upscale,
        width: clientWidth,
        height: clientHeight,
        style: { transform: 'none' },
      });
      const link = document.createElement('a');
      link.download = `svetlya-${shareLight.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export image', error);
      setExportError('Не получилось сохранить открытку. Попробуй ещё раз.');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <motion.div
      className="mx-auto flex max-w-5xl flex-col gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Архив откликов</h1>
        <p className="text-text-secondary">Здесь живут слова поддержки, к которым хочется возвращаться.</p>
      </div>

      {exportError ? <Notice variant="error">{exportError}</Notice> : null}

      {lights.length === 0 ? (
        <Card className="text-center">
          <div className="space-y-4">
            <p className="text-4xl">📬</p>
            <p className="text-lg text-text-secondary">
              Пока здесь пусто. Сохраняй отклики, которые хочется перечитывать. С ключом устройства из настроек архив переедет с
              тобой на любой девайс.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {lights.map((light) => (
            <Card key={light.id} className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-darkness">твоя мысль</p>
                <p className="mt-2 rounded-xl bg-bg-tertiary/50 p-4 text-sm text-text-secondary">{light.originalMessage}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-uyan-light">бережный отклик</p>
                <p className="mt-2 rounded-xl bg-uyan-light/10 p-4 text-text-primary">{light.responseText}</p>
              </div>
              <div className="flex flex-col gap-3 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
                <span>Сохранено: {new Date(light.savedAt).toLocaleString()}</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => openShare(light)} className="w-full sm:w-auto">
                    📸 Открытка
                  </Button>
                  <Button variant="secondary" onClick={() => handleRemove(light.id)} className="w-full sm:w-auto">
                    Удалить
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={shareOpen} onClose={savingImage ? () => {} : closeShare} title="Поделиться откликом">
        {shareLight ? (
          <div className="space-y-4">
            <div className="mx-auto w-full max-w-[min(420px,90vw)]">
              <div
                className="relative rounded-3xl border border-white/10 bg-bg-tertiary/40 p-4"
                style={{ aspectRatio: '4 / 5' }}
              >
                <ShareCard
                  ref={shareCardRef}
                  originalMessage={shareLight.originalMessage}
                  responseText={shareLight.responseText}
                  styleId={shareStyle}
                  className="absolute inset-0"
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
                      active
                        ? 'bg-uyan-light text-bg-primary'
                        : 'bg-bg-secondary/60 text-text-secondary hover:bg-bg-secondary'
                    }`}
                  >
                    {styleLabels[style] ?? style}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={downloadAsImage}
              disabled={savingImage}
              aria-busy={savingImage}
              className="w-full sm:w-auto"
            >
              {savingImage ? 'Сохраняю…' : 'Скачать открытку'}
            </Button>
          </div>
        ) : (
          <p className="text-center text-text-secondary">Выбери отклик, чтобы поделиться им.</p>
        )}
      </Modal>
    </motion.div>
  );
}
