import type { MessageCategory } from '@/types/firestore';

export interface ModerationResult {
  approved: boolean;
  reasons?: string[];
  crisis?: boolean;
  cleanedText?: string;
  emotion?: MessageCategory;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL ?? 'omni-moderation-latest';
const EMOTION_MODEL = process.env.OPENAI_EMOTION_MODEL ?? 'gpt-4o-mini';

const phoneRegex =
  /(?:(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4})/g;
const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const urlRegex =
  /(?:(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[\w.#?=&%+-]*)?)/gi;
const addressRegex =
  /(\d{1,5}\s+\b(?:улица|ул\.|street|st\.|проспект|пр\.|avenue|ave\.|дорога|road|rd\.|lane|ln\.|drive|dr\.)\b[^.,\n]*)/gim;

const CRISIS_KEYWORDS = [
  'самоуб',
  'суицид',
  'умирать',
  'умереть',
  'повеситься',
  'покончить',
  'не хочу жить',
  'самоповреж',
  'cut myself',
  'kill myself',
  'take my life',
  'end my life',
  'i want to die',
  'hurt myself',
];

const EMOTION_OPTIONS: MessageCategory[] = [
  'anxiety',
  'sadness',
  'loneliness',
  'tiredness',
  'fear',
  'other',
];

type ModerationFlagResponse = {
  flagged: boolean;
  reasons?: string[];
};

const scrubPII = (text: string) => {
  return text
    .replace(phoneRegex, '[номер скрыт]')
    .replace(emailRegex, '[почта скрыта]')
    .replace(urlRegex, '[ссылка скрыта]')
    .replace(addressRegex, '[адрес скрыт]');
};

const hasCrisisSignal = (text: string) => {
  const normalized = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const callOpenAIModeration = async (text: string): Promise<ModerationFlagResponse> => {
  if (!OPENAI_API_KEY) {
    console.warn('[moderation] Missing OPENAI_API_KEY. Skipping OpenAI moderation call.');
    return { flagged: false };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODERATION_MODEL, input: text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[moderation] OpenAI moderation request failed', errorText);
      return { flagged: false, reasons: ['openai_error'] };
    }

    const payload = (await response.json()) as {
      results?: { flagged: boolean; categories?: Record<string, boolean> }[];
    };

    const flagged = payload.results?.some((result) => result.flagged) ?? false;

    return {
      flagged,
      reasons: flagged ? ['openai_flagged'] : undefined,
    };
  } catch (error) {
    console.error('[moderation] Failed to call OpenAI moderation', error);
    return { flagged: false, reasons: ['openai_error'] };
  }
};

const classifyEmotion = async (text: string): Promise<MessageCategory> => {
  if (!OPENAI_API_KEY) {
    return 'other';
  }

  try {
    const prompt = `Ты — эмпатичный модератор анонимного чата поддержки.\nОпредели основную эмоцию автора сообщения.\nВыбери только ОДНО слово из списка: ${EMOTION_OPTIONS.join(
      ', ',
    )}.\nЕсли сложно понять — ответь "other".\n\nТекст:\n"""${text}"""\n\nОтвет:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMOTION_MODEL,
        messages: [
          { role: 'system', content: 'Ты помогаешь классифицировать эмоции коротких сообщений.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[moderation] OpenAI emotion classification failed', errorText);
      return 'other';
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim().toLowerCase();
    const match = EMOTION_OPTIONS.find((option) => option === content);
    return match ?? 'other';
  } catch (error) {
    console.error('[moderation] Failed to classify emotion', error);
    return 'other';
  }
};

export const moderateText = async (text: string): Promise<ModerationResult> => {
  const trimmed = text.trim();
  const cleanedText = scrubPII(trimmed);
  const reasons: string[] = [];

  if (hasCrisisSignal(trimmed)) {
    return {
      approved: false,
      crisis: true,
      reasons: ['crisis_keywords'],
      cleanedText,
      emotion: 'other',
    };
  }

  const moderation = await callOpenAIModeration(cleanedText);
  if (moderation.reasons?.length) {
    reasons.push(...moderation.reasons);
  }

  if (moderation.flagged) {
    return {
      approved: false,
      reasons,
      crisis: false,
      cleanedText,
      emotion: 'other',
    };
  }

  const emotion = await classifyEmotion(cleanedText);

  return {
    approved: true,
    cleanedText,
    emotion,
    reasons: reasons.length ? reasons : undefined,
  };
};
