import { NextRequest, NextResponse } from 'next/server';
import type { MessageCategory } from '@/types/firestore';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.OPENAI_SUGGESTION_MODEL ?? 'gpt-4o-mini';

const FALLBACK_SUGGESTIONS: Record<MessageCategory, string[]> = {
  anxiety: [
    'Я рядом и слышу тебя. Ты не один в своей тревоге.',
    'Давай просто подышим вместе, шаг за шагом.',
    'Ты уже сделал много, делясь этим. Это смело.',
    'Если станет тяжело, можно опереться на меня мысленно.',
  ],
  sadness: [
    'Мне жаль, что тебе так больно. Пусть моя тёплая мысль будет с тобой.',
    'Ты можешь дать себе время на переживания. Это нормально.',
    'Я вижу твою грусть и обнимаю словами издалека.',
    'Пусть хоть немного света найдёт дорогу к тебе сейчас.',
  ],
  loneliness: [
    'Я читаю тебя и остаюсь рядом. Ты важен.',
    'Спасибо, что поделился. В этом моменте мы вместе.',
    'Ты заслуживаешь присутствия и тепла, даже когда кажется иначе.',
    'Пусть мои слова будут тихим спутником рядом с тобой.',
  ],
  tiredness: [
    'Ты имеешь право устать. Давай просто посидим рядом.',
    'Я чувствую твою усталость и посылаю тебе немного сил.',
    'Можно замедлиться и заботиться о себе. Ты это заслужил.',
    'Мой тёплый свет рядом, чтобы поддержать тебя в паузе.',
  ],
  fear: [
    'Страшно — это тоже чувство, и ты не обязан справляться один.',
    'Я здесь мысленно держу тебя за руку. Можно шаг за шагом.',
    'Ты очень смелый, что поделился своим страхом.',
    'Пусть в сердце будет уголок, где тебе чуть спокойнее.',
  ],
  other: [
    'Я рядом, чтобы послушать и поддержать тебя.',
    'Спасибо, что доверился и поделился этим.',
    'Пусть моя тёплая мысль обнимет тебя сейчас.',
    'Ты не один. В этом пространстве есть свет для тебя.',
  ],
};

const buildPrompt = (messageText: string, category: MessageCategory) => `Ты — эмпатичный помощник в анонимном чате поддержки.\nТебе прислали сообщение от пользователя.\nТвоя задача — предложить четыре коротких варианта ответа (до 150 символов каждый).\nИспользуй тёплый, поддерживающий тон без советов и оценок.\nГовори по-русски, от первого лица, без сарказма.\nКатегория сообщения: ${category}.\nТекст: """${messageText}"""\nОтветь строго форматом JSON массива строк.`;

const parseSuggestions = (raw: string, category: MessageCategory) => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const suggestions = parsed
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 4);
      if (suggestions.length === 4) {
        return suggestions.map((s) => (s.length > 150 ? `${s.slice(0, 147)}...` : s));
      }
    }
  } catch (error) {
    console.warn('[generate-quick] Failed to parse suggestions', error);
  }
  return FALLBACK_SUGGESTIONS[category];
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
      return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS[category] }, { status: 200 });
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
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-quick] OpenAI request failed', errorText);
      return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS[category] }, { status: 200 });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const suggestions = parseSuggestions(content, category);

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('[generate-quick] Failed to generate suggestions', error);
    return NextResponse.json({ error: 'Не удалось получить предложения.' }, { status: 500 });
  }
}
