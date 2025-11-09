import { NextRequest, NextResponse } from 'next/server';
import type { MessageCategory } from '@/types/firestore';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.OPENAI_ASSIST_MODEL ?? 'gpt-4o-mini';

const FALLBACK_VARIANTS = (messageText: string) => [
  {
    tone: 'empathy' as const,
    text: 'Я рядом и слышу тебя. Давай просто побудем в этой тишине вместе.',
  },
  {
    tone: 'hope' as const,
    text: 'Вижу, как непросто. Но даже сейчас есть лучик, который ищет тебя. Я верю, что ты его почувствуешь.',
  },
];

const buildPrompt = (messageText: string, category: MessageCategory) => `Ты — эмпатичный помощник в анонимном чате поддержки.\nТвоя задача — предложить два варианта ответа: один в тоне эмпатии ("empathy"), другой — в тоне надежды ("hope").\nКаждый вариант до 200 символов. Без советов, без сарказма, по-русски, от первого лица.\nКатегория: ${category}.\nТекст: """${messageText}"""\nОтветь строго JSON массивом вида [{"tone": "empathy", "text": "..."}, {"tone": "hope", "text": "..."}].`;

const parseVariants = (
  raw: string,
): { tone: 'empathy' | 'hope'; text: string }[] | null => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const variants = parsed
        .filter(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            (item.tone === 'empathy' || item.tone === 'hope') &&
            typeof item.text === 'string',
        )
        .map((item) => ({ tone: item.tone as 'empathy' | 'hope', text: (item.text as string).trim() }))
        .map((item) => ({
          ...item,
          text: item.text.length > 200 ? `${item.text.slice(0, 197)}...` : item.text,
        }));
      if (variants.length === 2) {
        return variants;
      }
    }
  } catch (error) {
    console.warn('[ai-assist] Failed to parse variants', error);
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageText, category } = body as {
      messageText?: string;
      category?: MessageCategory;
    };

    if (!messageText || !category) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ variants: FALLBACK_VARIANTS(messageText) }, { status: 200 });
    }

    const prompt = buildPrompt(messageText, category);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: 'Ты помогаешь людям формулировать поддерживающие ответы.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-assist] OpenAI request failed', errorText);
      return NextResponse.json({ variants: FALLBACK_VARIANTS(messageText) }, { status: 200 });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const variants = parseVariants(content);

    if (!variants) {
      return NextResponse.json({ variants: FALLBACK_VARIANTS(messageText) }, { status: 200 });
    }

    return NextResponse.json({ variants }, { status: 200 });
  } catch (error) {
    console.error('[ai-assist] Failed to generate variants', error);
    return NextResponse.json({ error: 'Не удалось получить варианты.' }, { status: 500 });
  }
}
