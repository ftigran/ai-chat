# AI Chat

AI-чат приложение с интеграцией Groq LLM, поддержкой MCP-инструментов и голосовым вводом/выводом.

## Возможности

- **Мультимодельный чат** — поддержка нескольких моделей Groq (Llama 3.3 70B, Llama 3.1 8B, Qwen 3 32B)
- **MCP (Model Context Protocol)** — подключение внешних инструментов через MCP-серверы
- **Голосовой ввод** — распознавание речи через Groq Whisper
- **Озвучка ответов** — Text-to-Speech через ElevenLabs
- **Стриминг** — потоковый вывод ответов в реальном времени
- **Агентный цикл** — до 5 итераций вызова инструментов перед финальным ответом

## Стек технологий

- **Next.js 15** (App Router, Turbopack)
- **React 19**, TypeScript
- **Tailwind CSS 4**
- **Groq API** (OpenAI-совместимый)
- **MCP SDK** для интеграции инструментов
- **ElevenLabs** для TTS

## Начало работы

### Требования

- Node.js 18+
- npm

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/ftigran/ai-chat.git
cd ai-chat

# Установить зависимости
npm install

# Скопировать и заполнить переменные окружения
cp .env.example .env.local

# Запустить dev-сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

### Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните ключи API. Обязателен только `GROQ_API_KEY`, остальные — опциональны.

## Структура проекта

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Главная страница чата
│   ├── layout.tsx         # Корневой layout
│   └── api/               # API-роуты
│       ├── chat/          # Стриминг чата с MCP
│       ├── mcp-tools/     # Список MCP-инструментов
│       ├── transcribe/    # Speech-to-Text (Groq Whisper)
│       └── tts/           # Text-to-Speech (ElevenLabs)
├── components/            # React-компоненты
│   ├── chat-header.tsx    # Шапка с выбором модели и MCP
│   ├── chat-input.tsx     # Поле ввода, голос, отправка
│   ├── message-bubble.tsx # Пузырь сообщения с TTS
│   ├── message-content.tsx# Рендер частей сообщения
│   ├── mcp-settings.tsx   # Настройки MCP-серверов
│   └── empty-state.tsx    # Заглушка пустого чата
├── hooks/                 # Кастомные хуки
│   ├── use-chat.ts        # Логика отправки/стриминга
│   ├── use-voice.ts       # Запись и озвучка
│   ├── use-mcp-servers.ts # Управление MCP-серверами
│   ├── use-auto-scroll.ts # Автоскролл
│   └── use-click-outside.ts # Клик за пределами элемента
├── constants/             # Константы
│   └── models.ts          # Доступные модели
├── types/                 # TypeScript-типы
│   └── chat.ts            # McpServer, Message, MessagePart
└── lib/                   # Утилиты
    ├── mcp.ts             # MCP-клиент и вызов инструментов
    └── parse-message.ts   # Парсинг частей сообщения
```

## MCP-интеграция

Нажмите на иконку настроек в шапке, чтобы добавить MCP-серверы. После подключения LLM получит доступ к инструментам сервера и сможет вызывать их автоматически.

## API-роуты

| Роут | Метод | Описание |
|------|-------|----------|
| `/api/chat` | POST | Стриминг чата с опциональным MCP-циклом |
| `/api/mcp-tools` | POST | Список инструментов MCP-сервера |
| `/api/transcribe` | POST | Распознавание речи (Groq Whisper) |
| `/api/tts` | POST | Синтез речи (ElevenLabs) |

## Скрипты

```bash
npm run dev    # Dev-сервер с Turbopack
npm run build  # Продакшн-сборка
npm run start  # Запуск продакшн-сервера
npm run lint   # Линтинг
```
