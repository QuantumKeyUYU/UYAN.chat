export type VocabularyPreset = 'core' | 'spark' | 'pulse' | 'note';

interface Vocabulary {
  message: string;
  reply: string;
  queue: string;
  garden: string;
  ctaWrite: string;
  ctaSupport: string;
  writeTitle: string;
  writeSubtitle: string;
  supportTitle: string;
  supportSubtitle: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
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
    garden: 'архив откликов',
    ctaWrite: 'Поделиться мыслью',
    ctaSupport: 'Откликнуться',
    writeTitle: 'Поделись тем, что внутри',
    writeSubtitle:
      'Напиши тёплую и честную мысль — от 10 до 280 символов. Это анонимно, без регистрации и всегда по-человечески.',
    supportTitle: 'Помоги услышать другого',
    supportSubtitle:
      'Выбери мысль в потоке и откликнись словами поддержки. Один тёплый абзац может изменить чей-то день.',
    homeHeroTitle: 'Интернет нового поколения: не про лайки и шум, а про нас.',
    homeHeroSubtitle:
      'Здесь можно честно написать, что у тебя внутри, и получить бережный отклик от незнакомых людей. Анонимно и по-человечески.',
    flow: {
      writeTitle: 'Поделиться мыслью',
      writeDescription: 'Опиши своё состояние коротко и честно — сообщество услышит тебя без оценок.',
      supportTitle: 'Откликнуться',
      supportDescription: 'Выбери мысль другого человека и напиши тёплый отклик, который поможет удержаться.',
      waitTitle: 'Подождать отклики',
      waitDescription: 'Загляни в раздел «Мои отклики», когда захочешь перечитать ответы для себя.',
      saveTitle: 'Сохранить важное',
      saveDescription: 'Сохраняй тёплые слова в «Мой свет» и возвращайся к ним, когда захочется поддержки.',
    },
  },
  spark: {
    message: 'искра',
    reply: 'эхо',
    queue: 'лента искр',
    garden: 'сад тёплых эх',
    ctaWrite: 'Зажечь искру',
    ctaSupport: 'Ответить эхом',
    writeTitle: 'Что за искра внутри?',
    writeSubtitle: 'Расскажи коротко о своём состоянии — от 10 до 280 символов. Здесь безопасно и бережно.',
    supportTitle: 'Поделись эхом поддержки',
    supportSubtitle: 'Выбери искру, прочитай её внимательно и ответь словами, которые согреют.',
    homeHeroTitle: 'Где искры находят тёплые эхо',
    homeHeroSubtitle:
      'Напиши о своём состоянии анонимно и получи искренний отклик. Перед этим откликнись на искру другого человека — так мы создаём круг поддержки.',
    flow: {
      writeTitle: 'Зажечь искру',
      writeDescription: 'Опиши своё состояние анонимно и коротко — эта искра запустит твой путь.',
      supportTitle: 'Ответить эхом',
      supportDescription: 'Выбери искру другого человека и подари своё тёплое эхо.',
      waitTitle: 'Ждать своё эхо',
      waitDescription: 'Следи за откликами в разделе «Мои отклики» — мы напомним, когда придёт ответ.',
      saveTitle: 'Собрать сад эх',
      saveDescription: 'Сохраняй важные слова в коллекции, чтобы возвращаться к ним, когда захочется тепла.',
    },
  },
  pulse: {
    message: 'пульс',
    reply: 'отклик',
    queue: 'поток пульсов',
    garden: 'коллекция откликов',
    ctaWrite: 'Отправить пульс',
    ctaSupport: 'Ответить откликом',
    writeTitle: 'Какой пульс момента?',
    writeSubtitle: 'Опиши своё состояние коротко — от 10 до 280 символов.',
    supportTitle: 'Поддержи откликом',
    supportSubtitle: 'Прочитай пульс и отправь живой отклик.',
    homeHeroTitle: 'Пространство живых пульсов',
    homeHeroSubtitle: 'Поделись своим состоянием и помоги другому почувствовать поддержку.',
    flow: {
      writeTitle: 'Отправить пульс',
      writeDescription: 'Опиши своё состояние коротко, чтобы сообщество услышало твой пульс.',
      supportTitle: 'Ответить откликом',
      supportDescription: 'Выбери пульс другого человека и пришли отклик.',
      waitTitle: 'Ждать свой отклик',
      waitDescription: 'Заглядывай в «Мои отклики» — мы напомним, когда придёт ответ.',
      saveTitle: 'Собрать коллекцию откликов',
      saveDescription: 'Сохраняй ценные отклики, чтобы возвращаться к ним позже.',
    },
  },
  note: {
    message: 'заметка',
    reply: 'ответ',
    queue: 'папка заметок',
    garden: 'коллекция ответов',
    ctaWrite: 'Оставить заметку',
    ctaSupport: 'Ответить письмом',
    writeTitle: 'Что хочется записать?',
    writeSubtitle: 'Собери мысли в короткую заметку — от 10 до 280 символов.',
    supportTitle: 'Ответь письмом',
    supportSubtitle: 'Прочитай заметку и подари письмо поддержки.',
    homeHeroTitle: 'Заметки и ответы рядом',
    homeHeroSubtitle: 'Расскажи о себе и поддержи кого-то ещё.',
    flow: {
      writeTitle: 'Оставить заметку',
      writeDescription: 'Запиши короткую заметку о своём состоянии — это начало пути.',
      supportTitle: 'Ответить письмом',
      supportDescription: 'Выбери заметку и напиши письмо поддержки.',
      waitTitle: 'Ждать ответ',
      waitDescription: 'Ответы появятся в разделе «Мои отклики» — мы напомним, когда они будут готовы.',
      saveTitle: 'Собрать коллекцию ответов',
      saveDescription: 'Сохраняй важные письма, чтобы перечитывать их позже.',
    },
  },
};

export const getVocabulary = (preset: VocabularyPreset = 'core'): Vocabulary => presets[preset] ?? presets.core;

export type { Vocabulary };
