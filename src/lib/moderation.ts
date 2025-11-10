export type ModerationReason = 'too_short' | 'too_long' | 'spam' | 'contact' | 'crisis';

export interface ModerationResult {
  passed: boolean;
  reason?: ModerationReason;
  suggestion?: string;
  cleanedText?: string;
}

const CRISIS_KEYWORDS = [
  'суицид',
  'самоубий',
  'не хочу жить',
  'хочу умереть',
  'убить себя',
  'покончить с собой',
  'повеситься',
  'зарежу себя',
  'жизнь не нужна',
  'life is not worth',
  'i want to die',
  'kill myself',
  'end my life',
  'hurt myself',
  'self harm',
  'self-harm',
  'suicide',
];

const linkRegex = /https?:\/\/|www\.|t\.me\//i;
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneRegex = /(\+?\d[\s-]?){6,}/;
const repeatedCharRegex = /(.)\1{6,}/;

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');

const detectCrisis = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const detectSpam = (text: string): boolean => {
  if (repeatedCharRegex.test(text)) {
    return true;
  }
  const uniqueChars = new Set(text.replace(/\s+/g, ''));
  return uniqueChars.size > 0 && uniqueChars.size <= 3 && text.length >= 20;
};

const detectContact = (text: string): boolean => {
  if (emailRegex.test(text)) {
    return true;
  }
  if (linkRegex.test(text)) {
    return true;
  }
  return phoneRegex.test(text);
};

const buildSuggestion = (reason: ModerationReason, entity: 'message' | 'response'): string | undefined => {
  const base = entity === 'message' ? 'сообщение' : 'ответ';
  switch (reason) {
    case 'too_short':
      return `Добавь ещё несколько мыслей, чтобы ${base} было понятнее и теплее.`;
    case 'too_long':
      return `Сократи ${base} — так его легче дочитать внимательно.`;
    case 'contact':
      return 'Ссылки, контакты и адреса мы не показываем, чтобы пространство оставалось безопасным.';
    case 'spam':
      return 'Кажется, текст напоминает случайный набор символов. Попробуй описать чувства своими словами.';
    case 'crisis':
    default:
      return undefined;
  }
};

export const moderateMessage = (text: string): ModerationResult => {
  const cleanedText = normalize(text);

  if (detectCrisis(cleanedText)) {
    return { passed: false, reason: 'crisis' };
  }

  if (cleanedText.length < 10) {
    return { passed: false, reason: 'too_short', suggestion: buildSuggestion('too_short', 'message') };
  }

  if (cleanedText.length > 280) {
    return { passed: false, reason: 'too_long', suggestion: buildSuggestion('too_long', 'message') };
  }

  if (detectContact(cleanedText)) {
    return { passed: false, reason: 'contact', suggestion: buildSuggestion('contact', 'message') };
  }

  if (detectSpam(cleanedText)) {
    return { passed: false, reason: 'spam', suggestion: buildSuggestion('spam', 'message') };
  }

  return { passed: true, cleanedText };
};

export const moderateResponse = (text: string): ModerationResult => {
  const cleanedText = normalize(text);

  if (cleanedText.length < 20) {
    return { passed: false, reason: 'too_short', suggestion: buildSuggestion('too_short', 'response') };
  }

  if (cleanedText.length > 200) {
    return { passed: false, reason: 'too_long', suggestion: buildSuggestion('too_long', 'response') };
  }

  if (detectContact(cleanedText)) {
    return { passed: false, reason: 'contact', suggestion: buildSuggestion('contact', 'response') };
  }

  if (detectSpam(cleanedText)) {
    return { passed: false, reason: 'spam', suggestion: buildSuggestion('spam', 'response') };
  }

  if (detectCrisis(cleanedText)) {
    return { passed: false, reason: 'crisis' };
  }

  return { passed: true, cleanedText };
};
