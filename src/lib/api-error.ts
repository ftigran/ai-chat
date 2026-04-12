export function classifyApiError(err: unknown): { message: string; status: number } {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes("429")) {
    return {
      message: "Превышен лимит запросов. Подождите немного и попробуйте снова.",
      status: 429,
    };
  }
  if (raw.includes("401") || raw.includes("403")) {
    return { message: "Ошибка авторизации. Проверьте API-ключ.", status: 401 };
  }
  if (raw.includes("404")) {
    return { message: "Модель не найдена. Возможно, она больше недоступна.", status: 404 };
  }

  return { message: `Ошибка: ${raw}`, status: 500 };
}
