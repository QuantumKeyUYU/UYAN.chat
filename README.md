# UYAN.chat — MVP

[![CI](https://github.com/QuantumKeyUYU/UYAN.chat/actions/workflows/ci.yml/badge.svg)](https://github.com/QuantumKeyUYU/UYAN.chat/actions/workflows/ci.yml)

Анонимная платформа взаимопомощи, где люди делятся переживаниями и получают эмоциональную поддержку.
Правило простое: **дай свет — получи свет.**

---

## Стек

* Next.js 14 (App Router, TypeScript)
* Tailwind CSS + Framer Motion
* React Hook Form, Zustand
* Firebase (Firestore, анонимная Auth через deviceId, Storage — на будущее)
* OpenAI Moderation API (серверная AI-модерация)
* Деплой: Vercel

---

## Возможности

* Анонимно делиться «тьмой» — тяжёлыми мыслями и переживаниями.
* Отвечать другим людям поддерживающими сообщениями — давать «свет».
* Хранить важные ответы в локальном **Саду света** и делиться ими через открытки.
* Видеть анонимную статистику по своему пути в сервисе (по deviceId).
* Настроить опыт под себя: уменьшить анимации, очистить сад, сбросить идентификатор устройства или полностью удалить данные.

---

## Как пользоваться

1. **На главной** выберите «Начать путь света» — сервис создаст deviceId и покажет маршрут из четырёх шагов.
2. **На `/write`** поделитесь «тьмой»: единая форма подскажет лимит (10–280 символов), ошибки и таймер, если лимит исчерпан.
3. **На `/support`** поддержите другого человека — можно написать от себя или выбрать быстрый/ИИ-вариант. После отправки появится переход в «Мои огоньки».
4. **На `/my`** отслеживайте статус своих историй и ответы. Степпер подскажет, на каком этапе вы и что делать дальше.
5. **В `/garden`** сохраняйте ценные ответы в сад света и делитесь открытками, когда захочется вернуть тепло.

Каждый шаг снабжён визуальными подсказками, таймерами антиспама и понятными ошибками. Даже если вернуться позже, «Мои огоньки» покажут, сколько света уже в пути.

---

## Навигация

* `/` — онбординг и выбор действия
* `/write` — форма отправки «тьмы»
* `/support` — подбор чужих сообщений и ответы-свет
* `/my` — мои сообщения и полученные ответы
* `/garden` — локальный «сад света» (сохранённые ответы + открытки)
* `/settings` — настройки анимаций и данных устройства

---

## Быстрый старт

```bash
npm install
cp .env.example .env.local # заполните значения
npm run dev
```

Приложение поднимется на [http://localhost:3000](http://localhost:3000).

### Скрипты качества

* `npm run lint` — ESLint (Next.js правила).
* `npm run typecheck` — строгая проверка TypeScript без генерации файлов.
* `npm run test` — быстрые smoke-тесты критичных утилит (`moderation`, `deviceHash`).
* `npm run build` — продакшен-сборка (используется и в CI).

---

## Переменные окружения

Используйте `.env.example` как шаблон — он содержит полный список переменных и комментарии.

Минимальный набор для разработки и продакшена:

* **Firebase web config** (`NEXT_PUBLIC_FIREBASE_*`) — можно взять в [Firebase Console → Project settings → General](https://console.firebase.google.com/).
* **Firebase Admin** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — сервисный аккаунт с правами на Firestore.
* **OpenAI** (`OPENAI_API_KEY`, опционально `OPENAI_ASSIST_MODEL` / `OPENAI_SUGGESTION_MODEL`).
* **Секреты приложения**: `DEVICE_ID_SALT`, `ADMIN_DASHBOARD_TOKEN`, `CRON_SECRET`.
* (Опционально) `NEXT_PUBLIC_DEBUG_DEVICE` — включает виджет отладки идентификатора устройства.

Для мягкого антиспама лимиты можно настраивать через ENV, без деплоя:

* `RATE_LIMIT_MESSAGE_PER_HOUR` и `RATE_LIMIT_MESSAGE_WINDOW_MINUTES`
* `RATE_LIMIT_RESPONSE_PER_HOUR` и `RATE_LIMIT_RESPONSE_WINDOW_MINUTES`
* `RATE_LIMIT_REPORT_PER_DAY` и `RATE_LIMIT_REPORT_WINDOW_MINUTES`

---

## AI-модерация

В проекте используется серверная AI-модерация на базе OpenAI Moderation API.
Для работы необходимо задать переменную окружения:

```bash
OPENAI_API_KEY=...
```

Модерация выполняется **только на сервере**; клиентский код напрямую с OpenAI не взаимодействует.

---

## Архитектура

* `src/app` — роуты и страницы (App Router)
* `src/components/ui` — базовые UI-компоненты (`Button`, `Card`, `Modal`, `Notice`, `ConfirmDialog`, `Input`, `Textarea` и др.)
* `src/components/ShareCard.tsx` — открытки для шаринга ответов из сада света
* `src/lib` — работа с Firebase, deviceId, локальным садом (`device.ts`, `garden.ts`, `motion.ts` и др.)
* `src/store/useAppStore.ts` — Zustand-хранилище для глобального состояния (deviceId, статистика, настройки)

---

## API-роуты

* `POST /api/messages/create` — создать сообщение
* `GET /api/messages/random` — получить случайное сообщение для ответа
* `GET /api/messages/my` — мои сообщения
* `GET /api/messages/[id]` — одно сообщение по id
* `POST /api/responses/create` — создать ответ («свет»)
* `POST /api/reports/create` — пожаловаться на сообщение/ответ
* `GET /api/health` — служебный health-check (Firebase, OpenAI, cron-секрет)

---

## UX и безопасность действий

* Все деструктивные действия (сброс идентификатора, удаление данных устройства) проходят через компонент **`ConfirmDialog`**.
* Ошибки и успешные операции отображаются через **`Notice`**.
* Экспорт открыток из сада света защищён от повторных кликов по кнопке.

---

## Деплой

Проект рассчитан на деплой на **Vercel**:

1. Подключите репозиторий к Vercel (Production + Preview окружения).
2. В разделе **Environment Variables** заполните значения из `.env.example` (включая `CRON_SECRET` и `ADMIN_DASHBOARD_TOKEN`).
3. При необходимости отрегулируйте `RATE_LIMIT_*` переменные — они конфигурируют антиспам без релизов.
4. Для Cron Job используйте `vercel.json` — Vercel будет дергать `POST /api/tasks/cleanup` раз в сутки; секрет авторизации должен совпадать с `CRON_SECRET`.
5. Подключите мониторинг к `GET /api/health` (ожидаемый статус 200 при корректной конфигурации).
6. Сборка по умолчанию — `npm run build` (Next.js 14).

## CI

GitHub Actions (`.github/workflows/ci.yml`) запускает `npm run lint`, `npm run typecheck`, `npm run test` и `npm run build` при push/PR. Перед отправкой изменений прогоните те же команды локально.
