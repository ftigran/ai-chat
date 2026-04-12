"use client";

interface ImprovementBannerProps {
  improving: boolean;
  suggestion: { agentName: string; prompt: string } | null;
  editedSuggestion: string;
  onEditChange: (value: string) => void;
  onApply: () => void;
  onDismiss: () => void;
}

export function ImprovementBanner({
  improving,
  suggestion,
  editedSuggestion,
  onEditChange,
  onApply,
  onDismiss,
}: ImprovementBannerProps) {
  if (improving) {
    return (
      <div className="border-t border-amber-800/40 bg-amber-900/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-amber-400 text-xs">
          <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Анализирую обратную связь и улучшаю промпт агента...
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="border-t border-amber-800/50 bg-amber-900/15 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-amber-400">
            Предложение по улучшению промпта агента «{suggestion.agentName}»
          </p>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <textarea
          value={editedSuggestion}
          onChange={(e) => onEditChange(e.target.value)}
          rows={4}
          className="w-full bg-gray-900 border border-amber-700/40 text-gray-200 text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onApply}
            disabled={!editedSuggestion.trim()}
            className="text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Применить
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
          >
            Отклонить
          </button>
        </div>
      </div>
    </div>
  );
}
