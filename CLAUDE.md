# CLAUDE.md — AI Chat

## Обзор

Next.js 15 чат-приложение с Groq LLM бэкендом и поддержкой MCP-инструментов. Интерфейс на русском языке.

## Команды

```bash
npm run dev    # Dev-сервер (Turbopack, порт 3000)
npm run build  # Продакшн-сборка
npm run start  # Запуск продакшн-сервера
npm run lint   # ESLint
```

## Архитектура

- **App Router** — все страницы и API в `src/app/`
- **Клиентские компоненты** — используют директиву `"use client"`
- **API-роуты** — `src/app/api/` (chat, mcp-tools, transcribe, tts)
- **Типы** — `src/types/chat.ts`
- **Константы** — `src/constants/models.ts`
- **Хуки** — `src/hooks/` (use-chat, use-voice, use-mcp-servers, use-auto-scroll, use-click-outside)
- **Компоненты** — `src/components/` (chat-header, chat-input, message-bubble, message-content, mcp-settings, empty-state)
- **Утилиты** — `src/lib/` (mcp.ts — MCP-клиент, parse-message.ts — парсинг сообщений)

## Ключевые паттерны

- **Стриминг**: API chat возвращает `ReadableStream`, клиент читает через `getReader()`
- **MCP агентный цикл**: до 5 итераций tool-calling перед финальным ответом (chat/route.ts)
- **Маркеры в потоке**: `[tool:name]` и `[mcp_error:msg]` — парсятся в `parseMessageParts()`
- **MCP-конфиг**: сохраняется в `localStorage`
- **Имена инструментов**: санитизируются для Groq (только `[a-zA-Z0-9_-]`, макс 64 символа)

## Переменные окружения

- `GROQ_API_KEY` (обязательно) — доступ к Groq API
- `ELEVENLABS_API_KEY` (опционально) — TTS
- `OPENAI_API_KEY` (опционально) — эмбеддинги для RAG
- `GOOGLE_API_KEY`, `XAI_API_KEY` (опционально) — доп. провайдеры
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (опционально) — Telegram-бот
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (опционально) — email через Resend

## Стиль кода

- TypeScript strict mode
- Tailwind CSS 4 для стилей (без CSS-модулей)
- Функциональные компоненты с хуками
- Именованные экспорты для компонентов, типов, хуков
- Default export только для `page.tsx` (конвенция Next.js)
- UI-текст на русском языке
