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
  homeTileWriteTitle: string;
  homeTileWriteBody: string;
  homeTileSupportTitle: string;
  homeTileSupportBody: string;
  homeTileAnswersTitle: string;
  homeTileAnswersBody: string;
  writeTitle: string;
  writeSubtitle: string;
  writeInfoBlock: string;
  writeFieldLabel: string;
  supportTitle: string;
  supportSubtitle: string;
  supportPageHelper: string;
  supportPageAnonNote: string;
  supportPageLookingFor: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  homeHeroTaglineTitle: string;
  homeHeroTaglineSubtitle: string;
  homeFooterHint: string;
  statsTodayTitle: string;
  statsTodaySubtitle: string;
  statsTotalTitle: string;
  statsTotalSubtitle: string;
  statsTotalRepliesLabel: string;
  statsWaitingTitle: string;
  statsWaitingSubtitle: string;
  answersPageTitle: string;
  answersPageSubtitle: string;
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
    reply: 'ответ',
    queue: 'поток мыслей',
    garden: 'Ответы',
    settings: 'Настройки',
    ctaWrite: 'Поделиться тем, что внутри',
    ctaWriteShort: 'Поделиться',
    ctaWriteHero: 'Поделиться тем, что внутри',
    ctaSupport: 'Поддержать кого-то',
    homeTileWriteTitle: 'Поделиться',
    homeTileWriteBody:
      'Напиши честно, как тебе сейчас. Здесь слышат без оценок, без имён и логинов.',
    homeTileSupportTitle: 'Поддержать кого-то',
    homeTileSupportBody:
      'Выбери историю другого человека и ответь на неё несколькими тёплыми фразами.',
    homeTileAnswersTitle: 'Ответы для тебя',
    homeTileAnswersBody:
      'Сохрани слова поддержки, которые помогают держаться в тяжёлые дни.',
    writeTitle: 'Поделиться тем, что внутри',
    writeSubtitle:
      'Напиши пару честных предложений о том, как тебе сейчас. Твоя мысль анонимно попадёт к человеку, который захочет поддержать тебя.',
    writeInfoBlock:
      'Ты не просишь «спасти тебя» — ты даёшь шанс кому-то проявить заботу. Никаких имён, контактов и логинов — только текст. Отклик может прийти не сразу — это нормально: людям нужно время, чтобы найти слова.',
    writeFieldLabel: 'Твоя история',
    supportTitle: 'Поддержать',
    supportSubtitle:
      'Здесь собраны мысли людей, которым сейчас особенно нужна опора. Выбери одну и ответь на неё несколькими тёплыми фразами.',
    supportPageHelper:
      'Не нужно быть психологом — достаточно быть внимательным человеком. Увидь чужую историю, отнесись бережно и напиши по-человечески.',
    supportPageAnonNote:
      'Каждая история анонимна. Ответ тоже остаётся без имени: никаких контактов, только слова поддержки.',
    supportPageLookingFor: 'Один внимательный ответ лучше, чем десять быстрых реакций.',
    homeHeroTitle: 'Пространство взаимной поддержки без имён и оценок',
    homeHeroSubtitle:
      'Здесь можно честно написать, как тебе на самом деле, и так же честно поддержать другого. Без лайков и гонки за вниманием — только анонимные письма поддержки.',
    homeHeroTaglineTitle: 'Сила в связи, а не в жалости',
    homeHeroTaglineSubtitle: 'Ты делишься — кто-то отвечает. Ты поддерживаешь — кому-то становится легче.',
    homeFooterHint: 'Нужно перенести архив или настроить тишину уведомлений? Загляни в «Настройки».',
    statsTodayTitle: 'Сегодня',
    statsTodaySubtitle: 'мыслей появилось за последние 24 часа',
    statsTotalTitle: 'Всего мыслей',
    statsTotalSubtitle: 'историй, которыми поделились',
    statsTotalRepliesLabel: 'ответов',
    statsWaitingTitle: 'В очереди на ответ',
    statsWaitingSubtitle: 'историй сейчас ждут поддержки',
    answersPageTitle: 'Связи, которые ты создаёшь',
    answersPageSubtitle:
      'Возвращайся к письмам поддержки, которые помогают держаться, и смотри, как твои слова откликаются другим.',
    flow: {
      writeTitle: 'Ты делишься мыслью',
      writeDescription: 'Короткий текст вместо имени и контактов — просто рассказ, как тебе сейчас.',
      supportTitle: 'Ты поддерживаешь других',
      supportDescription: 'Открой раздел «Поддержать» и выбери историю, чтобы ответить ей тёплыми словами.',
      waitTitle: 'Кто-то отвечает тебе',
      waitDescription: 'Один человек прочитает твою историю и постарается поддержать, как друга.',
      saveTitle: 'Ответы — важные слова',
      saveDescription: 'Отмечай ответы, которые помогают держаться, и возвращайся к ним в разделе «Ответы».',
    },
  },
  spark: {
    message: 'искра',
    reply: 'эхо',
    queue: 'лента искр',
    garden: 'Ответы',
    settings: 'Настройки',
    ctaWrite: 'Зажечь искру',
    ctaWriteShort: 'Зажечь искру',
    ctaWriteHero: 'Зажечь искру',
    ctaSupport: 'Ответить эхом',
    homeTileWriteTitle: 'Зажечь искру',
    homeTileWriteBody: 'Расскажи коротко о своём состоянии — здесь слышат без оценок.',
    homeTileSupportTitle: 'Поддержать',
    homeTileSupportBody: 'Выбери искру и ответь на неё тёплым эхом поддержки.',
    homeTileAnswersTitle: 'Ответы',
    homeTileAnswersBody: 'Возвращайся к тёплым эхом и смотри, как ты делишься поддержкой.',
    writeTitle: 'Что за искра внутри?',
    writeSubtitle: 'Расскажи коротко о своём состоянии — от 10 до 280 символов. Здесь безопасно и бережно.',
    writeInfoBlock:
      'Мы видим только текст — никаких имён и контактов. Твою искру прочитает живой человек из сообщества. Эхо может прийти не сразу — это нормально.',
    writeFieldLabel: 'Твоя искра',
    supportTitle: 'Поделись эхом поддержки',
    supportSubtitle: 'Выбери искру, прочитай её внимательно и ответь словами, которые согреют.',
    supportPageHelper:
      'Выбери одну искру и ответь на неё несколькими тёплыми фразами — твоё эхо может поддержать чей-то день.',
    supportPageAnonNote: 'Каждая искра анонимна. Эхо тоже остаётся без имени.',
    supportPageLookingFor: 'Ищем искру, которой особенно нужно тёплое эхо.',
    homeHeroTitle: 'Где искры находят тёплые эхо',
    homeHeroSubtitle:
      'Напиши о своём состоянии анонимно и получи искренний отклик. Перед этим откликнись на искру другого человека — так мы создаём круг поддержки.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    statsTodayTitle: 'Сегодня',
    statsTodaySubtitle: 'искр появилось за последние 24 часа',
    statsTotalTitle: 'Всего искр',
    statsTotalSubtitle: 'историй, которыми поделились',
    statsTotalRepliesLabel: 'эхо',
    statsWaitingTitle: 'В очереди на эхо',
    statsWaitingSubtitle: 'искр сейчас ждут поддержки',
    answersPageTitle: 'Ответы',
    answersPageSubtitle:
      'Возвращайся к тёплым эхом и следи за словами поддержки, которыми ты делишься.',
    flow: {
      writeTitle: 'Зажечь искру',
      writeDescription: 'Опиши своё состояние анонимно и коротко — эта искра запустит твой путь.',
      supportTitle: 'Ответить эхом',
      supportDescription: 'Выбери искру другого человека и подари своё тёплое эхо.',
      waitTitle: 'Ждать своё эхо',
      waitDescription: 'Следи за эхом в разделе «Мои ответы» — мы напомним, когда придёт ответ.',
      saveTitle: 'Собрать сад эх',
      saveDescription: 'Собирай важные слова в «Ответах», чтобы возвращаться к ним, когда захочется тепла.',
    },
  },
  pulse: {
    message: 'пульс',
    reply: 'отклик',
    queue: 'поток пульсов',
    garden: 'Ответы',
    settings: 'Настройки',
    ctaWrite: 'Отправить пульс',
    ctaWriteShort: 'Отправить пульс',
    ctaWriteHero: 'Отправить пульс',
    ctaSupport: 'Ответить откликом',
    homeTileWriteTitle: 'Отправить пульс',
    homeTileWriteBody: 'Опиши своё состояние коротко — здесь слышат внимательное сердце.',
    homeTileSupportTitle: 'Поддержать',
    homeTileSupportBody: 'Выбери пульс другого человека и ответь живым откликом поддержки.',
    homeTileAnswersTitle: 'Ответы',
    homeTileAnswersBody: 'Возвращайся к откликам, которые греют, и следи за словами поддержки, которыми делишься.',
    writeTitle: 'Какой пульс момента?',
    writeSubtitle: 'Опиши своё состояние коротко — от 10 до 280 символов.',
    writeInfoBlock:
      'Мы видим только текст — никаких имён и контактов. Твой пульс читает живой человек. Отклик может прийти не сразу — это нормально.',
    writeFieldLabel: 'Твой пульс',
    supportTitle: 'Поддержи откликом',
    supportSubtitle: 'Прочитай пульс и отправь живой отклик.',
    supportPageHelper:
      'Выбери один пульс и ответь на него несколькими тёплыми фразами — один отклик может поддержать чей-то день.',
    supportPageAnonNote: 'Каждый пульс анонимен. Отклик тоже остаётся без имени.',
    supportPageLookingFor: 'Ищем пульс, которому особенно важно быть услышанным.',
    homeHeroTitle: 'Пространство живых пульсов',
    homeHeroSubtitle: 'Поделись своим состоянием и помоги другому почувствовать поддержку.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    statsTodayTitle: 'Сегодня',
    statsTodaySubtitle: 'пульсов появилось за последние 24 часа',
    statsTotalTitle: 'Всего пульсов',
    statsTotalSubtitle: 'историй, которыми поделились',
    statsTotalRepliesLabel: 'откликов',
    statsWaitingTitle: 'В очереди на отклик',
    statsWaitingSubtitle: 'пульсов сейчас ждут поддержки',
    answersPageTitle: 'Ответы',
    answersPageSubtitle:
      'Возвращайся к откликам, которые греют, и следи за словами поддержки, которыми ты делишься.',
    flow: {
      writeTitle: 'Отправить пульс',
      writeDescription: 'Опиши своё состояние коротко, чтобы сообщество услышало твой пульс.',
      supportTitle: 'Ответить откликом',
      supportDescription: 'Выбери пульс другого человека и пришли отклик.',
      waitTitle: 'Ждать свой отклик',
      waitDescription: 'Заглядывай в «Мои ответы» — мы напомним, когда придёт отклик.',
      saveTitle: 'Собрать коллекцию откликов',
      saveDescription: 'Сохраняй ценные отклики в «Ответах», чтобы возвращаться к ним позже.',
    },
  },
  note: {
    message: 'заметка',
    reply: 'ответ',
    queue: 'папка заметок',
    garden: 'Ответы',
    settings: 'Настройки',
    ctaWrite: 'Оставить заметку',
    ctaWriteShort: 'Оставить заметку',
    ctaWriteHero: 'Оставить заметку',
    ctaSupport: 'Ответить письмом',
    homeTileWriteTitle: 'Оставить заметку',
    homeTileWriteBody: 'Запиши, что чувствуешь прямо сейчас. Здесь слушают внимательно и без оценок.',
    homeTileSupportTitle: 'Поддержать',
    homeTileSupportBody: 'Выбери заметку другого человека и ответь письмом поддержки.',
    homeTileAnswersTitle: 'Ответы',
    homeTileAnswersBody: 'Возвращайся к письмам, которые греют, и следи за словами поддержки, которыми делишься.',
    writeTitle: 'Что хочется записать?',
    writeSubtitle: 'Собери мысли в короткую заметку — от 10 до 280 символов.',
    writeInfoBlock:
      'Мы видим только текст — никаких имён и контактов. Твою заметку прочитает живой человек из сообщества. Ответ может прийти не сразу — это нормально.',
    writeFieldLabel: 'Твоя заметка',
    supportTitle: 'Ответь письмом',
    supportSubtitle: 'Прочитай заметку и подари письмо поддержки.',
    supportPageHelper:
      'Выбери одну заметку и ответь на неё несколькими тёплыми фразами — одного письма иногда достаточно, чтобы выдержать день.',
    supportPageAnonNote: 'Каждая заметка анонимна. Письмо тоже остаётся без имени.',
    supportPageLookingFor: 'Ищем заметку, которой особенно важно быть услышанной.',
    homeHeroTitle: 'Заметки и ответы рядом',
    homeHeroSubtitle: 'Расскажи о себе и поддержи кого-то ещё.',
    homeHeroTaglineTitle: 'Пространство нового поколения',
    homeHeroTaglineSubtitle: 'Интернет без лайков и шума, который мы создаём вместе.',
    homeFooterHint: 'Перенести архив или настроить анимации можно в «Настройках».',
    statsTodayTitle: 'Сегодня',
    statsTodaySubtitle: 'заметок появилось за последние 24 часа',
    statsTotalTitle: 'Всего заметок',
    statsTotalSubtitle: 'историй, которыми поделились',
    statsTotalRepliesLabel: 'ответов',
    statsWaitingTitle: 'В очереди на ответ',
    statsWaitingSubtitle: 'заметок сейчас ждут поддержки',
    answersPageTitle: 'Ответы',
    answersPageSubtitle:
      'Возвращайся к письмам, которые греют, и следи за словами поддержки, которыми ты делишься.',
    flow: {
      writeTitle: 'Оставить заметку',
      writeDescription: 'Запиши короткую заметку о своём состоянии — это начало пути.',
      supportTitle: 'Ответить письмом',
      supportDescription: 'Выбери заметку и напиши письмо поддержки.',
      waitTitle: 'Ждать ответ',
      waitDescription: 'Ответы появятся в разделе «Мои ответы» — мы напомним, когда они будут готовы.',
      saveTitle: 'Собрать коллекцию ответов',
      saveDescription: 'Сохраняй важные письма в «Ответах», чтобы перечитывать их позже.',
    },
  },
};

export const getVocabulary = (preset: VocabularyPreset = 'core'): Vocabulary => presets[preset] ?? presets.core;

export type { Vocabulary };
