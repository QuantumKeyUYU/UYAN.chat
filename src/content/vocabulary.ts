export type VocabularyPreset = 'core' | 'spark' | 'pulse' | 'note';

interface Vocabulary {
  message: string;
  reply: string;
  queue: string;
  garden: string;
  settings: string;
  ctaWrite: string;
  ctaWriteShort: string;
  ctaWriteHero: string;
  ctaSupport: string;
  writeTitle: string;
  writeSubtitle: string;
  supportTitle: string;
  supportSubtitle: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  homeHeroTaglineTitle: string;
  homeHeroTaglineSubtitle: string;
  homeFooterHint: string;
  flow: {
    writeTitle: string;
    writeDescription: string;
    supportTitle: string;
    supportDescription: string;
    waitTitle: string;
    waitDescription: string;
    saveTitle: string;
    saveDescription: string;
  };
}

const presets: Record<VocabularyPreset, Vocabulary> = {
  core: {
    message: 'мысль',
    reply: 'отклик',
    queue: 'поток мыслей',
    garden: 'Сохранённое',
    settings: 'Настройки',
    ctaWrite: 'Отправить мысль',
    ctaWriteShort: 'Отправить мысль',
    ctaWriteHero: 'Отправить мысль',
    ctaSupport: 'Откликнуться',
    writeTitle: 'Поделись тем, что внутри',
    writeSubtitle:
      'Напиши тёплую и честную мысль — от 10 до 280 символов. Это анонимно, без регистрации и всегда по-человечески.',
    supportTitle: 'Откликнуться',
    supportSubtitle:
      'Выбирай мысль другого человека и отвечай ему тёплыми словами. Твои слова могут стать тем, что поможет выдержать день.',
    homeHeroTitle: 'Когда не с кем поговорить,\nно молчать больше невозможно.',
    homeHeroSubtitle:
      'Здесь можно честно написать, что у тебя внутри, и получить бережный отклик от незнакомых людей. Анонимно и по-человечески.',
    homeHeroTaglineTitle: 'Интернет без гонки за лайками',
    homeHeroTaglineSubtitle: '',
    homeFooterHint: 'Нужно перенести архив или выключить анимации? Всё это — в «Настройках».',
    flow: {
      writeTitle: 'Отправить мысль',
      writeDescription: 'Коротко расскажи о своём состоянии. Здесь тебя не оценивают, а слушают.',
      supportTitle: 'Откликнуться',
      supportDescription: 'Выбирай мысль другого человека и отвечай ему тёплыми словами поддержки.',
      waitTitle: 'Подождать отклики',
      waitDescription: 'Сообщество прочитает твою историю и ответит тёплыми словами поддержки.',
      saveTitle: 'Сохранить важное',
      saveDescription: 'Отмечай ценные отклики и находи их позже в разделе «Сохранённое».',
    },
  },
  spark: {
    message: 'искра',
    reply: 'эхо',
    queue: 'лента искр',
    garden: 'Сохранённое',
    settings: 'Настройки',
    ctaWrite: 'Зажечь искру',
    ctaWriteShort: 'Зажечь искру',
    ctaWriteHero: 'Зажечь искру',
    ctaSupport: 'Ответить эхом',
    writeTitle: 'Что за искра внутри?',
    writeSubtitle: 'Расскажи коротко о своём состоянии — от 10 до 280 символов. Здесь безопасно и бережно.',
    supportTitle: 'Поделись эхом поддержки',
    supportSubtitle: 'Выбери искру, прочитай её внимательно и ответь словами, которые согреют.',
    homeHeroTitle: 'Где искры находят тёплые эхо',
    homeHeroSubtitle:
      'Напиши о своём состоянии анонимно и получи искренний отклик. Перед этим откликнись на искру другого человека — так мы создаём круг поддержки.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    flow: {
      writeTitle: 'Зажечь искру',
      writeDescription: 'Опиши своё состояние анонимно и коротко — эта искра запустит твой путь.',
      supportTitle: 'Ответить эхом',
      supportDescription: 'Выбери искру другого человека и подари своё тёплое эхо.',
      waitTitle: 'Ждать своё эхо',
      waitDescription: 'Следи за откликами в разделе «Мои отклики» — мы напомним, когда придёт ответ.',
      saveTitle: 'Собрать сад эх',
      saveDescription: 'Собирай важные слова в «Сохранённом», чтобы возвращаться к ним, когда захочется тепла.',
    },
  },
  pulse: {
    message: 'пульс',
    reply: 'отклик',
    queue: 'поток пульсов',
    garden: 'Сохранённое',
    settings: 'Настройки',
    ctaWrite: 'Отправить пульс',
    ctaWriteShort: 'Отправить пульс',
    ctaWriteHero: 'Отправить пульс',
    ctaSupport: 'Ответить откликом',
    writeTitle: 'Какой пульс момента?',
    writeSubtitle: 'Опиши своё состояние коротко — от 10 до 280 символов.',
    supportTitle: 'Поддержи откликом',
    supportSubtitle: 'Прочитай пульс и отправь живой отклик.',
    homeHeroTitle: 'Пространство живых пульсов',
    homeHeroSubtitle: 'Поделись своим состоянием и помоги другому почувствовать поддержку.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    flow: {
      writeTitle: 'Отправить пульс',
      writeDescription: 'Опиши своё состояние коротко, чтобы сообщество услышало твой пульс.',
      supportTitle: 'Ответить откликом',
      supportDescription: 'Выбери пульс другого человека и пришли отклик.',
      waitTitle: 'Ждать свой отклик',
      waitDescription: 'Заглядывай в «Мои отклики» — мы напомним, когда придёт ответ.',
      saveTitle: 'Собрать коллекцию откликов',
      saveDescription: 'Сохраняй ценные отклики в «Сохранённом», чтобы возвращаться к ним позже.',
    },
  },
  note: {
    message: 'заметка',
    reply: 'ответ',
    queue: 'папка заметок',
    garden: 'Сохранённое',
    settings: 'Настройки',
    ctaWrite: 'Оставить заметку',
    ctaWriteShort: 'Оставить заметку',
    ctaWriteHero: 'Оставить заметку',
    ctaSupport: 'Ответить письмом',
    writeTitle: 'Что хочется записать?',
    writeSubtitle: 'Собери мысли в короткую заметку — от 10 до 280 символов.',
    supportTitle: 'Ответь письмом',
    supportSubtitle: 'Прочитай заметку и подари письмо поддержки.',
    homeHeroTitle: 'Заметки и ответы рядом',
    homeHeroSubtitle: 'Расскажи о себе и поддержи кого-то ещё.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    flow: {
      writeTitle: 'Оставить заметку',
      writeDescription: 'Запиши короткую заметку о своём состоянии — это начало пути.',
      supportTitle: 'Ответить письмом',
      supportDescription: 'Выбери заметку и напиши письмо поддержки.',
      waitTitle: 'Ждать ответ',
      waitDescription: 'Ответы появятся в разделе «Мои отклики» — мы напомним, когда они будут готовы.',
      saveTitle: 'Собрать коллекцию ответов',
      saveDescription: 'Сохраняй важные письма в «Сохранённом», чтобы перечитывать их позже.',
    },
  },
};

export const getVocabulary = (preset: VocabularyPreset = 'core'): Vocabulary => presets[preset] ?? presets.core;

export type { Vocabulary };
