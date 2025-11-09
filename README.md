# UYAN.chat — MVP "Svetlya"

Анонимная платформа взаимопомощи, где люди делятся переживаниями и получают эмоциональную поддержку. Правило простое: дай свет — получи свет.

## Стек

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + Framer Motion
- React Hook Form, Zustand
- Firebase (Firestore, Auth anonymous через deviceId, Storage на будущее)

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение поднимется на [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Создайте файл `.env.local` и добавьте параметры Firebase (как минимум web-конфиг для клиентской части и сервисный аккаунт для админ SDK):

```
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

Опционально можно добавить ключ для модерации OpenAI (модуль `src/lib/moderation.ts` готов для замены заглушки).

## Основные страницы

- `/` — онбординг и выбор действия
- `/write` — форма отправки «тьмы»
- `/support` — подбор чужих сообщений и ответы-свет
- `/my` — мои сообщения и полученные ответы
- `/garden` — локальный «сад света» (сохранённые ответы)

## API-роуты

- `POST /api/messages/create`
- `GET /api/messages/random`
- `GET /api/messages/my`
- `GET /api/messages/[id]`
- `POST /api/responses/create`
- `POST /api/reports/create`

## Дополнительно

- deviceId хранится в `localStorage` (`src/lib/device.ts`)
- локальный сад света — в `src/lib/garden.ts`
- базовые UI-компоненты: `Button`, `Card`, `Modal`, `Input`, `Textarea`

Готово к деплою на Vercel — достаточно задать переменные окружения.
