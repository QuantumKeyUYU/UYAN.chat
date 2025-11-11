'use client';

import { useEffect, useMemo, useRef, useId } from 'react';
import type { ReactNode } from 'react';
import type { SubmitHandler, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { formatSeconds } from '@/lib/time';
import { useAutoResizeTextarea } from '@/lib/hooks/useAutoResizeTextarea';

export interface ComposeFormFields {
  text: string;
  honeypot: string;
}

interface ComposeFormProps {
  form: UseFormReturn<ComposeFormFields>;
  onSubmit: SubmitHandler<ComposeFormFields>;
  minLength: number;
  maxLength: number;
  placeholder: string;
  submitLabel: string;
  loadingLabel?: string;
  description?: ReactNode;
  errorMessage?: string | null;
  busy?: boolean;
  disabled?: boolean;
  cooldownSeconds?: number | null;
  onChange?: () => void;
}

export function ComposeForm({
  form,
  onSubmit,
  minLength,
  maxLength,
  placeholder,
  submitLabel,
  loadingLabel = 'Отправляем...',
  description,
  errorMessage,
  busy = false,
  disabled = false,
  cooldownSeconds = null,
  onChange,
}: ComposeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const textValue = watch('text') ?? '';
  const honeypotRegister = register('honeypot');
  const isInitial = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const counterId = `${fieldId}-counter`;

  useAutoResizeTextarea(textareaRef, textValue);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    onChange?.();
  }, [textValue, onChange]);

  const submitHandler = useMemo(() => {
    return handleSubmit(async (values) => {
      if (values.honeypot) {
        return;
      }
      await onSubmit(values);
    });
  }, [handleSubmit, onSubmit]);

  const textError = errors.text?.message;
  const isTooShort = textValue.trim().length < minLength;
  const isCooldownActive = typeof cooldownSeconds === 'number' && cooldownSeconds > 0;
  const buttonDisabled = busy || disabled || isTooShort || isCooldownActive;

  return (
    <form onSubmit={submitHandler} className="space-y-6">
      {description ? (
        <div className="rounded-2xl bg-bg-secondary/60 p-4 text-sm leading-relaxed text-text-secondary">{description}</div>
      ) : null}

      <div>
        <Textarea
          ref={textareaRef}
          rows={4}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={`${hintId} ${counterId}`}
          aria-invalid={Boolean(errors.text)}
          {...register('text', {
            required: 'Сообщение не может быть пустым',
            minLength: { value: minLength, message: `Минимум ${minLength} символов` },
            maxLength: { value: maxLength, message: `Максимум ${maxLength} символов` },
          })}
          className="min-h-[120px] w-full resize-none"
        />
        <div className="mt-2 flex flex-col gap-1 text-sm text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <span id={hintId}>От {minLength} до {maxLength} символов</span>
          <span id={counterId} className="tabular-nums text-text-secondary">
            {textValue.length}/{maxLength}
          </span>
        </div>
        {textError ? (
          <div role="status" aria-live="polite" className="mt-1 text-sm text-red-400">
            {textError}
          </div>
        ) : null}
      </div>

      <div className="sr-only" aria-hidden>
        <label>
          Не заполняйте это поле
          <input type="text" tabIndex={-1} autoComplete="off" {...honeypotRegister} />
        </label>
      </div>

      {errorMessage ? <Notice variant="error">{errorMessage}</Notice> : null}

      {isCooldownActive ? (
        <Notice variant="info">
          Пауза перед следующей попыткой — осталось {formatSeconds(cooldownSeconds ?? 0)}.
        </Notice>
      ) : null}

      <Button
        type="submit"
        disabled={buttonDisabled}
        className="w-full active:scale-[0.98]"
        aria-busy={busy}
      >
        {busy ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
