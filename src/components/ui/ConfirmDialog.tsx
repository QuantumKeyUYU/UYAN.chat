'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Да',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [open]);

  const handleCancel = () => {
    if (loading) return;
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} title={title}>
      <div className="space-y-6">
        {description ? <div className="text-sm leading-relaxed text-text-secondary">{description}</div> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto ${
              danger
                ? '!text-red-100 !hover:text-red-50 bg-red-500/20 hover:bg-red-500/30 focus-visible:outline-red-400'
                : ''
            }`.trim()}
            variant={danger ? 'ghost' : 'primary'}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
