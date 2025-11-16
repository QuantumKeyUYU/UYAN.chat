# UYAN.chat — MVP

[![CI](https://github.com/QuantumKeyUYU/UYAN.chat/actions/workflows/ci.yml/badge.svg)](https://github.com/QuantumKeyUYU/UYAN.chat/actions/workflows/ci.yml)

Анонимная платформа взаимопомощи, где люди делятся переживаниями и получают эмоциональную поддержку.
Правило простое: **дай свет — получи свет.**

---

## Стек

* Next.js 14 (App Router, TypeScript)
* Tailwind CSS + Framer Motion
* React Hook Form, Zustand
* Postgres + Prisma — основной бэкенд для сообщений, ответов и жалоб
* OpenAI Moderation API (серверная AI-модерация)
* Firebase (legacy-слой для отдельных админ-инструментов, можно отключить)
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
* `/explore` — демо-подборка практик и ритуалов, работает даже без Firebase
* `/circle` — живая страница круга поддержки с in-memory данными
* `/debug` — статус бэкенда, ENV и Zustand-сторов
* `/healthz` — простой текстовый health-check (`ok`)

---

## Быстрый старт

```bash
npm install
cp .env.example .env.local # заполните значения

# поднимите Postgres (локально или в Docker) и обновите DATABASE_URL

npx prisma generate
npx prisma migrate dev
npm run dev
```

Приложение поднимется на [http://localhost:3000](http://localhost:3000). Prisma использует `DATABASE_URL` как единую точку подключения к Postgres.

### Скрипты качества

* `npm run lint` — ESLint (Next.js правила).
* `npm run typecheck` — строгая проверка TypeScript без генерации файлов.
* `npm run test` — быстрые smoke-тесты критичных утилит (`moderation`, `deviceHash`).
* `npm run build` — продакшен-сборка (используется и в CI).

---

## Переменные окружения

Используйте `.env.example` как шаблон — он содержит полный список переменных и комментарии.

Минимальный набор для разработки и продакшена:

* **DATABASE_URL** — строка подключения Postgres (используется Prisma).
* **DEVICE_ID_SALT** — соль для хеширования deviceId.
* **OPENAI_API_KEY** — серверная AI-модерация.

Дополнительно:

* `ADMIN_DASHBOARD_TOKEN`, `CRON_SECRET` — доступ к служебным роутам.
* `RATE_LIMIT_*` — настройка антиспама без релиза.
* Firebase (`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*`) — legacy-слой. Можно не задавать, если используете только Prisma-бэкенд.
* `NEXT_PUBLIC_DEBUG_DEVICE` — включает виджет отладки идентификатора устройства.

### Отладка и demo-режим

* Клиент один раз обращается к `/api/health`. Если ответ приходит — статус `online` и все страницы работают с Postgres/Prisma.
* Если бэкенд недоступен, UI переключается в **demo**: `/`, `/explore`, `/circle`, `/settings` и `/debug` продолжают работать на локальных данных.
* `src/components/providers/client-providers.tsx` хранит `backendStatus` (`online / demo / degraded / offline`) в Zustand. Бейдж в шапке и блок «Статус сервиса» в настройках используют эти данные.
* `/debug` показывает наличие переменных окружения, результат health-check и даёт ссылку на `/healthz`.
* `/healthz` возвращает `ok`; `/api/health` дополнительно выполняет `SELECT 1` через Prisma.

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
* `src/store/device.ts`, `src/store/stats.ts`, `src/store/settings.ts` — Zustand-слайсы для устройства, статистики и настроек

---

## API-роуты

* `POST /api/messages/create` — создать сообщение
* `GET /api/messages/random` — получить случайное сообщение для ответа
* `GET /api/messages/my` — мои сообщения
* `GET /api/messages/[id]` — одно сообщение по id
* `POST /api/responses/create` — создать ответ («свет»)
* `POST /api/reports/create` — пожаловаться на сообщение/ответ
* `GET /api/health` — служебный health-check (Postgres SELECT 1, OpenAI, cron-секрет)

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
