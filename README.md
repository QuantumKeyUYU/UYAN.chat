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
npm run dev
```

Приложение поднимется на [http://localhost:3000](http://localhost:3000).

---

## Переменные окружения

Создайте файл `.env.local` и добавьте параметры Firebase (как минимум web-конфиг для клиентской части и сервисный аккаунт для админ SDK):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

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

---

## UX и безопасность действий

* Все деструктивные действия (сброс идентификатора, удаление данных устройства) проходят через компонент **`ConfirmDialog`**.
* Ошибки и успешные операции отображаются через **`Notice`**.
* Экспорт открыток из сада света защищён от повторных кликов по кнопке.

---

## Деплой

Проект готов к деплою на **Vercel**:

1. Подключите репозиторий к Vercel.
2. Задайте переменные окружения из разделов выше.
3. Сборка выполняется через стандартный `next build`.
