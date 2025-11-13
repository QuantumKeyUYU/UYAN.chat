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
  helperHint?: ReactNode;
  longTextWarningThreshold?: number;
  longTextWarningMessage?: string;
  mode?: 'write' | 'support';
  descriptionClassName?: string;
  textareaWrapperClassName?: string;
  fieldLabel?: ReactNode;
  helperHintClassName?: string;
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
  helperHint,
  longTextWarningThreshold,
  longTextWarningMessage,
  mode = 'write',
  descriptionClassName,
  textareaWrapperClassName,
  fieldLabel,
  helperHintClassName,
}: ComposeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const textValue = watch('text') ?? '';
  const honeypotRegister = register('honeypot');
  const textRegister = register('text', {
    required: 'Сообщение не может быть пустым',
    minLength: { value: minLength, message: `Минимум ${minLength} символов` },
    maxLength: { value: maxLength, message: `Максимум ${maxLength} символов` },
  });
  const isInitial = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const trimmedLength = textValue.trim().length;
  const textError = errors.text?.message;
  const isTooShort = trimmedLength < minLength;
  const isCooldownActive = typeof cooldownSeconds === 'number' && cooldownSeconds > 0;
  const buttonDisabled = busy || disabled || isTooShort || isCooldownActive;
  const showLongTextWarning =
    typeof longTextWarningThreshold === 'number' && trimmedLength > longTextWarningThreshold && Boolean(longTextWarningMessage);

  const descriptionClasses = `rounded-2xl bg-bg-secondary/60 p-4 text-sm leading-relaxed text-text-secondary${
    descriptionClassName ? ` ${descriptionClassName}` : ''
  }`;
  const helperHintClasses = helperHintClassName
    ? helperHintClassName
    : 'mt-3 space-y-1 text-sm leading-relaxed text-text-tertiary';
  const wrapperClasses = `space-y-2${textareaWrapperClassName ? ` ${textareaWrapperClassName}` : ''}`;

  return (
    <form onSubmit={submitHandler} className="space-y-6">
      {description ? <div className={descriptionClasses}>{description}</div> : null}

      <div className={wrapperClasses}>
        {fieldLabel ? (
          <p className="text-sm font-medium text-text-secondary">{fieldLabel}</p>
        ) : null}
        <Textarea
          rows={4}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-describedby={`${hintId} ${counterId}`}
          aria-invalid={Boolean(errors.text)}
          {...textRegister}
          ref={(node) => {
            textRegister.ref(node);
            textareaRef.current = node;
          }}
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
        {showLongTextWarning ? (
          <p className="mt-2 text-sm text-uyan-light">{longTextWarningMessage}</p>
        ) : null}
        {helperHint ? (
          <div className={helperHintClasses}>{helperHint}</div>
        ) : null}
        {mode === 'support' ? (
          <div className="mt-3 space-y-1 text-sm leading-relaxed text-text-tertiary">
            <p>Иногда трудно подобрать слова.</p>
            <p>Можно начать так:</p>
            <p>«Спасибо, что поделился(лась) этим…»</p>
            <p>«Я рядом и слышу тебя, даже через экран.»</p>
            <p>«Понимаю, как это нелегко. Ты не один(одна).»</p>
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
