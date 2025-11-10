import OpenAI from 'openai';

export interface ModerationResult {
  approved: boolean;
  reasons?: string[];
  cleanedText?: string;
  crisis?: boolean;
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CRISIS_KEYWORDS = [
  'суицид',
  'хочу умереть',
  'не хочу жить',
  'убить себя',
  'покончить с собой',
  'самоубийство',
  'самоубийцей',
  'повеситься',
  'убью себя',
  'suicide',
  'kill myself',
  'i want to die',
  'end my life',
  'take my life',
  'hurt myself',
  'self harm',
  'self-harm',
];

const phoneRegex = /(\+7|8)[\s\-()]?\d{3}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}/g;
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

const scrubPII = (text: string): string => {
  return text
    .replace(phoneRegex, '[номер скрыт]')
    .replace(emailRegex, '[почта скрыта]')
    .replace(urlRegex, '[ссылка скрыта]');
};

const detectCrisis = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const extractReasons = (categories: Record<string, boolean> | undefined): string[] => {
  if (!categories) {
    return [];
  }

  const reasons: string[] = [];
  for (const [key, value] of Object.entries(categories)) {
    if (!value) continue;
    const normalized = key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (normalized.length > 0) {
      reasons.push(normalized);
    }
  }

  return reasons.length > 0 ? reasons : ['openai_flagged'];
};

export const moderateText = async (text: string): Promise<ModerationResult> => {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { approved: false, reasons: ['empty'] };
  }

  const cleanedText = scrubPII(trimmed);

  if (detectCrisis(trimmed)) {
    return {
      approved: false,
      crisis: true,
      reasons: ['crisis_detected'],
      cleanedText,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[moderation] Missing OPENAI_API_KEY, skipping OpenAI moderation');
    return { approved: true, cleanedText };
  }

  try {
    const result = await openaiClient.moderations.create({
      model: 'omni-moderation-latest',
      input: cleanedText,
    });

    const moderation = result.results?.[0];
    if (moderation?.flagged) {
      const reasons = extractReasons(moderation.categories as Record<string, boolean> | undefined);
      return {
        approved: false,
        reasons,
        cleanedText,
      };
    }

    return { approved: true, cleanedText };
  } catch (error) {
    console.error('[moderation] Failed to call OpenAI moderation API', error);
    return { approved: true, cleanedText };
  }
};
