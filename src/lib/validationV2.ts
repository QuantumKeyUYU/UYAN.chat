type ValidationError = 'TOO_SHORT' | 'TOO_LONG' | 'EMPTY_BODY';

type ValidationResult = { ok: true } | { ok: false; reason: ValidationError };

function validateRange(value: string, min: number, max: number): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { ok: false, reason: 'EMPTY_BODY' };
  }

  const length = value.trim().length;

  if (length < min) {
    return { ok: false, reason: 'TOO_SHORT' };
  }

  if (length > max) {
    return { ok: false, reason: 'TOO_LONG' };
  }

  return { ok: true };
}

export function validateMessageBody(body: string): ValidationResult {
  return validateRange(body, 10, 280);
}

export function validateResponseBody(body: string): ValidationResult {
  return validateRange(body, 20, 200);
}
